// POST /api/teardown
//
// Public, unauthenticated endpoint that runs a slimmer version of the
// /api/onboarding/day-one analysis against any UAE/Saudi SMB website
// URL. Returns the 4 highest-impact artifacts (insight, FAQ gaps, social
// posts, sample WhatsApp reply) AND persists the result to
// public_teardowns so the same URL gets a permalink at /teardown/[slug].
//
// This is the viral wedge: any prospect can paste their URL and get a
// $5K-of-consulting analysis for free in ~30 seconds, then share the
// permalink. Rami's outbound DM strategy then becomes "type your URL
// into agents.dcp.sa/teardown — see exactly how my AI would think
// about your business" + a follow-up link to a prospect's persisted
// teardown.
//
// Idempotency: if the same URL was teared down in the last 24h, return
// the cached package instead of re-running the LLM tasks. Saves LLM cost
// and keeps the shareable URL stable.
//
// Rate-limited by IP (5 generations per IP per hour) to bound LLM spend.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
// 4 parallel inference calls + 1 crawl. Fits comfortably under 300s
// even on slow MiniMax days.
export const maxDuration = 240;

const PROMPT_BUILDER_URL =
  process.env.PROMPT_BUILDER_URL || "https://n8n.dcp.sa";

interface CrawlResult {
  businessDescription: string;
  services: string[];
  faq: { question: string; answer: string }[];
  businessHours: string;
  brandVoice: string;
  industryKeywords: string[];
  pagesScanned: string[];
}

interface FaqGap {
  question: string;
  draft_answer: string;
}

interface TeardownPackage {
  business_name: string;
  url: string;
  generated_at: string;
  pages_scanned: number;
  insight: string;
  sample_reply: string;
  social_posts: string[];
  faq_gaps: FaqGap[];
  brand_voice: string;
}

interface TeardownBody {
  url?: string;
  // Optional country hint. The model otherwise infers from URL TLD +
  // crawl content.
  country?: "AE" | "SA" | null;
  // Force regeneration even if a cached teardown exists for this URL.
  // Mostly for the "refresh" button on /teardown/[slug].
  refresh?: boolean;
}

// 24-hour cache window: same URL inside this window returns the existing
// teardown instead of regenerating. Saves LLM cost + keeps the permalink
// stable for sharing.
const CACHE_WINDOW_HOURS = 24;
// Per-IP rate limit: 5 fresh generations per hour. Reads of cached
// teardowns don't count.
const IP_RATE_LIMIT = 5;
const IP_WINDOW_HOURS = 1;

// 8-char alphanumeric slug. Avoids confusing chars (0/O, 1/l).
function generateSlug(seedName: string): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const prefix = (seedName.toLowerCase().replace(/[^a-z0-9]/g, "") || "site")
    .slice(0, 12);
  let rand = "";
  for (let i = 0; i < 6; i++) {
    rand += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}-${rand}`;
}

// ---- Crawl ----------------------------------------------------------------

async function callCrawl(url: string, _req: NextRequest): Promise<CrawlResult | null> {
  // Call the VPS-hosted prompt-builder's /web/crawl endpoint instead of
  // the Vercel-hosted /api/crawl. Vercel's serverless functions apparently
  // can't reliably reach random external sites (some egress restriction
  // we haven't fully diagnosed — fetch returns nothing for example.com
  // among others). The VPS has unrestricted egress and reaches every
  // tested URL fine.
  try {
    const res = await fetch(`${PROMPT_BUILDER_URL.replace(/\/$/, "")}/web/crawl`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.error) {
      console.error("[teardown] crawl error:", data.error, data.detail || "");
      return null;
    }
    return data as CrawlResult;
  } catch (e) {
    console.error("[teardown] crawl failed:", e);
    return null;
  }
}

// ---- Inference helpers ----------------------------------------------------

async function inferenceChat(
  role: string,
  prompt: string,
  opts: { maxTokens?: number; jsonMode?: boolean } = {},
): Promise<string> {
  try {
    const body: Record<string, unknown> = {
      role,
      messages: [{ role: "user", content: prompt }],
    };
    if (opts.maxTokens) body.max_tokens = opts.maxTokens;
    if (opts.jsonMode) body.json_mode = true;
    const res = await fetch(`${PROMPT_BUILDER_URL.replace(/\/$/, "")}/inference/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`[teardown] inference role=${role} HTTP ${res.status}`);
      return "";
    }
    const data = await res.json();
    return typeof data?.text === "string" ? data.text : "";
  } catch (e) {
    console.error(`[teardown] inference role=${role} failed:`, e);
    return "";
  }
}

function jsonSliceOrNull(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const objStart = cleaned.indexOf("{");
  const arrStart = cleaned.indexOf("[");
  let start = -1;
  let end = -1;
  if (objStart >= 0 && (arrStart < 0 || objStart < arrStart)) {
    start = objStart;
    end = cleaned.lastIndexOf("}");
  } else if (arrStart >= 0) {
    start = arrStart;
    end = cleaned.lastIndexOf("]");
  }
  if (start < 0 || end <= start) return null;
  const slice = cleaned.slice(start, end + 1);
  try {
    JSON.parse(slice);
    return slice;
  } catch {
    return null;
  }
}

async function inferenceJsonChat(
  role: string,
  prompt: string,
  opts: { maxTokens?: number } = {},
): Promise<string> {
  const callOpts = { ...opts, jsonMode: true };
  const first = await inferenceChat(role, prompt, callOpts);
  if (jsonSliceOrNull(first)) return first;
  const retryPrompt =
    `${prompt}\n\n---\n\nYour previous response could not be parsed as JSON. ` +
    `Output ONLY the JSON. No preamble, no prose, no markdown fence. ` +
    `Previous response was:\n${(first || "(empty)").slice(0, 800)}`;
  return inferenceChat(role, retryPrompt, callOpts);
}

// ---- Country inference ----------------------------------------------------

function inferCountry(url: string, hint: TeardownBody["country"]): "AE" | "SA" {
  if (hint === "AE" || hint === "SA") return hint;
  const lower = url.toLowerCase();
  if (lower.includes(".ae") || lower.includes("uae") || lower.includes("dubai")) return "AE";
  if (lower.includes(".sa") || lower.includes("ksa") || lower.includes("riyadh")) return "SA";
  // Default to UAE — larger SMB English-speaking market.
  return "AE";
}

// ---- Context builder ------------------------------------------------------

function buildContext(crawl: CrawlResult, businessName: string, country: "AE" | "SA"): string {
  const parts: string[] = [];
  parts.push(`Business: ${businessName}`);
  parts.push(`Country: ${country === "AE" ? "United Arab Emirates" : "Saudi Arabia"}`);
  if (crawl.businessDescription) parts.push(`Description: ${crawl.businessDescription}`);
  if (crawl.brandVoice) parts.push(`Brand voice: ${crawl.brandVoice}`);
  if (crawl.businessHours) parts.push(`Hours: ${crawl.businessHours}`);
  if (crawl.services?.length) parts.push(`Services: ${crawl.services.slice(0, 8).join(", ")}`);
  if (crawl.faq?.length) {
    parts.push(
      "Sample FAQ already on site:\n" +
        crawl.faq.slice(0, 3).map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n"),
    );
  }
  return parts.join("\n\n");
}

function deriveBusinessName(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname
      .replace(/^www\./, "")
      .split(".")[0]
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return "Your Business";
  }
}

// ---- Handler --------------------------------------------------------------

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as TeardownBody;
  const rawUrl = (body.url || "").trim();
  if (!rawUrl || rawUrl.length < 4) {
    return NextResponse.json({ error: "url_required" }, { status: 400 });
  }

  // Normalize URL once for everything downstream.
  let url = rawUrl;
  if (!url.startsWith("http")) url = `https://${url}`;
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const sql = db();

  // 1a. Cache check — return existing teardown if generated within the window.
  if (!body.refresh) {
    const cached = await sql<
      { slug: string; package: TeardownPackage; created_at: string }[]
    >`
      SELECT slug, package, created_at
      FROM public_teardowns
      WHERE url = ${url}
        AND created_at > NOW() - (${CACHE_WINDOW_HOURS} || ' hours')::interval
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (cached.length > 0) {
      return NextResponse.json({
        ok: true,
        cached: true,
        slug: cached[0].slug,
        package: cached[0].package,
      });
    }
  }

  // 1b. Rate limit fresh generations per IP.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    null;
  if (ip) {
    const recent = await sql<{ n: number }[]>`
      SELECT COUNT(*)::int AS n
      FROM public_teardowns
      WHERE source_ip = ${ip}::inet
        AND created_at > NOW() - (${IP_WINDOW_HOURS} || ' hours')::interval
    `;
    if (recent[0]?.n >= IP_RATE_LIMIT) {
      return NextResponse.json(
        {
          error: "rate_limited",
          detail: `Up to ${IP_RATE_LIMIT} teardowns per hour. Try again later or sign up for unlimited.`,
        },
        { status: 429 },
      );
    }
  }

  const country = inferCountry(url, body.country);
  const businessName = deriveBusinessName(url);

  // 1c. Crawl the site
  const crawl = await callCrawl(url, req);
  if (!crawl) {
    return NextResponse.json(
      { error: "crawl_failed", detail: "Could not fetch the site. Check the URL." },
      { status: 422 },
    );
  }
  const context = buildContext(crawl, businessName, country);

  const existingFaqStr =
    crawl.faq?.length
      ? crawl.faq.slice(0, 20).map((f) => f.question).join("\n- ")
      : "(no FAQ found on the website)";

  // 2. Four parallel inference tasks
  const [insight, postsRaw, replyRaw, faqGapsRaw] = await Promise.all([
    inferenceChat(
      "rami_research",
      `You are a UAE/Saudi SMB consultant looking at this business for the first time.

${context}

Pages scanned: ${crawl.pagesScanned?.length || 0}

Write ONE paragraph (4–6 sentences) — your sharp first impression of this business. What's distinctive? What's the strongest reason a customer chooses them over a competitor? What's the biggest risk in their positioning? Be specific, name real things from the site, no marketing fluff. Output the paragraph only — no preamble, no headings.`,
    ),
    inferenceChat(
      "content_draft",
      `You are a social-content writer for ${businessName}, a ${country === "AE" ? "UAE" : "Saudi"} SMB.

${context}

Draft THREE Instagram captions for this business. Each caption: 2–4 sentences, no hashtags, brand-voice consistent, written so a real customer would want to visit/book. Vary the angles — one about quality, one about atmosphere, one about a specific signature offering.

Output as three captions separated by exactly "---" on its own line. No numbering, no headings, no extra commentary.`,
      { maxTokens: 1200 },
    ),
    inferenceChat(
      "customer_response_en",
      `You are the AI WhatsApp concierge for ${businessName}.

${context}

A first-time customer just messaged: "Hi, I'd like to learn more — are you open this weekend and what makes you different?"

Reply on-brand, warm, confident, with one clear next step. 2–4 sentences. Output the reply only — no preamble.`,
    ),
    inferenceJsonChat(
      "rami_research",
      `You are auditing the customer-question coverage of a ${country === "AE" ? "UAE" : "Saudi"} SMB.

${context}

Existing FAQ topics covered on their website:
- ${existingFaqStr}

Identify FIVE realistic customer questions this business almost-certainly receives over WhatsApp that are NOT yet covered. Focus on the buying questions (booking, hours, parking, prices, allergies/halal, delivery, kids welcome, group bookings, payment methods, location/directions). For each gap, draft a short on-brand answer (1–3 sentences). If you can't infer one, write a question back to the owner like "(Owner: please confirm — do you accept Tabby?)".

Output STRICT JSON only:
[{"question":"...","draft_answer":"..."}, ...]

Exactly five objects. question max 120 chars, draft_answer max 280 chars.`,
      { maxTokens: 1800 },
    ),
  ]);

  // 3. Parse social posts (--- separator)
  const social_posts: string[] = postsRaw
    .split(/\n*---\n*/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20)
    .slice(0, 3);

  // 4. Parse FAQ gaps JSON
  let faq_gaps: FaqGap[] = [];
  const sliced = jsonSliceOrNull(faqGapsRaw);
  if (sliced) {
    try {
      const parsed = JSON.parse(sliced);
      if (Array.isArray(parsed)) {
        faq_gaps = parsed
          .filter(
            (g): g is FaqGap =>
              g &&
              typeof g.question === "string" &&
              typeof g.draft_answer === "string" &&
              g.question.trim().length > 5 &&
              g.draft_answer.trim().length > 5,
          )
          .slice(0, 5)
          .map((g) => ({
            question: g.question.trim().slice(0, 200),
            draft_answer: g.draft_answer.trim().slice(0, 400),
          }));
      }
    } catch {
      // Drop silently — card-side renders empty state.
    }
  }

  const pkg: TeardownPackage = {
    business_name: businessName,
    url,
    generated_at: new Date().toISOString(),
    pages_scanned: crawl.pagesScanned?.length || 0,
    insight: insight.trim(),
    sample_reply: replyRaw.trim(),
    social_posts,
    faq_gaps,
    brand_voice: crawl.brandVoice || "",
  };

  // Persist + slug. Retry slug collision up to 3 times (extremely
  // unlikely given the 6-char random suffix).
  let slug: string | null = null;
  for (let attempt = 0; attempt < 3 && !slug; attempt++) {
    const candidate = generateSlug(businessName);
    try {
      const inserted = await sql<{ slug: string }[]>`
        INSERT INTO public_teardowns
          (slug, url, business_name, country, package, source_ip)
        VALUES
          (${candidate}, ${url}, ${businessName}, ${country},
           ${sql.json(pkg as never)}, ${ip ? ip : null}::inet)
        RETURNING slug
      `;
      slug = inserted[0]?.slug ?? null;
    } catch (e) {
      // Unique violation → loop and try a new random suffix.
      console.warn("[teardown] slug insert retry:", e);
    }
  }
  if (!slug) {
    // Persistence failed but we still have a valid package — return it
    // without a permalink. The caller can re-submit to retry.
    return NextResponse.json({ ok: true, package: pkg, slug: null });
  }

  return NextResponse.json({ ok: true, cached: false, slug, package: pkg });
}

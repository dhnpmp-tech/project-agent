// POST /api/teardown
//
// Public, unauthenticated endpoint that runs a slimmer version of the
// /api/onboarding/day-one analysis against any UAE/Saudi SMB website
// URL. Returns the 4 highest-impact artifacts (insight, FAQ gaps, social
// posts, sample WhatsApp reply) inline so the caller can render them on
// the same page. No DB persistence in this version — pure stateless
// analysis. A persistent shareable /teardown/[slug] variant comes next.
//
// This is the viral wedge: any prospect can paste their URL and get a
// $5K-of-consulting analysis for free in ~30 seconds. Rami's outbound DM
// strategy then becomes "type your URL into agents.dcp.sa/teardown —
// see exactly how my AI would think about your business."
//
// Rate-limited by IP to keep the LLM bill bounded. Single-shot, no
// queueing — the request completes within Vercel's function budget.

import { NextRequest, NextResponse } from "next/server";

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
}

// ---- Crawl ----------------------------------------------------------------

async function callCrawl(url: string, req: NextRequest): Promise<CrawlResult | null> {
  // Reuse the existing /api/crawl endpoint via internal fetch.
  // Same-origin so cookies/headers aren't needed; it's a public endpoint.
  try {
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("host") || "agents.dcp.sa";
    const base = `${proto}://${host}`;
    // basePath /app applies on Vercel — both teardown and crawl live under it.
    const baseWithApp = `${base}${host.endsWith("agents.dcp.sa") ? "/app" : ""}`;
    const res = await fetch(`${baseWithApp}/api/crawl`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) return null;
    return (await res.json()) as CrawlResult;
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

  const country = inferCountry(url, body.country);
  const businessName = deriveBusinessName(url);

  // 1. Crawl the site
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

  return NextResponse.json({ ok: true, package: pkg });
}

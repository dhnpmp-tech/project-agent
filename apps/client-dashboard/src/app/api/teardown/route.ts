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
  // The actual crawled markdown/text (added when crawl is via Firecrawl
  // or when /web/crawl exposes it). Used to ground the LLM tasks so they
  // can cite evidence rather than hallucinate generic gaps. Optional —
  // the route degrades gracefully when missing.
  pagesText?: string;
  contactInfo?: { phone?: string; email?: string; address?: string };
  socialProfiles?: Record<string, string>;
  reviewSources?: { platform: string; url: string }[];
  testimonials?: { quote: string; author?: string }[];
}

interface FaqGap {
  question: string;
  draft_answer: string;
  evidence: string;  // why this is a gap — quote of what IS on site, or "no coverage found"
}

interface SeoFinding {
  area: string;     // "Title tag", "Meta description", "Schema markup", "Mobile viewport"
  status: "good" | "weak" | "missing";
  detail: string;   // 1-line specific observation
  action: string;   // 1-line concrete fix
}

interface DirectoryGap {
  platform: string;        // "Zomato", "TheFork UAE", "Talabat", "TripAdvisor"
  why_it_matters: string;  // 1 sentence on why this platform matters for this business type
  signup_url: string;      // direct signup/claim URL
}

interface QuickWin {
  category: "marketing" | "seo" | "ads" | "ops" | "social";
  action: string;           // imperative: "Add a WhatsApp Click-to-Chat link to your hero"
  rationale: string;        // 1 sentence — what specifically you observed on the site that triggers this
  estimated_impact: string; // honest range: "+30% inbound DMs in 30 days" or "small win, ~2-3 bookings/mo"
}

interface BrandVoiceMirror {
  owner_voice: string;       // a paragraph as the founder would write
  customer_review: string;   // a 3-line review in a real customer's voice
  whatsapp_greeting: string; // first message the agent would send
}

interface TeardownPackage {
  business_name: string;
  url: string;
  generated_at: string;
  pages_scanned: number;
  brand_voice: string;
  // The original 4 artifacts
  insight: string;
  sample_reply: string;
  social_posts: string[];
  faq_gaps: FaqGap[];
  // 4 new richer sections (grounded in actual crawl content)
  seo_findings: SeoFinding[];
  directory_gaps: DirectoryGap[];
  quick_wins: QuickWin[];
  brand_mirror: BrandVoiceMirror | null;
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
  if (crawl.contactInfo?.phone) parts.push(`Phone: ${crawl.contactInfo.phone}`);
  if (crawl.contactInfo?.address) parts.push(`Address: ${crawl.contactInfo.address}`);
  if (crawl.socialProfiles && Object.keys(crawl.socialProfiles).length) {
    parts.push("Social profiles found: " + Object.keys(crawl.socialProfiles).join(", "));
  }
  if (crawl.faq?.length) {
    parts.push(
      "FAQ topics already on the site:\n- " + crawl.faq.slice(0, 12).map((f) => f.question).join("\n- "),
    );
  } else {
    parts.push("FAQ topics already on the site: (no FAQ section found on the crawled pages)");
  }
  if (crawl.testimonials?.length) {
    parts.push(
      "Customer testimonials embedded on the site:\n" +
        crawl.testimonials.slice(0, 6).map((t) => `- "${t.quote.slice(0, 200)}"${t.author ? ` — ${t.author}` : ""}`).join("\n"),
    );
  }
  return parts.join("\n\n");
}

function buildFullCorpus(crawl: CrawlResult): string {
  // If the crawl exposed the raw page text, surface a generous slice so
  // downstream LLM tasks can quote real content as evidence. Caps at
  // ~12k chars to keep prompt budgets sane on MiniMax.
  if (crawl.pagesText && crawl.pagesText.length > 100) {
    return crawl.pagesText.slice(0, 12000);
  }
  // Fallback: synthesize from structured fields. Less rich but still
  // grounded in real data.
  const parts: string[] = [];
  if (crawl.businessDescription) parts.push(crawl.businessDescription);
  if (crawl.services?.length) parts.push("Services: " + crawl.services.join(", "));
  if (crawl.faq?.length) {
    parts.push(
      crawl.faq.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n"),
    );
  }
  return parts.join("\n\n").slice(0, 12000);
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
  const corpus = buildFullCorpus(crawl);

  // The grounding block — every task gets the real page text + structured
  // metadata, with explicit instructions to cite evidence and not invent.
  const groundingBlock = `BUSINESS CONTEXT
================
${context}

ACTUAL SITE CONTENT (verbatim crawl)
====================================
${corpus}

GROUNDING RULES — apply to ALL output below:
- Quote or paraphrase ONLY what's in the site content above.
- If you can't find evidence for a claim, say "(not verified on site)".
- Never invent prices, hours, certifications, awards, or testimonials.
- This is for a ${country === "AE" ? "UAE" : "Saudi Arabia"} market.`;

  // 8 parallel inference tasks — 4 original + 4 new richer sections
  const [
    insight,
    postsRaw,
    replyRaw,
    faqGapsRaw,
    seoFindingsRaw,
    directoryGapsRaw,
    quickWinsRaw,
    brandMirrorRaw,
  ] = await Promise.all([
    // --- Original 4 (grounded prompts) ---
    inferenceChat(
      "rami_research",
      `${groundingBlock}

TASK: Write ONE paragraph (4-6 sentences) — your sharp first impression of this business.

Cover, with evidence from the site content:
- What's distinctive about them (cite a specific dish, service, location detail, or claim from the content above)
- The strongest reason a customer chooses them over a competitor
- The biggest risk in their positioning (be honest)

No marketing fluff. No "discover" / "experience" / "unparalleled". Output the paragraph only.`,
      { maxTokens: 800 },
    ),
    inferenceChat(
      "content_draft",
      `${groundingBlock}

TASK: Draft THREE Instagram captions for this business — each 2-4 sentences, no hashtags.

Each caption MUST reference something specific from the actual site content above (a real dish, a real location, a real claim from their copy). Vary the angles: one about a specific signature offering, one about atmosphere, one about quality/service.

Output as three captions separated by exactly "---" on its own line. No numbering, no headings, no preamble.`,
      { maxTokens: 1200 },
    ),
    inferenceChat(
      "customer_response_en",
      `${groundingBlock}

A first-time customer just messaged on WhatsApp: "Hi, I'd like to learn more — are you open this weekend and what makes you different?"

TASK: Reply on-brand, 2-4 sentences. Reference specific things from the site (a signature dish, a location, a real differentiator from the content above). End with one clear next step. Output the reply only.`,
      { maxTokens: 400 },
    ),
    inferenceJsonChat(
      "rami_research",
      `${groundingBlock}

TASK: Audit customer-question coverage. Identify FIVE questions a real customer would ask via WhatsApp that the site DOES NOT clearly answer.

For each gap, do all three:
1. State the QUESTION as a real customer would type it (not corporate phrasing)
2. Draft an on-brand ANSWER (1-3 sentences) — grounded in the site content where possible. If you can't infer, say "(Owner: please confirm — ...)"
3. Cite EVIDENCE: quote the closest thing on the site and say what's missing, OR write "no coverage found in crawled pages"

Output STRICT JSON only:
[{"question":"...","draft_answer":"...","evidence":"..."}, ...]

Exactly five objects. question max 120 chars, draft_answer max 280 chars, evidence max 240 chars.

Focus on real buying questions (booking, hours per day-of-week, parking, prices/value, halal certification, allergens, kids welcome, group bookings, payment methods including Tabby/Tamara, delivery zones, dress code, alcohol policy, location detail). Skip generic questions every site answers.`,
      { maxTokens: 2000 },
    ),

    // --- NEW: SEO + technical audit ---
    inferenceJsonChat(
      "rami_research",
      `${groundingBlock}

TASK: Audit the site's technical + SEO setup based ONLY on what you can see in the crawled content.

Identify 5-7 specific findings across these areas (skip areas you can't assess from crawled content):
- Title tag (presence, length, keyword fit)
- Meta description (presence, length, sells the value)
- H1 / heading structure (one H1, descriptive)
- Schema.org markup (Restaurant, LocalBusiness, FAQPage, Review schema)
- Image alt text (sampled — present?)
- Internal link clarity (CTA placement, booking link, WhatsApp link)
- Mobile-friendly meta viewport
- Page-level keyword targeting for their category

For each finding:
- "area" (max 40 chars)
- "status" — exactly one of "good", "weak", "missing"
- "detail" — 1-line specific observation citing actual content (max 180 chars)
- "action" — 1-line concrete fix the owner can apply this week (max 200 chars)

Output STRICT JSON only:
[{"area":"...","status":"good|weak|missing","detail":"...","action":"..."}, ...]`,
      { maxTokens: 2000 },
    ),

    // --- NEW: Directory & listing gaps ---
    inferenceJsonChat(
      "rami_research",
      `${groundingBlock}

TASK: Identify directory + platform listings this business is likely NOT on but should be, for the ${country === "AE" ? "UAE" : "Saudi"} market. Use your knowledge of the local landscape:

${country === "AE"
  ? "UAE relevant directories per category — Restaurants: Zomato UAE, TheFork UAE, TripAdvisor, Talabat, Deliveroo, Carriage, Google Business Profile, Time Out Dubai. Beauty: Fresha, Booksy, Gulf News service. Real estate: Bayut, Dubizzle, Property Finder. Health/clinic: Aetna, Daman provider lists, Vezeeta, Wellness."
  : "Saudi relevant directories per category — Restaurants: Hungerstation, Jahez, Mrsool, ToYou, Talabat, Google Business Profile, FoodAndBeverage. Beauty: Fresha, Treatwell, Glamera. Real estate: Aqar, Bayut SA, Wakane. Health/clinic: Vezeeta, Cura, Altibbi, Nala."}

Surface only platforms NOT clearly referenced in the site content above. Skip platforms they obviously already use.

Output 4-6 entries STRICT JSON only:
[{"platform":"...","why_it_matters":"...","signup_url":"..."}, ...]

- "platform" max 50 chars — proper brand name
- "why_it_matters" — 1 sentence on the specific revenue/discovery lift for THIS business type (max 200 chars)
- "signup_url" — the real claim/signup URL for that platform`,
      { maxTokens: 1800 },
    ),

    // --- NEW: Quick-wins playbook ---
    inferenceJsonChat(
      "rami_research",
      `${groundingBlock}

TASK: Surface 5 specific quick-wins this business can ship THIS WEEK. Be aggressive, specific, and grounded in what you saw on the site. No generic marketing advice.

Each win MUST:
- Reference what you observed (or didn't) on the site as the rationale
- Be a single action the owner can complete in <2 hours
- Give an honest impact estimate (not hype)

Categories — pick the highest-leverage 5 across:
- "marketing" (offers, campaigns, on-site content)
- "seo" (specific schema, internal links, page title rewrites)
- "ads" (Google/Meta/Tabby ads with a hook from this business)
- "ops" (booking flow, WhatsApp Click-to-Chat, response time)
- "social" (Reels angles, posting cadence, UGC mining from their site testimonials)

Output STRICT JSON only:
[{"category":"...","action":"...","rationale":"...","estimated_impact":"..."}, ...]

Exactly 5 objects. category from the allowed set. action max 160 chars (imperative). rationale max 200 chars. estimated_impact max 120 chars.`,
      { maxTokens: 2000 },
    ),

    // --- NEW: Brand voice mirror ---
    inferenceJsonChat(
      "rami_research",
      `${groundingBlock}

TASK: Show the owner what their brand voice sounds like in three different contexts. ALL three must read as if grounded in the actual site content above — reference real dishes, locations, claims.

Output STRICT JSON only:
{
  "owner_voice": "...",
  "customer_review": "...",
  "whatsapp_greeting": "..."
}

- "owner_voice" — 4-6 sentences as the founder would write a personal LinkedIn or X post about the business. Confident, specific, slightly imperfect (not corporate). Max 600 chars.
- "customer_review" — a 3-4 sentence first-person review as a real customer would write after a visit, citing specific things. Max 400 chars.
- "whatsapp_greeting" — the very first WhatsApp message the AI agent would send to a new customer who DMs hello. Warm, on-brand, soft-CTA. Max 240 chars.`,
      { maxTokens: 1500 },
    ),
  ]);

  // 3. Parse social posts (--- separator)
  const social_posts: string[] = postsRaw
    .split(/\n*---\n*/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20)
    .slice(0, 3);

  // 4. Parse FAQ gaps JSON (now with evidence field)
  let faq_gaps: FaqGap[] = [];
  const faqSliced = jsonSliceOrNull(faqGapsRaw);
  if (faqSliced) {
    try {
      const parsed = JSON.parse(faqSliced);
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
            evidence: typeof g.evidence === "string" ? g.evidence.trim().slice(0, 280) : "",
          }));
      }
    } catch {
      // Drop silently — card-side renders empty state.
    }
  }

  // 5. Parse SEO findings JSON
  let seo_findings: SeoFinding[] = [];
  const seoSliced = jsonSliceOrNull(seoFindingsRaw);
  if (seoSliced) {
    try {
      const parsed = JSON.parse(seoSliced);
      if (Array.isArray(parsed)) {
        seo_findings = parsed
          .filter(
            (f): f is SeoFinding =>
              f &&
              typeof f.area === "string" &&
              typeof f.detail === "string" &&
              typeof f.action === "string" &&
              (f.status === "good" || f.status === "weak" || f.status === "missing"),
          )
          .slice(0, 8)
          .map((f) => ({
            area: f.area.trim().slice(0, 60),
            status: f.status,
            detail: f.detail.trim().slice(0, 240),
            action: f.action.trim().slice(0, 260),
          }));
      }
    } catch {
      // empty
    }
  }

  // 6. Parse directory gaps JSON
  let directory_gaps: DirectoryGap[] = [];
  const dirSliced = jsonSliceOrNull(directoryGapsRaw);
  if (dirSliced) {
    try {
      const parsed = JSON.parse(dirSliced);
      if (Array.isArray(parsed)) {
        directory_gaps = parsed
          .filter(
            (d): d is DirectoryGap =>
              d &&
              typeof d.platform === "string" &&
              typeof d.why_it_matters === "string" &&
              typeof d.signup_url === "string" &&
              d.platform.trim().length > 0,
          )
          .slice(0, 8)
          .map((d) => ({
            platform: d.platform.trim().slice(0, 80),
            why_it_matters: d.why_it_matters.trim().slice(0, 260),
            signup_url: d.signup_url.trim().slice(0, 240),
          }));
      }
    } catch {
      // empty
    }
  }

  // 7. Parse quick-wins JSON
  let quick_wins: QuickWin[] = [];
  const winsSliced = jsonSliceOrNull(quickWinsRaw);
  if (winsSliced) {
    try {
      const parsed = JSON.parse(winsSliced);
      if (Array.isArray(parsed)) {
        const allowedCats: QuickWin["category"][] = ["marketing", "seo", "ads", "ops", "social"];
        quick_wins = parsed
          .filter(
            (w): w is QuickWin =>
              w &&
              typeof w.action === "string" &&
              typeof w.rationale === "string" &&
              typeof w.estimated_impact === "string" &&
              typeof w.category === "string" &&
              (allowedCats as string[]).includes(w.category),
          )
          .slice(0, 7)
          .map((w) => ({
            category: w.category,
            action: w.action.trim().slice(0, 200),
            rationale: w.rationale.trim().slice(0, 240),
            estimated_impact: w.estimated_impact.trim().slice(0, 160),
          }));
      }
    } catch {
      // empty
    }
  }

  // 8. Parse brand mirror JSON
  let brand_mirror: BrandVoiceMirror | null = null;
  const mirrorSliced = jsonSliceOrNull(brandMirrorRaw);
  if (mirrorSliced) {
    try {
      const parsed = JSON.parse(mirrorSliced);
      if (
        parsed &&
        typeof parsed.owner_voice === "string" &&
        typeof parsed.customer_review === "string" &&
        typeof parsed.whatsapp_greeting === "string"
      ) {
        brand_mirror = {
          owner_voice: parsed.owner_voice.trim().slice(0, 800),
          customer_review: parsed.customer_review.trim().slice(0, 500),
          whatsapp_greeting: parsed.whatsapp_greeting.trim().slice(0, 320),
        };
      }
    } catch {
      // null
    }
  }

  const pkg: TeardownPackage = {
    business_name: businessName,
    url,
    generated_at: new Date().toISOString(),
    pages_scanned: crawl.pagesScanned?.length || 0,
    brand_voice: crawl.brandVoice || "",
    insight: insight.trim(),
    sample_reply: replyRaw.trim(),
    social_posts,
    faq_gaps,
    seo_findings,
    directory_gaps,
    quick_wins,
    brand_mirror,
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

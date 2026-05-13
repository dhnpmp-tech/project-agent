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
  screenshotUrl?: string | null;
  schemaTypes?: string[];
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

interface DirectoryEntry {
  platform: string;
  why: string;             // why this platform matters
  signup_url: string;      // claim/signup URL
  evidence_url?: string;   // present on confirmed entries
  ai_take: string;         // what this fact MEANS for the owner
  recommendation: string;  // what to do THIS WEEK
  automation: string;      // what the AI agent will automate
}

interface DirectoryStrategy {
  confirmed: DirectoryEntry[];
  missing: DirectoryEntry[];
  checked: number;
  enriched: boolean;
}

interface ReviewSentiment {
  five: number;
  four: number;
  three: number;
  two: number;
  one: number;
  total: number;
}

interface ReviewComplaint {
  theme: string;
  count: number;
  sample_quote: string;
  draft_response: string;
}

interface ReviewMining {
  sentiment: ReviewSentiment;
  avg_rating: number | null;
  top_praise: string[];
  top_complaints: ReviewComplaint[];
  summary: string;
  sources: { platform: string; url: string; reviews_found: number }[];
}

interface Badge {
  emoji: string;
  label: string;
  detail: string;          // 1-line explanation of why this badge is awarded
}

interface ScoreBreakdown {
  discovery: number;    // 0-100, platform presence + GBP
  content: number;      // 0-100, SEO + FAQ coverage + brand voice clarity
  reviews: number;      // 0-100, avg rating + volume + sentiment balance
  conversion: number;   // 0-100, booking flow + CTAs + WhatsApp readiness
  presence: number;     // 0-100, social profiles + testimonials + photo signals
}

interface SchemaAudit {
  present: string[];                // @type values found on the home page
  missing_critical: string[];       // category-relevant types NOT found
  ai_take: string;
  recommendation: string;
  automation: string;
}

interface AgentScore {
  overall: number;        // 0-100 weighted
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  breakdown: ScoreBreakdown;
  percentile_blurb: string;  // "you beat 73% of similar businesses" — encouraging or honest
}

interface GbpOutlet {
  place_id: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  maps_url: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  price_level: number | null;
  hours: string[];
  photos_count: number;
  business_status: string | null;
  lat: number | null;
  lng: number | null;
}

interface GbpAggregate {
  outlet_count: number;
  total_reviews: number;
  weighted_avg_rating: number | null;
  total_photos: number;
}

interface GbpData extends GbpOutlet {
  // Backward-compat: top-level fields mirror the primary (most-reviewed)
  // outlet. New callers should prefer `outlets` + `aggregate`.
  outlets?: GbpOutlet[];
  aggregate?: GbpAggregate;
}

interface Competitor {
  name: string;
  place_id: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  price_level: number | null;
  open_now: boolean | null;
  address: string | null;
  // AI-generated 1-line on how this competitor compares — added by LLM
  // enrichment pass after the Places nearby search returns.
  ai_take?: string;
}

interface CompetitorRadar {
  competitors: Competitor[];
  // Overall positioning take across the cohort
  positioning_summary: string;
  // What the agent will automate ongoing
  automation: string;
}

interface InstagramSignal {
  handle: string | null;
  followers: number | null;
  post_count: number | null;
  is_verified: boolean | null;
  bio: string;
  days_since_last_post: number | null;
  profile_url: string | null;
}

interface TikTokPost {
  views: number;
  likes: number;
  author: string | null;
  desc: string;
  url: string;
}

interface TikTokSignal {
  post_count: number;
  total_views: number;
  top_posts: TikTokPost[];
}

interface RedditMention {
  title: string;
  subreddit: string | null;
  score: number | null;
  num_comments: number | null;
  url: string;
}

interface RedditSignal {
  mention_count: number;
  top_mentions: RedditMention[];
}

interface SocialPulse {
  instagram: InstagramSignal | null;
  tiktok: TikTokSignal | null;
  reddit: RedditSignal | null;
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
  // Richer sections — grounded in actual crawl content
  seo_findings: SeoFinding[];
  // OLD: LLM-only list (kept on the type for backward compat — older
  // permalinks may still have this). Newer generations use directory_strategy.
  directory_gaps?: DirectoryGap[];
  // NEW: Firecrawl-verified + LLM-enriched. Confirmed = "you're on these,
  // here's what to fix"; Missing = "you're not on these, here's the play".
  // Each entry carries: data (evidence_url/signup_url) + ai_take +
  // recommendation (do this week) + automation (what the agent does for you).
  directory_strategy?: DirectoryStrategy;
  quick_wins: QuickWin[];
  brand_mirror: BrandVoiceMirror | null;

  // NEW visual + measured fields
  screenshot_url?: string | null;
  reviews?: ReviewMining | null;
  agent_score?: AgentScore | null;
  badges?: Badge[];
  // Authoritative GBP data via Google Places API. Null when key isn't
  // configured — directory_strategy still surfaces the same fact via
  // Firecrawl fallback.
  gbp?: GbpData | null;
  // Nearby competitor radar via Places Nearby Search. Null when GBP
  // lookup failed (we need lat/lng to query nearby).
  competitor_radar?: CompetitorRadar | null;
  // Social pulse via ScrapeCreators — IG profile freshness, TikTok UGC
  // discovery, Reddit mention count. Null when no SCRAPECREATORS_API_KEY.
  social_pulse?: SocialPulse | null;
  // Real Schema.org JSON-LD audit — parsed from the rendered HTML, not
  // LLM-inferred. Fact-states what entities the site declares + which
  // category-critical ones are missing.
  schema_audit?: SchemaAudit | null;
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

// Best-effort category inference from crawl content. Keyword-bag check
// over the business description + services. We route to "default" when
// nothing matches — verify-listings still returns Google Business Profile
// for the default category.
function inferCategory(crawl: CrawlResult): "restaurant" | "beauty" | "default" {
  const blob = [
    crawl.businessDescription || "",
    (crawl.services || []).join(" "),
    (crawl.industryKeywords || []).join(" "),
    crawl.brandVoice || "",
  ].join(" ").toLowerCase();
  const restaurantHits = [
    "restaurant", "menu", "dining", "cuisine", "chef", "kitchen",
    "cafe", "coffee", "bistro", "eatery", "dishes", "food", "tea house",
    "bakery", "patisserie", "halal", "delivery", "reservation",
  ].filter((kw) => blob.includes(kw)).length;
  const beautyHits = [
    "salon", "spa", "beauty", "hair", "nail", "facial", "massage",
    "barber", "wellness", "esthetic", "aesthetic", "makeup", "lashes",
    "skincare", "treatment", "manicure", "pedicure",
  ].filter((kw) => blob.includes(kw)).length;
  if (restaurantHits >= 2 && restaurantHits >= beautyHits) return "restaurant";
  if (beautyHits >= 2) return "beauty";
  return "default";
}

// Google Places lookup. Returns null when no key is set or the place
// can't be matched — the teardown still renders, just without the
// authoritative GBP section + competitor radar.
// Category-relevant Schema.org types per business type. The agent later
// surfaces these as "you have X, you're missing Y" — purely measured,
// no LLM hallucination. We don't need every Schema.org type, just the
// ones that materially affect SERP rich results for SMBs.
const CRITICAL_SCHEMA: Record<"restaurant" | "beauty" | "default", string[]> = {
  restaurant: ["Restaurant", "LocalBusiness", "Menu", "MenuItem", "FAQPage", "Review", "AggregateRating", "OpeningHoursSpecification"],
  beauty: ["LocalBusiness", "HealthAndBeautyBusiness", "Service", "FAQPage", "Review", "AggregateRating", "OpeningHoursSpecification"],
  default: ["LocalBusiness", "Organization", "Service", "FAQPage", "Review", "AggregateRating"],
};

function buildSchemaAudit(
  schemaTypes: string[],
  category: "restaurant" | "beauty" | "default",
  businessName: string,
): SchemaAudit {
  const present = schemaTypes.slice(0, 12);
  const want = CRITICAL_SCHEMA[category];
  const presentSet = new Set(present.map((t) => t.toLowerCase()));
  const missing_critical = want.filter((t) => !presentSet.has(t.toLowerCase()));

  // Pre-formed AI take + recommendation + automation. Deterministic
  // based on what's measured. No LLM call — keeps this fast + cheap.
  const presentCount = present.length;
  const missingCount = missing_critical.length;
  let ai_take = "";
  let recommendation = "";
  let automation = "";

  if (presentCount === 0) {
    ai_take = `${businessName} has zero Schema.org markup on the home page. Google can't surface rich results for you — your search snippet is plain text while competitors get stars, prices, and FAQ snippets.`;
    recommendation = `This week: add a single ${category === "restaurant" ? "Restaurant" : "LocalBusiness"} schema block to your home page <head>. Free, takes 20 minutes, instant SERP improvement.`;
    automation = `Your agent will: emit + maintain the full ${want.join(", ")} schema graph nightly, keep it in sync with menu/hours/reviews.`;
  } else if (missingCount === 0) {
    ai_take = `Schema.org is fully covered (${present.join(", ")}). You're set up for every relevant rich snippet — most ${category}s in the UAE/KSA don't have this.`;
    recommendation = `Run a Google Rich Results Test on your home page to confirm Google sees all entities cleanly.`;
    automation = `Your agent will: keep schema fresh as menu/hours/reviews change, monitor Search Console for schema warnings.`;
  } else {
    const top3Missing = missing_critical.slice(0, 3).join(", ");
    ai_take = `You have ${presentCount} schema entit${presentCount === 1 ? "y" : "ies"} (${present.slice(0, 3).join(", ")}${presentCount > 3 ? "…" : ""}) but you're missing ${missingCount} that drive ${category} rich results: ${top3Missing}.`;
    recommendation = `This week: add ${top3Missing} schema to your home page. Each missing block costs you a SERP feature your competitors with the same markup are winning.`;
    automation = `Your agent will: write the missing ${top3Missing} schema blocks for you (grounded in your current menu/hours/reviews), test against Google Rich Results, monitor for breakage.`;
  }

  return { present, missing_critical, ai_take, recommendation, automation };
}

async function fetchSocialPulse(
  businessName: string,
  socialProfiles: Record<string, string> | undefined,
  country: "AE" | "SA",
  category: "restaurant" | "beauty" | "default",
): Promise<SocialPulse | null> {
  // TikTok queries return name-collision noise (e.g. a fragrance brand
  // named "Arabian Tea House" floods results for the Dubai restaurant).
  // Pass category + market keywords so prompt-builder filters results.
  const filterKeywords: string[] = [
    country === "AE" ? "dubai" : "riyadh",
    country === "AE" ? "uae" : "saudi",
    category === "restaurant" ? "restaurant" : category === "beauty" ? "salon" : "",
    category === "restaurant" ? "food" : "",
  ].filter(Boolean);

  try {
    const res = await fetch(`${PROMPT_BUILDER_URL.replace(/\/$/, "")}/web/social-pulse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_name: businessName,
        social_profiles: socialProfiles || {},
        tiktok_filter_keywords: filterKeywords,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.error) return null;
    return data as SocialPulse;
  } catch (e) {
    console.error("[teardown] social-pulse failed:", e);
    return null;
  }
}

async function fetchGbp(
  businessName: string,
  country: "AE" | "SA",
  locationHint: string,
): Promise<GbpData | null> {
  try {
    const res = await fetch(`${PROMPT_BUILDER_URL.replace(/\/$/, "")}/web/places-lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_name: businessName,
        location_hint: locationHint,
        country,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.error) return null;
    return data as GbpData;
  } catch (e) {
    console.error("[teardown] places-lookup failed:", e);
    return null;
  }
}

async function fetchCompetitors(
  gbp: GbpData,
  category: "restaurant" | "beauty" | "default",
  corpus: string,
  businessName: string,
  country: "AE" | "SA",
): Promise<CompetitorRadar | null> {
  if (!gbp.lat || !gbp.lng) return null;

  const placeType = category === "restaurant" ? "restaurant"
    : category === "beauty" ? "beauty_salon"
    : undefined;

  try {
    const res = await fetch(`${PROMPT_BUILDER_URL.replace(/\/$/, "")}/web/places-nearby`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place_id: gbp.place_id,
        lat: gbp.lat,
        lng: gbp.lng,
        radius_meters: 800,
        type: placeType,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.error || !Array.isArray(data?.results)) return null;
    const raw: Competitor[] = data.results.slice(0, 6);
    if (raw.length === 0) return null;

    // One LLM enrichment pass — gives each competitor a 1-line "how
    // they compare to you" + an overall positioning summary +
    // automation hook.
    const list = raw
      .map((c, i) => `${i + 1}. ${c.name} — rating ${c.rating ?? "?"} (${c.user_ratings_total ?? 0} reviews)${c.price_level != null ? ` · price ${c.price_level}` : ""}${c.address ? ` · ${c.address}` : ""}`)
      .join("\n");

    const prompt = `You are advising ${businessName} (a ${country === "AE" ? "UAE" : "Saudi"} ${category}) on how they stack up against nearby competitors.

YOUR BUSINESS (from website):
${corpus.slice(0, 4000)}

YOUR PUBLIC METRICS:
- Rating: ${gbp.rating ?? "?"} / 5
- Reviews: ${gbp.user_ratings_total ?? 0}
- Price level: ${gbp.price_level ?? "?"}
- Address: ${gbp.address ?? "?"}

NEARBY COMPETITORS (within 800m):
${list}

TASK: For each competitor, write ONE sentence (max 180 chars) — what specifically they have / do that the owner should care about, contrasted with your business. Be concrete: name the angle (price, hours, cuisine focus, review volume edge, etc).

Then write:
- "positioning_summary" — 1 paragraph (max 320 chars). Where do you WIN against this cohort? Where do they WIN against you? Be honest.
- "automation" — 1 sentence (max 180 chars). What your AI agent will monitor + automate ongoing for competitor intel.

Output STRICT JSON only:
{
  "competitors": [
    {"name": "...", "ai_take": "..."},
    ...
  ],
  "positioning_summary": "...",
  "automation": "..."
}

Match competitor names EXACTLY as given above. Include every competitor — don't drop any.`;

    const raw_text = await inferenceJsonChat("rami_research", prompt, { maxTokens: 2200 });
    const sliced = jsonSliceOrNull(raw_text);
    if (!sliced) {
      return {
        competitors: raw,
        positioning_summary: "(AI take pending — verify Places data is fresh)",
        automation: "",
      };
    }
    try {
      const parsed = JSON.parse(sliced);
      const byName = new Map<string, { ai_take: string }>();
      for (const c of parsed.competitors || []) {
        if (typeof c?.name === "string" && typeof c?.ai_take === "string") {
          byName.set(c.name.trim().toLowerCase(), { ai_take: c.ai_take.trim().slice(0, 220) });
        }
      }
      return {
        competitors: raw.map((c) => ({
          ...c,
          ai_take: byName.get(c.name.trim().toLowerCase())?.ai_take,
        })),
        positioning_summary: String(parsed.positioning_summary || "").slice(0, 400),
        automation: String(parsed.automation || "").slice(0, 220),
      };
    } catch {
      return {
        competitors: raw,
        positioning_summary: "(AI take parse failed)",
        automation: "",
      };
    }
  } catch (e) {
    console.error("[teardown] places-nearby failed:", e);
    return null;
  }
}

async function fetchReviews(
  businessName: string,
  confirmedListings: DirectoryEntry[],
): Promise<ReviewMining | null> {
  // Filter to platforms that actually host reviews. Skip transactional /
  // partner platforms where the LISTING URL won't surface review content.
  const reviewHosts = new Set([
    "TripAdvisor", "Zomato UAE", "Time Out Dubai", "OpenTable",
    "Visit Dubai", "Talabat", "Deliveroo UAE", "Careem",
  ]);
  const candidates = confirmedListings
    .filter((c) => reviewHosts.has(c.platform) && c.evidence_url)
    .slice(0, 5)
    .map((c) => ({ platform: c.platform, url: c.evidence_url! }));

  if (candidates.length === 0) return null;

  try {
    const res = await fetch(`${PROMPT_BUILDER_URL.replace(/\/$/, "")}/web/mine-reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_name: businessName,
        platform_urls: candidates,
      }),
    });
    if (!res.ok) {
      console.error(`[teardown] mine-reviews HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (data?.error && (data?.sentiment?.total ?? 0) === 0) {
      return null;
    }
    return data as ReviewMining;
  } catch (e) {
    console.error("[teardown] mine-reviews failed:", e);
    return null;
  }
}

function computeAgentScore(
  crawl: CrawlResult,
  directory: DirectoryStrategy | null,
  reviews: ReviewMining | null,
  seoFindings: SeoFinding[],
  faqGaps: FaqGap[],
  gbp: GbpData | null = null,
): AgentScore {
  // DISCOVERY: directory presence ratio + GBP signal
  let discovery = 30; // baseline
  if (directory && directory.checked > 0) {
    const ratio = directory.confirmed.length / directory.checked;
    discovery = Math.round(30 + ratio * 60);
    if (directory.confirmed.some((c) => /google/i.test(c.platform))) {
      discovery = Math.min(100, discovery + 10);
    }
  }

  // CONTENT: SEO health + FAQ depth + brand voice signal
  const seoGood = seoFindings.filter((f) => f.status === "good").length;
  const seoMissing = seoFindings.filter((f) => f.status === "missing").length;
  const seoScore = seoFindings.length > 0
    ? Math.round(((seoGood * 100 + (seoFindings.length - seoMissing - seoGood) * 60) / seoFindings.length))
    : 50;
  const faqFloor = (crawl.faq?.length ?? 0) >= 5 ? 80 : (crawl.faq?.length ?? 0) >= 2 ? 60 : 30;
  const content = Math.round((seoScore * 0.6) + (faqFloor * 0.4));

  // REVIEWS: prefer the GBP AGGREGATE (every outlet's reviews summed)
  // over the mined sample (which only saw a few reviews per scraped
  // platform page). For Arabian Tea House: GBP aggregate = 45,761 across
  // 5 outlets; mined = ~2,000. Use the bigger truth where available.
  let reviewsScore = 50;
  const gbpAgg = gbp?.aggregate;
  const aggCount = gbpAgg?.total_reviews ?? 0;
  const aggAvg = gbpAgg?.weighted_avg_rating ?? null;
  if (aggCount > 0 && aggAvg != null) {
    const ratingScore = Math.max(0, Math.min(100, (aggAvg - 2) * 33.33));
    const volumeScore = Math.min(100, Math.log10(aggCount + 1) * 33);
    reviewsScore = Math.round(ratingScore * 0.6 + volumeScore * 0.4);
  } else if (reviews?.sentiment && reviews.sentiment.total > 0) {
    const avg = reviews.avg_rating ?? 0;
    const total = reviews.sentiment.total;
    const fiveRatio = (reviews.sentiment.five || 0) / total;
    const ratingScore = Math.max(0, Math.min(100, (avg - 2) * 33.33));
    const volumeScore = Math.min(100, Math.log10(total + 1) * 50);
    reviewsScore = Math.round(ratingScore * 0.5 + volumeScore * 0.3 + fiveRatio * 100 * 0.2);
  }

  // CONVERSION: booking signals + WhatsApp + low FAQ gaps
  let conversion = 30;
  const corpus = (crawl.pagesText || "").toLowerCase();
  if (/whatsapp|wa\.me|api\.whatsapp/.test(corpus)) conversion += 30;
  if (/book|reservation|reserve|order online/.test(corpus)) conversion += 20;
  if (faqGaps.length <= 3) conversion += 10;
  if (crawl.contactInfo?.phone) conversion += 10;
  conversion = Math.min(100, conversion);

  // PRESENCE: social profiles + testimonials + photos
  const socials = Object.keys(crawl.socialProfiles || {}).length;
  const tests = (crawl.testimonials?.length || 0);
  let presence = 30 + socials * 12 + (tests >= 3 ? 20 : tests * 5);
  presence = Math.min(100, presence);

  // Weighted overall (discovery + reviews matter most for conversion)
  const overall = Math.round(
    discovery * 0.25 +
    content * 0.20 +
    reviewsScore * 0.25 +
    conversion * 0.15 +
    presence * 0.15
  );

  const grade: AgentScore["grade"] =
    overall >= 92 ? "A+" :
    overall >= 85 ? "A" :
    overall >= 75 ? "B" :
    overall >= 65 ? "C" :
    overall >= 50 ? "D" : "F";

  // Percentile blurb — encouraging or honest depending on score
  let percentile_blurb: string;
  if (overall >= 85) {
    percentile_blurb = `You beat ~${Math.min(95, overall + 5)}% of similar businesses we've audited. Top-quartile.`;
  } else if (overall >= 70) {
    percentile_blurb = `You're in the upper half of similar businesses — but the ${100 - overall} points you're missing are where your competitors are eating your lunch.`;
  } else if (overall >= 50) {
    percentile_blurb = `Mid-pack. The good news: every section below has a specific lever you haven't pulled yet.`;
  } else {
    percentile_blurb = `Big opportunity. The agent picks the low-hanging fruit first — most owners see 20+ points in the first month.`;
  }

  return {
    overall,
    grade,
    breakdown: { discovery, content, reviews: reviewsScore, conversion, presence },
    percentile_blurb,
  };
}

function computeBadges(
  businessName: string,
  crawl: CrawlResult,
  directory: DirectoryStrategy | null,
  reviews: ReviewMining | null,
  gbp: GbpData | null = null,
): Badge[] {
  const badges: Badge[] = [];
  const corpus = (crawl.pagesText || "").toLowerCase();

  // Heritage: extract a 4-digit year ≥ 1900 ≤ 2015 mentioned alongside "since" or "established"
  const heritageMatch = corpus.match(/(?:since|established|founded|est\.?)\s+(?:in\s+)?(19\d{2}|20[01]\d)/i);
  if (heritageMatch) {
    const year = parseInt(heritageMatch[1], 10);
    const age = 2026 - year;
    if (age >= 10) {
      badges.push({
        emoji: "🏛️",
        label: `${age}-year heritage`,
        detail: `In business since ${year} — institutional credibility you can lean on.`,
      });
    }
  }

  // 5-star champion — prefer GBP aggregate when available
  const aggAvg = gbp?.aggregate?.weighted_avg_rating;
  const aggTotal = gbp?.aggregate?.total_reviews;
  if (aggAvg != null && aggAvg >= 4.5 && (aggTotal ?? 0) >= 100) {
    badges.push({
      emoji: "⭐",
      label: `${aggAvg.toFixed(2)}★ champion`,
      detail: `${aggAvg.toFixed(2)} avg across ${aggTotal!.toLocaleString()} Google reviews — exceptional.`,
    });
  } else if (reviews?.avg_rating && reviews.avg_rating >= 4.5 && reviews.sentiment.total >= 50) {
    badges.push({
      emoji: "⭐",
      label: `${reviews.avg_rating.toFixed(1)}★ champion`,
      detail: `${reviews.avg_rating.toFixed(1)} avg across ${reviews.sentiment.total.toLocaleString()} reviews — exceptional.`,
    });
  }

  // Multi-outlet brand badge
  const outletCount = gbp?.aggregate?.outlet_count ?? 0;
  if (outletCount >= 2) {
    badges.push({
      emoji: "🏬",
      label: `${outletCount} outlets`,
      detail: `${outletCount} locations verified on Google Maps — established brand footprint.`,
    });
  }

  // Omnipresent
  const confirmedCount = directory?.confirmed.length ?? 0;
  if (confirmedCount >= 5) {
    badges.push({
      emoji: "🌐",
      label: "Omnipresent",
      detail: `Verified live on ${confirmedCount} platforms — you're where your customers look.`,
    });
  }

  // Tourism approved
  if (directory?.confirmed.some((c) => /visit dubai|saudi tourism|tripadvisor/i.test(c.platform))) {
    badges.push({
      emoji: "🛫",
      label: "Tourism approved",
      detail: "Listed on official tourism surfaces — institutional traffic flowing your way.",
    });
  }

  // Multi-channel (social presence)
  const socialCount = Object.keys(crawl.socialProfiles || {}).length;
  if (socialCount >= 3) {
    badges.push({
      emoji: "📱",
      label: "Multi-channel",
      detail: `Active on ${socialCount} social platforms — you don't live on one channel.`,
    });
  }

  // Review volume — prefer aggregate
  const voiceCount = aggTotal ?? reviews?.sentiment?.total ?? 0;
  if (voiceCount >= 500) {
    badges.push({
      emoji: "🗣️",
      label: `${voiceCount.toLocaleString()}+ voices`,
      detail: `${voiceCount.toLocaleString()} customers have written about you publicly — that's a moat.`,
    });
  }

  // Community loved (high % of 5★ + photos)
  if (reviews?.sentiment?.total) {
    const fiveRatio = (reviews.sentiment.five || 0) / reviews.sentiment.total;
    if (fiveRatio >= 0.7) {
      badges.push({
        emoji: "💚",
        label: "Community loved",
        detail: `${Math.round(fiveRatio * 100)}% of reviewers left 5★ — your customers fight your fights for you.`,
      });
    }
  }

  // WhatsApp ready
  if (/whatsapp|wa\.me|api\.whatsapp/.test(corpus)) {
    badges.push({
      emoji: "💬",
      label: "WhatsApp-ready",
      detail: "WhatsApp link present on your site — your agent will plug in immediately.",
    });
  }

  return badges.slice(0, 6);
}

async function fetchDirectoryStrategy(
  businessName: string,
  country: "AE" | "SA",
  category: "restaurant" | "beauty" | "default",
  businessContext: string,
): Promise<DirectoryStrategy | null> {
  try {
    const res = await fetch(`${PROMPT_BUILDER_URL.replace(/\/$/, "")}/web/verify-listings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_name: businessName,
        country,
        category,
        business_context: businessContext.slice(0, 8000),
      }),
    });
    if (!res.ok) {
      console.error(`[teardown] verify-listings HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (data?.error) {
      console.error("[teardown] verify-listings error:", data.error);
      return null;
    }
    return {
      confirmed: Array.isArray(data.confirmed) ? data.confirmed : [],
      missing: Array.isArray(data.missing) ? data.missing : [],
      checked: typeof data.checked === "number" ? data.checked : 0,
      enriched: Boolean(data.enriched),
    };
  } catch (e) {
    console.error("[teardown] verify-listings failed:", e);
    return null;
  }
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
  const category = inferCategory(crawl);

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

  // 8 parallel tasks: 7 LLM inference + 1 verified-and-enriched directory lookup
  const [
    insight,
    postsRaw,
    replyRaw,
    faqGapsRaw,
    seoFindingsRaw,
    directoryStrategy,
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

    // --- NEW: directory verification — Firecrawl-grounded + AI-enriched.
    // Replaces the prior LLM-only hallucinated list. The endpoint actually
    // searches each candidate platform, splits into confirmed/missing,
    // then runs ONE LLM enrichment pass to add AI take + recommendation +
    // automation per entry. No more "you're missing Zomato" when they're
    // listed on 4 outlets.
    fetchDirectoryStrategy(businessName, country, category, corpus),

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

  // 6. Directory strategy: already returned from the parallel fetch.
  //    Pass through as-is (verified by Firecrawl, enriched by LLM).

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

  // Second-stage. Two operations that depend on first-stage results:
  //   1. Review mining — needs the verified platform URLs
  //   2. GBP lookup via Google Places — independent, but cheap; we run
  //      it in parallel with reviews to amortize latency
  // Both gracefully return null when their preconditions fail (no
  // confirmed listings / no Places API key).
  const locationHint = crawl.contactInfo?.address || "";
  const [reviews, gbp, social_pulse] = await Promise.all([
    directoryStrategy?.confirmed?.length
      ? fetchReviews(businessName, directoryStrategy.confirmed)
      : Promise.resolve(null),
    fetchGbp(businessName, country, locationHint),
    fetchSocialPulse(businessName, crawl.socialProfiles, country, category),
  ]);

  // Third-stage: competitor radar — needs the GBP lat/lng. Same
  // graceful-skip pattern.
  const competitor_radar = gbp
    ? await fetchCompetitors(gbp, category, corpus, businessName, country)
    : null;

  // Compute the gamified score + grade + badges from everything we know.
  // These are pure functions over the data already collected — no extra
  // LLM cost, no extra latency.
  const agent_score = computeAgentScore(
    crawl,
    directoryStrategy,
    reviews,
    seo_findings,
    faq_gaps,
    gbp,
  );
  const badges = computeBadges(businessName, crawl, directoryStrategy, reviews, gbp);

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
    directory_strategy: directoryStrategy ?? undefined,
    quick_wins,
    brand_mirror,
    screenshot_url: crawl.screenshotUrl || null,
    reviews,
    agent_score,
    badges,
    gbp,
    competitor_radar,
    social_pulse,
    schema_audit: buildSchemaAudit(
      crawl.schemaTypes || [],
      category,
      businessName,
    ),
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

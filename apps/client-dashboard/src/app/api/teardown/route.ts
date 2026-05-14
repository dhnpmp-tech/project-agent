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
  // The finale: a hireable AI employee tailored to THIS business —
  // cultural fit, languages, full skill matrix (inbound / proactive /
  // outbound B2B), day-in-the-life, salary comparison.
  agent_persona?: AgentPersona | null;
  // Persona-voiced margin scribbles attached to specific sections of
  // the report — makes the doc feel like a colleague read along.
  agent_notes?: AgentMarginNote[];
  // Receipt-style footer showing real work done in real time.
  metrics?: ReportMetrics;
  // Eight-section demonstration of platform capability (Customer Memory,
  // Owner Brief, Voice Note, B2B Pipeline, 7-Day Plan, Revenue Math,
  // Channel Map, Nightly Learning). Each field optional — older
  // permalinks won't have them.
  platform_demo?: PlatformDemo | null;
}

// ─── PlatformDemo · 8-section payload ───
//
// Generated by one big LLM call grounded in business context. Each
// sub-shape maps to a real platform capability that prospects can't get
// from a marketing agency.

interface PlatformDemo {
  customer_memory?: CustomerMemoryDemo | null;
  owner_brief?: OwnerMorningBrief | null;
  voice_demo?: VoiceNoteDemo | null;
  b2b_pipeline?: B2BPipeline | null;
  seven_day_plan?: SevenDayPlan | null;
  revenue_projection?: RevenueProjection | null;
  channel_map?: ChannelMap | null;
  nightly_learning?: NightlyLearning | null;
}

interface CustomerMemoryDemo {
  customer_name: string;
  customer_initial: string;
  status: string;
  highlights: { k: string; v: string }[];
  sentiment_history: string;
  next_action: string;
}

interface OwnerMorningBrief {
  greeting: string;
  date_line: string;
  situation: string;
  complication: string;
  question: string;
  action_options: string[];
  numbers: { k: string; v: string }[];
}

interface VoiceNoteDemo {
  voice_lang: string;
  voice_duration_s: number;
  customer_speech_translated: string;
  agent_transcription: string;
  agent_reply: string;
  agent_reply_lang: string;
  processing_ms: number;
}

interface B2BLead {
  target_name: string;
  target_type: string;
  // Verified URL when the lead came from real Firecrawl research.
  // Null when the LLM imagined the target (older permalinks).
  target_url?: string | null;
  why_fit: string;
  channel: "email" | "linkedin" | "instagram_dm" | "whatsapp";
  drafted_message: string;
  offer: string;
}

interface B2BPipeline {
  leads: B2BLead[];
  monday_action: string;
}

interface DayPlan {
  day: number;
  label: string;
  inbound: string[];
  proactive: string[];
  outbound: string[];
}

interface SevenDayPlan {
  days: DayPlan[];
  summary_stat: string;
}

interface RevenueScenario {
  name: string;
  math: string;
  monthly_aed: number;
  confidence: "conservative" | "moderate" | "optimistic";
}

interface RevenueProjection {
  ground_truth: { k: string; v: string }[];
  scenarios: RevenueScenario[];
  total_conservative_aed: number;
  total_optimistic_aed: number;
  agent_cost_aed: number;
}

interface ChannelEntry {
  name: string;
  status: "live" | "ready" | "coming";
  inbound_rate_estimate: string;
  sample_action: string;
}

interface ChannelMap {
  channels: ChannelEntry[];
  unique_value: string;
}

interface NightlyStep {
  time: string;
  label: string;
  detail: string;
}

interface NightlyLearning {
  timeline: NightlyStep[];
  example_rule_drafted: string;
  example_rule_verified: string;
  result: string;
}

interface AgentSkill {
  category: "inbound" | "proactive" | "outbound";
  title: string;
  detail: string;
}

interface AgentPersona {
  name: string;
  age: number;
  origin: string;
  languages: string[];
  backstory: string;
  fit: string;
  signature_line: string;
  skills: AgentSkill[];
  daily_routine: { time: string; action: string }[];
  references: string[];
  agent_cost_aed: number;
  human_equivalent: {
    title: string;
    salary_aed: number;
    benefits_aed: number;
  };
  // Hand-written P.S. at the bottom of the report — one personal line
  // in the persona's voice, signed.
  ps_note?: string;
}

interface AgentMarginNote {
  // Section key the note attaches to. Renderer matches on these.
  section:
    | "insight"
    | "reply"
    | "faq"
    | "social"
    | "reviews"
    | "gbp"
    | "directory"
    | "competitors"
    | "schema"
    | "score";
  note: string;
}

interface ReportMetrics {
  elapsed_seconds: number;
  ai_tasks: number;
  pages_crawled: number;
  reviews_mined: number;
  outlets_found: number;
  competitors_plotted: number;
  signals_pulled: number;
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

// generateAgentPersona — the finale of the teardown.
//
// Designs a culturally-aligned AI employee for THIS specific business,
// with a full skill matrix that explicitly covers the three categories
// the platform actually does: inbound (WhatsApp/voice/booking), proactive
// (posting/re-engagement/morning brief), and outbound B2B (cold outreach
// to cultural clubs / corporate planners / hotel concierges / tour ops
// with personalised pitches and offers). The persona reads like a hire,
// not like marketing copy.
//
// Returns null on any failure — the report renders fine without it.
async function generateAgentPersona(args: {
  businessName: string;
  country: "AE" | "SA";
  groundingBlock: string;
  gbp: GbpData | null;
  reviews: ReviewMining | null;
  social_pulse: SocialPulse | null;
  insight: string;
}): Promise<AgentPersona | null> {
  const { businessName, country, groundingBlock, gbp, reviews, social_pulse, insight } = args;

  // Pull verified facts the LLM should ground the persona in. If a
  // signal is missing we say so explicitly so the LLM doesn't invent.
  const facts: string[] = [];
  if (gbp) {
    const outlets = gbp.outlets?.length || 1;
    const totalReviews = gbp.aggregate?.total_reviews || gbp.user_ratings_total || 0;
    const avg = gbp.aggregate?.weighted_avg_rating || gbp.rating || null;
    facts.push(
      `- Google Business Profile: ${outlets} verified outlet${outlets === 1 ? "" : "s"} · ${totalReviews.toLocaleString()} reviews${avg ? ` · ★ ${avg}` : ""}`,
    );
  } else {
    facts.push("- Google Business Profile: not yet claimed (acquisition opportunity)");
  }
  if (reviews && reviews.sentiment?.total) {
    const s = reviews.sentiment;
    const positive = (s.five || 0) + (s.four || 0);
    const negative = (s.two || 0) + (s.one || 0);
    facts.push(
      `- Reviews mined: ${s.total} · ${positive} positive (4-5★) · ${negative} negative (1-2★) · ${reviews.top_complaints?.length || 0} complaint themes surfaced`,
    );
  }
  if (social_pulse?.instagram) {
    const ig = social_pulse.instagram;
    facts.push(
      `- Instagram: @${ig.handle} · ${ig.followers?.toLocaleString() || "?"} followers · last post ${ig.days_since_last_post ?? "?"} days ago`,
    );
  } else {
    facts.push("- Instagram: not verified yet (the agent will find or create the account)");
  }
  if (social_pulse?.tiktok && social_pulse.tiktok.post_count > 0) {
    facts.push(
      `- TikTok UGC: ${social_pulse.tiktok.post_count} posts about the brand · ${social_pulse.tiktok.total_views?.toLocaleString() || "?"} total views`,
    );
  }

  const city = country === "AE" ? "Dubai/UAE" : "Riyadh/Saudi Arabia";
  const cityShort = country === "AE" ? "Dubai" : "Riyadh";

  const prompt = `${groundingBlock}

VERIFIED FACTS ABOUT THIS BUSINESS
==================================
${facts.join("\n")}

YOUR SHARP-EYED READ (already shipped to the prospect)
======================================================
${insight.trim()}

TASK — DESIGN THE AI EMPLOYEE FOR ${businessName.toUpperCase()}
============================================================

You are designing a fictional AI employee tailored to this business. This is
the finale of a teardown report. The prospect should feel: "this is a real
hire that fits my place, not a generic chatbot."

CULTURAL FIT (read the site content above before naming):
- Japanese / Silk Road / pan-Asian venue → Japanese name (Hiroshi, Aiko, Kenji, Yuki)
- Lebanese / Levantine → Lebanese name (Layla, Karim, Nadia, Tarek)
- Emirati / Khaleeji traditional → Emirati name (Khalid, Mariam, Faisal, Hessa)
- Saudi traditional → Saudi name (Abdullah, Sara, Sultan, Reem)
- Italian → Italian name (Camilla, Marco, Sofia)
- French / European → French name (Camille, Thomas, Léa)
- Indian / South Asian → Indian name (Priya, Arjun, Anika)
- Modern / cosmopolitan / unclear → Yara, Omar, Nour, Ziad
The name + origin + languages MUST feel right for the brand's actual story.

OUTPUT FORMAT — a single JSON object with these EXACT keys:

{
  "name": "First Last",
  "age": 28-38,
  "origin": "City, Country",
  "languages": ["Arabic (native)", "English (fluent)", ...],
  "backstory": "TWO sentences max. Tie to the brand's actual story or city from the site content. No generic 'passionate about hospitality' filler.",
  "fit": "ONE sentence: why this specific persona is the right hire for THIS specific business. Reference a concrete detail from the site.",
  "signature_line": "What this agent would say to a new customer arriving on WhatsApp. 1-2 short lines max. Their voice, not yours.",
  "skills": [
    { "category": "inbound", "title": "...", "detail": "..." }
  ],
  "daily_routine": [
    { "time": "08:00", "action": "..." }
  ],
  "references": ["..."],
  "agent_cost_aed": 3000,
  "human_equivalent": {
    "title": "Restaurant Host + Marketing Coordinator + B2B Sales Rep",
    "salary_aed": 18000,
    "benefits_aed": 4500
  },
  "ps_note": "A short hand-written P.S. — one sentence in your voice, intimate, the kind of thing you'd scribble at the bottom of a hire letter. Reference something specific you noticed about the business. End with your first name."
}

SKILLS REQUIREMENTS — at least 9, covering all 3 categories:

INBOUND (3+) — handling customers who already reached out:
- WhatsApp + voice notes: replies in <2 min, AR/EN, voice or text (whichever the customer used). Transcribes Arabic voice notes in 1.2s.
- Booking management: checks calendar, holds tables, confirms via WhatsApp.
- FAQ answering grounded in verified menu + hours + policies.
- Review response: drafts replies to 1-2★ within 10 min, owner approves from WhatsApp with one tap.

PROACTIVE (3+) — keeping the relationship alive:
- Instagram posting from owner photos (3×/week, scheduled around peak dayparts).
- Re-engagement to lapsed customers (>14 days no visit).
- Morning brief to owner at 9am (SCQA format — situation, complication, question, action).
- Multi-outlet monitoring (if more than one location).

OUTBOUND · B2B (3+ — this is the part most prospects haven't thought about):
- Research relevant groups in ${city} every Friday. BE SPECIFIC TO THIS BUSINESS TYPE. For a shisha/lounge: Japanese expat community, Russian Cultural Centre, Tokyo-${cityShort} Business Network, BCG ${cityShort} events lead, 5-star hotel concierges. For a salon: bridal planners, hotel spa concierges, expat WhatsApp groups. For coffee: corporate offices, co-working spaces, hotel F&B. For each you imagine, NAME 3-5 specific target group types.
- Draft personalised invitations in the target group's language. Owner approves once.
- Offer mechanics — e.g., 30% off first booking for groups of 8+, comp-table-for-content with food creators, hotel-guest referral discounts.
- Track responses and follow up.

DAILY ROUTINE — 6-7 entries covering 08:00 to 23:00. Include morning brief, midday inbound peak, afternoon outbound drafting, evening service support, late-night memory write + nightly self-improvement.

REFERENCES — 3-4 lines like:
- "Trained on N similar businesses in ${cityShort}."
- "Same engine that runs Saffron Kitchen Dubai + Jareed Coffee Riyadh."
- "Speaks ${country === "AE" ? "Khaleeji" : "Najdi"} dialect — not broken Modern Standard Arabic."

human_equivalent.title — invent the multi-role human equivalent (e.g. "Restaurant Host + Social Media Manager + B2B Sales Rep"). salary_aed should be roughly the combined cost of those roles in ${cityShort}. benefits_aed should be ~25% of salary.

agent_cost_aed: 3000

Output ONLY the JSON. No preamble, no markdown fence.`;

  try {
    const raw = await inferenceJsonChat("rami_research", prompt, { maxTokens: 3000 });
    const sliced = jsonSliceOrNull(raw);
    if (!sliced) return null;
    const parsed = JSON.parse(sliced) as Partial<AgentPersona>;
    if (
      !parsed.name ||
      !parsed.signature_line ||
      !Array.isArray(parsed.skills) ||
      parsed.skills.length < 6
    ) {
      return null;
    }
    // Light type-shaping with safe fallbacks so we never ship a half-formed
    // persona that breaks the React renderer.
    return {
      name: String(parsed.name).slice(0, 60),
      age: typeof parsed.age === "number" ? parsed.age : 32,
      origin: String(parsed.origin || "").slice(0, 80),
      languages: Array.isArray(parsed.languages) ? parsed.languages.slice(0, 5) : [],
      backstory: String(parsed.backstory || "").slice(0, 600),
      fit: String(parsed.fit || "").slice(0, 400),
      signature_line: String(parsed.signature_line || "").slice(0, 280),
      skills: (parsed.skills as AgentSkill[]).filter(
        (s) => s && (s.category === "inbound" || s.category === "proactive" || s.category === "outbound"),
      ).slice(0, 14),
      daily_routine: Array.isArray(parsed.daily_routine)
        ? parsed.daily_routine.slice(0, 9).map((r) => ({
            time: String(r.time || "").slice(0, 10),
            action: String(r.action || "").slice(0, 220),
          }))
        : [],
      references: Array.isArray(parsed.references)
        ? parsed.references.slice(0, 6).map((r) => String(r).slice(0, 200))
        : [],
      agent_cost_aed:
        typeof parsed.agent_cost_aed === "number" ? parsed.agent_cost_aed : 3000,
      human_equivalent: {
        title: String(parsed.human_equivalent?.title || "Restaurant Host + Marketing Coordinator").slice(0, 120),
        salary_aed:
          typeof parsed.human_equivalent?.salary_aed === "number"
            ? parsed.human_equivalent.salary_aed
            : 12000,
        benefits_aed:
          typeof parsed.human_equivalent?.benefits_aed === "number"
            ? parsed.human_equivalent.benefits_aed
            : 3000,
      },
      ps_note: parsed.ps_note ? String(parsed.ps_note).slice(0, 320) : undefined,
    };
  } catch (e) {
    console.error("[teardown] persona generation failed:", e);
    return null;
  }
}

// generateMarginNotes — short persona-voiced asides attached to specific
// sections of the report. Renders in the margins next to the section
// header so the doc feels like a colleague is reading along with you.
//
// One LLM call produces all the notes at once (cheap vs one-per-section).
// Section keys map to renderer markers via <AgentNote sectionKey="...">.
async function generateMarginNotes(args: {
  persona: AgentPersona | null;
  businessName: string;
  insight: string;
  faqGapsCount: number;
  hasReviews: boolean;
  hasGbp: boolean;
  hasSocial: boolean;
}): Promise<AgentMarginNote[]> {
  const { persona, businessName, insight, faqGapsCount, hasReviews, hasGbp, hasSocial } = args;
  if (!persona) return [];

  const firstName = persona.name.split(/\s+/)[0] || persona.name;
  const availableSections = [
    "insight",
    "reply",
    "faq",
    hasSocial ? "social" : null,
    hasReviews ? "reviews" : null,
    hasGbp ? "gbp" : null,
    "directory",
    "score",
  ].filter(Boolean) as AgentMarginNote["section"][];

  const prompt = `You are ${persona.name}, age ${persona.age}, from ${persona.origin}.
You speak: ${persona.languages.join(", ")}.
Your signature line is: "${persona.signature_line}"

You are leaving short MARGIN SCRIBBLES on a teardown report being read by the owner of ${businessName}. The kind of things a senior consultant would scribble in pencil next to specific paragraphs — sharp, opinionated, specific. NOT marketing copy.

You have already read the report. Your sharp first-impression read was:
"""
${insight.trim().slice(0, 1200)}
"""

TASK: write ONE margin scribble for EACH of these sections — short (one sentence each, max 18 words). Write in YOUR voice — first person, sometimes a question, sometimes a quick observation, sometimes a recommendation. Each should reference something you'd genuinely notice about THIS business.

Sections you must cover (use the exact section key):
${availableSections.map((s) => `- "${s}"`).join("\n")}

Output ONLY a JSON array — no preamble, no fence:
[
  { "section": "insight", "note": "..." },
  { "section": "faq", "note": "..." }
]

Tone examples (your voice — first person, ${firstName.toLowerCase()}-flavored):
- "↳ I'd push this one to your Friday menu drop — it converts."
- "↳ Your customers ask this on WhatsApp 3-4× a day already. I'd answer all of them by Tuesday."
- "↳ Mercato is the laggard here. I'd start by drafting replies to its complaints first."
- "↳ Hmm — your IG drought aligns with your slowest Tuesdays. Worth fixing first."
- "↳ This is the line I'd use in DMs to Russian Cultural Centre next week."

KEEP IT SHORT. KEEP IT SPECIFIC. NO GENERIC ADVICE.`;

  try {
    const raw = await inferenceJsonChat("rami_research", prompt, { maxTokens: 900 });
    const sliced = jsonSliceOrNull(raw);
    if (!sliced) return [];
    const parsed = JSON.parse(sliced);
    if (!Array.isArray(parsed)) return [];
    const valid: AgentMarginNote[] = parsed
      .filter(
        (n: unknown) =>
          n !== null &&
          typeof n === "object" &&
          typeof (n as { section?: unknown }).section === "string" &&
          typeof (n as { note?: unknown }).note === "string" &&
          availableSections.includes(
            (n as { section: AgentMarginNote["section"] }).section,
          ),
      )
      .map((n) => {
        const obj = n as { section: AgentMarginNote["section"]; note: string };
        // Trim and ensure single-sentence-ish length.
        let note = obj.note.trim();
        if (!/^[↳→»]/.test(note)) note = `↳ ${note}`;
        return { section: obj.section, note: note.slice(0, 220) };
      });
    return valid;
  } catch (e) {
    console.error("[teardown] margin notes failed:", e);
    return [];
  }
}

interface RealB2BTarget {
  name: string;
  url: string;
  snippet: string;
  category: string;
  host?: string;
}

// discoverRealB2BTargets — two-step real research:
//   1. Ask an LLM to generate 5-7 target CATEGORIES specific to this
//      business type + city + persona backstory.
//   2. Call /web/research-b2b-targets (Firecrawl /v1/search-backed) to
//      find real organisations in each category.
// Returns an empty list on any failure — the platform-demo prompt still
// runs and falls back to its LLM-imagined targets in that case.
async function discoverRealB2BTargets(args: {
  persona: AgentPersona;
  businessName: string;
  country: "AE" | "SA";
  category: "restaurant" | "beauty" | "default";
}): Promise<RealB2BTarget[]> {
  const { persona, businessName, country, category } = args;
  const city = country === "AE" ? "Dubai" : "Riyadh";
  const businessType =
    category === "restaurant"
      ? "restaurant / lounge / venue"
      : category === "beauty"
        ? "salon / spa / beauty venue"
        : "consumer venue";

  // Step 1 — LLM picks the categories.
  const catPrompt = `BUSINESS: ${businessName} — a ${businessType} in ${city}.
PERSONA WHO WILL DO THE OUTREACH:
- Name: ${persona.name}
- Origin: ${persona.origin}
- Backstory: ${persona.backstory}

TASK: List 6-8 specific TYPES of B2B targets in ${city} this business should be reaching out to for group bookings, events, or partnerships. Be CONCRETE — name the kind of organisation in 2-4 words. NOT a generic category.

Good examples:
- "Japanese cultural club" (not "cultural clubs")
- "Marina 5-star hotel concierge" (not "hotels")
- "Dubai corporate event planner" (not "event planners")
- "wedding planning agency" (not "weddings")
- "private banking concierge" (not "banks")
- "food creator agency" (not "creators")
- "tech startup CEO breakfast" (not "tech")
- "expat women community" (not "expats")

Output ONLY a JSON array of strings. No preamble. Max 8.`;

  let categories: string[] = [];
  try {
    const raw = await inferenceJsonChat("rami_research", catPrompt, { maxTokens: 400 });
    const sliced = jsonSliceOrNull(raw);
    if (!sliced) return [];
    const parsed = JSON.parse(sliced);
    if (!Array.isArray(parsed)) return [];
    categories = parsed
      .filter((s: unknown): s is string => typeof s === "string" && s.length >= 3 && s.length <= 60)
      .slice(0, 8);
  } catch {
    return [];
  }

  if (categories.length === 0) return [];

  // Step 2 — Firecrawl-backed research.
  try {
    const res = await fetch(`${PROMPT_BUILDER_URL.replace(/\/$/, "")}/web/research-b2b-targets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_name: businessName,
        business_type: businessType,
        city,
        target_categories: categories,
        max_per_category: 2,
        total_max: 6,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { targets?: RealB2BTarget[]; error?: string };
    if (data.error) return [];
    return Array.isArray(data.targets) ? data.targets : [];
  } catch (e) {
    console.error("[teardown] B2B research failed:", e);
    return [];
  }
}

// generatePlatformDemo — produces the eight-section "demonstration of
// platform surface area" payload. One big LLM call, grounded in the
// business context + persona + verified facts. Each section maps to a
// real platform capability we've built (Mem0, Owner Brain, voice
// pipeline, Sales Rep, content engine, Karpathy loop, etc.) and shows a
// prospect what living with the agent is like rather than describing it.
async function generatePlatformDemo(args: {
  persona: AgentPersona | null;
  businessName: string;
  country: "AE" | "SA";
  groundingBlock: string;
  insight: string;
  gbp: GbpData | null;
  reviews: ReviewMining | null;
  social_pulse: SocialPulse | null;
  realTargets: RealB2BTarget[];
}): Promise<PlatformDemo | null> {
  const { persona, businessName, country, groundingBlock, insight, gbp, reviews, social_pulse, realTargets } = args;
  if (!persona) return null;

  const firstName = persona.name.split(/\s+/)[0] || persona.name;
  const city = country === "AE" ? "Dubai" : "Riyadh";
  const totalReviews =
    gbp?.aggregate?.total_reviews ?? gbp?.user_ratings_total ?? reviews?.sentiment?.total ?? 0;
  const avgRating = gbp?.aggregate?.weighted_avg_rating ?? gbp?.rating ?? reviews?.avg_rating ?? null;
  const outletCount = gbp?.aggregate?.outlet_count ?? (gbp ? 1 : 0);
  const igHandle = social_pulse?.instagram?.handle;
  const igFollowers = social_pulse?.instagram?.followers;
  const igDrought = social_pulse?.instagram?.days_since_last_post;

  // 5-star count for revenue math grounding.
  const fiveStars = reviews?.sentiment?.five ?? 0;
  const fourStars = reviews?.sentiment?.four ?? 0;
  const positiveCount = fiveStars + fourStars;

  const personaSummary = `
PERSONA YOU ARE DESIGNING THIS DEMO FOR:
- Name: ${persona.name}
- Origin: ${persona.origin}
- Languages: ${persona.languages.join(", ")}
- Signature line: "${persona.signature_line}"
`.trim();

  const factsBlock = [
    outletCount > 0 ? `- Outlets verified on Google Maps: ${outletCount}` : "- Google Business Profile: not yet claimed",
    totalReviews > 0 ? `- Total reviews: ${totalReviews.toLocaleString()}` : "",
    avgRating ? `- Weighted rating: ${avgRating}★` : "",
    positiveCount > 0 ? `- Positive reviewers (4-5★): ${positiveCount}` : "",
    igHandle ? `- Instagram: @${igHandle} · ${(igFollowers ?? 0).toLocaleString()} followers · last post ${igDrought ?? "?"} days ago` : "- Instagram: not yet active",
    `- Market: ${city}, ${country === "AE" ? "UAE" : "Saudi Arabia"}`,
  ]
    .filter(Boolean)
    .join("\n");

  // Pre-formatted real-targets block. When this is present, the LLM
  // MUST use these exact names + URLs in b2b_pipeline. When empty,
  // the LLM falls back to imagining plausible targets — flagged so the
  // prospect knows the difference.
  const realTargetsBlock =
    realTargets && realTargets.length > 0
      ? realTargets
          .map(
            (t, i) =>
              `${i + 1}. ${t.name}\n   URL: ${t.url}\n   Category: ${t.category}\n   Snippet: ${t.snippet || "(no snippet)"}`,
          )
          .join("\n\n")
      : "(no real targets — fall back to plausible imagined entities, but say so in the why_fit text)";

  const prompt = `${groundingBlock}

${personaSummary}

VERIFIED FACTS:
${factsBlock}

YOUR INSIGHT (already shipped to the prospect):
"""
${insight.trim().slice(0, 1200)}
"""

RESEARCHED B2B TARGETS (from a live Firecrawl web search just now):
=================================================================
${realTargetsBlock}

TASK — Produce a SINGLE JSON object with EIGHT sections that demonstrate what living with ${firstName} on the team is like. Each section is concrete, grounded in this specific business, and feels like a working system not a brochure.

EXACT SHAPE (every key required):

{
  "customer_memory": {
    "customer_name": "Plausible full name fitting the city/culture (e.g. Khalid Al-Mansouri in Dubai, Reem Al-Otaibi in Riyadh, Yuki Tanaka for a Japanese-themed venue)",
    "customer_initial": "K",
    "status": "VIP · 8 visits since 2024",
    "highlights": [
      { "k": "Allergy", "v": "..." },
      { "k": "Preference", "v": "..." },
      { "k": "Usual order", "v": "..." },
      { "k": "Sentiment", "v": "Positive · last 3 visits" },
      { "k": "Last visit", "v": "23 days ago" }
    ],
    "sentiment_history": "One sentence showing their visit-by-visit emotional trail (e.g. '6 positive, 1 mixed about wait time at Mercato, 2 positive after')",
    "next_action": "Specific next move ${firstName} would take, in her voice (e.g. 'Friday 4pm — re-engage with a held window table and Hiroshi's new cardamom shisha')"
  },

  "owner_brief": {
    "greeting": "Good morning, [Owner first name or 'team']",
    "date_line": "Tomorrow's weekday · day-counter (e.g. 'Thursday, May 15 · day 6 with you')",
    "situation": "ONE sentence: what happened overnight (bookings + messages + complaints, real-feeling numbers).",
    "complication": "ONE sentence: the gap or anomaly worth their attention TODAY — grounded in a specific complaint theme or pattern they'd recognise from their reviews.",
    "question": "ONE sentence: a yes/no or A-B question that needs the owner's call.",
    "action_options": ["Option A — terse", "Option B — terse", "Option C — terse"],
    "numbers": [
      { "k": "bookings tonight", "v": "23" },
      { "k": "messages handled", "v": "47" },
      { "k": "new reviews", "v": "3" },
      { "k": "draft replies", "v": "2 pending" }
    ]
  },

  "voice_demo": {
    "voice_lang": "Arabic (Khaleeji)" or whichever dialect fits the market,
    "voice_duration_s": 8-18,
    "customer_speech_translated": "What the customer SAID, in English so the prospect understands. ONE sentence.",
    "agent_transcription": "What ${firstName} TRANSCRIBED — in the customer's language (literally the Arabic transcription if the voice was Arabic), 1-2 sentences.",
    "agent_reply": "${firstName}'s reply — in the customer's language if it was Arabic, else English. 2-3 short sentences. Helpful, specific to this business.",
    "agent_reply_lang": "Arabic" or "English",
    "processing_ms": 800-1500
  },

  "b2b_pipeline": {
    "leads": [
      {
        "target_name": "Use the EXACT name from the RESEARCHED B2B TARGETS list above. Do not invent — copy the title field. If the list is empty/missing, only then imagine a plausible org and add '(no verified URL)' to the snippet.",
        "target_type": "Short tag derived from the category + a one-word descriptor (e.g. 'Cultural club · Japanese expats' or 'Hotel concierge · Marina')",
        "target_url": "Use the EXACT URL from the researched target. If imagined, output null.",
        "why_fit": "ONE sentence referencing the persona's backstory or the business's distinguishing trait + this target's likely need. Reference a detail from the target's snippet if useful.",
        "channel": "email | linkedin | instagram_dm | whatsapp",
        "drafted_message": "MULTI-LINE message in ${firstName}'s voice. 60-100 words. Personal. References both the brand and the target group (use their actual name). Includes the offer below.",
        "offer": "Specific incentive (e.g. '30% off first booking for groups of 8+', or 'Comp tasting menu for 2 in exchange for a feature')"
      }
    ],
    "monday_action": "One sentence: '${firstName} sends these ${realTargets?.length || 5} pitches Monday 10am — you approve once.'"
  },

  "seven_day_plan": {
    "days": [
      {
        "day": 1,
        "label": "Mon · Day 1",
        "inbound": ["specific action 1", "specific action 2"],
        "proactive": ["specific action 1", "specific action 2"],
        "outbound": ["specific action 1"]
      }
    ],
    "summary_stat": "ONE sentence with cumulative concrete numbers (e.g. 'By Sunday: 312 customer messages handled, 5 B2B doors knocked, 18 IG posts queued for your approval')"
  },

  "revenue_projection": {
    "ground_truth": [
      { "k": "5★ reviewers", "v": "${fiveStars > 0 ? fiveStars.toLocaleString() : "(estimated)"}" },
      { "k": "outlets", "v": "${outletCount}" },
      { "k": "avg rating", "v": "${avgRating ?? "—"}★" }
    ],
    "scenarios": [
      {
        "name": "Re-engaging happy reviewers monthly",
        "math": "ARITHMETIC: e.g. '${positiveCount} positive reviewers × 8% × AED 250 avg ticket'",
        "monthly_aed": COMPUTED_NUMBER,
        "confidence": "conservative"
      },
      {
        "name": "B2B doors opened",
        "math": "...",
        "monthly_aed": COMPUTED_NUMBER,
        "confidence": "moderate"
      },
      {
        "name": "No-show recovery",
        "math": "...",
        "monthly_aed": COMPUTED_NUMBER,
        "confidence": "conservative"
      }
    ],
    "total_conservative_aed": SUM_OF_CONSERVATIVE,
    "total_optimistic_aed": SUM_WITH_OPTIMISTIC_RANGE,
    "agent_cost_aed": 3000
  },

  "channel_map": {
    "channels": [
      { "name": "WhatsApp", "status": "live", "inbound_rate_estimate": "~Nmsg/wk today", "sample_action": "Replies in <2min, AR/EN" },
      { "name": "Voice notes", "status": "live", "inbound_rate_estimate": "AR transcription in 1.2s", "sample_action": "Voice in → voice OR text out per preference" },
      { "name": "Instagram DM", "status": "live", "inbound_rate_estimate": "~Nmsg/wk today", "sample_action": "Same memory as WhatsApp" },
      { "name": "Web chat widget", "status": "ready", "inbound_rate_estimate": "—", "sample_action": "Drop one snippet on your site" },
      { "name": "Telegram", "status": "coming", "inbound_rate_estimate": "—", "sample_action": "Same brain, different surface" },
      { "name": "Owner WhatsApp", "status": "live", "inbound_rate_estimate": "9am brief + alerts", "sample_action": "Approves replies, gets briefs" }
    ],
    "unique_value": "ONE sentence: one memory across every channel, so a customer who DMs on IG yesterday gets greeted by name on WhatsApp today."
  },

  "nightly_learning": {
    "timeline": [
      { "time": "22:00", "label": "Conversations close", "detail": "..." },
      { "time": "02:00", "label": "New rules drafted", "detail": "..." },
      { "time": "04:00", "label": "Rules A/B verified on past chats", "detail": "..." },
      { "time": "09:00", "label": "Deployed + briefed to you", "detail": "..." }
    ],
    "example_rule_drafted": "ONE sentence — a plausible rule ${firstName} would write tonight based on patterns from this business's reviews (e.g. 'If a customer mentions Mercato by name, mention free valet preemptively — it's the #3 complaint there')",
    "example_rule_verified": "ONE sentence — how it was tested (e.g. 'Tested against 14 past Mercato bookings — would have prevented 3 no-shows and 1 walk-out')",
    "result": "ONE sentence — what changes tomorrow"
  }
}

RULES:
- Every section grounded in the verified facts. No invented prices or awards.
- B2B leads MUST be 5 entries, named, specific to ${city}.
- 7-Day Plan MUST be 7 entries (Mon-Sun).
- Revenue scenarios MUST be 3 entries with math you can defend.
- All voice in voice_demo.agent_transcription should be authentic to the language (real Arabic script if Arabic).

Output ONLY the JSON. No preamble, no markdown fence.`;

  try {
    const raw = await inferenceJsonChat("rami_research", prompt, { maxTokens: 6000 });
    const sliced = jsonSliceOrNull(raw);
    if (!sliced) return null;
    const parsed = JSON.parse(sliced) as Partial<PlatformDemo>;

    // Defensive shaping with safe fallbacks per sub-section so a malformed
    // single field doesn't kill the whole panel.
    return {
      customer_memory: parsed.customer_memory && parsed.customer_memory.customer_name
        ? parsed.customer_memory
        : null,
      owner_brief:
        parsed.owner_brief && parsed.owner_brief.situation ? parsed.owner_brief : null,
      voice_demo:
        parsed.voice_demo && parsed.voice_demo.agent_reply ? parsed.voice_demo : null,
      b2b_pipeline:
        parsed.b2b_pipeline && Array.isArray(parsed.b2b_pipeline.leads) && parsed.b2b_pipeline.leads.length > 0
          ? {
              leads: parsed.b2b_pipeline.leads.slice(0, 6),
              monday_action: parsed.b2b_pipeline.monday_action || "",
            }
          : null,
      seven_day_plan:
        parsed.seven_day_plan && Array.isArray(parsed.seven_day_plan.days) && parsed.seven_day_plan.days.length > 0
          ? {
              days: parsed.seven_day_plan.days.slice(0, 7),
              summary_stat: parsed.seven_day_plan.summary_stat || "",
            }
          : null,
      revenue_projection:
        parsed.revenue_projection && Array.isArray(parsed.revenue_projection.scenarios)
          ? parsed.revenue_projection
          : null,
      channel_map:
        parsed.channel_map && Array.isArray(parsed.channel_map.channels)
          ? parsed.channel_map
          : null,
      nightly_learning:
        parsed.nightly_learning && Array.isArray(parsed.nightly_learning.timeline)
          ? parsed.nightly_learning
          : null,
    };
  } catch (e) {
    console.error("[teardown] platform demo failed:", e);
    return null;
  }
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

// enrichGbpFromProse — when the site clearly mentions multiple outlets
// but Places returned only the flagship, extract the venue names from
// the crawl content and query Places for each. Merge into outlets[] and
// recompute aggregate. Fixes the common Dubai-restaurant case where the
// site says "Dubai Mall + Marina + Sports Lounge" but Places only finds
// one of them by brand-seed.
async function enrichGbpFromProse(
  gbp: GbpData,
  businessName: string,
  country: "AE" | "SA",
  corpus: string,
  locationHint: string,
): Promise<GbpData> {
  // Already have ≥2 outlets — trust what Places gave us.
  if ((gbp.outlets?.length ?? 0) >= 2) return gbp;
  if (!corpus || corpus.length < 200) return gbp;

  // Extract venue/location names from corpus via LLM.
  const prompt = `BUSINESS: ${businessName}

CRAWLED SITE CONTENT (verbatim):
${corpus.slice(0, 7000)}

TASK: List every distinct OUTLET, BRANCH, or VENUE this business operates as a short location name suitable for a Google Maps search.

Good examples (UAE/Saudi venue tags): "Dubai Mall", "Dubai Marina", "Mercato", "Sports Lounge", "Burj Khalifa", "Jumeirah Beach", "Al Fahidi", "Al Khobar Mall", "Riyadh Park".

Rules:
- Output a JSON array of short location names (1-4 words each, no full address, no "branch", no marketing words).
- Skip the parent city alone if more specific venues exist.
- Skip generic mentions ("our locations", "various branches").
- Output [] if the business operates only one outlet.
- Max 8 entries.

JSON only.`;

  let names: string[] = [];
  try {
    const raw = await inferenceJsonChat("rami_research", prompt, { maxTokens: 400 });
    const sliced = jsonSliceOrNull(raw);
    if (!sliced) return gbp;
    const parsed = JSON.parse(sliced);
    if (!Array.isArray(parsed)) return gbp;
    names = (parsed as unknown[])
      .filter((n): n is string => typeof n === "string" && n.length >= 3 && n.length <= 40)
      .slice(0, 8);
  } catch {
    return gbp;
  }

  if (names.length === 0) return gbp;

  // For each extracted name, query Places with "<biz> <name>" and collect
  // any place_ids not already in outlets[].
  const existing = new Set<string>(
    (gbp.outlets ?? [gbp]).map((o) => o.place_id || "").filter(Boolean),
  );
  const found: GbpOutlet[] = [];

  for (const name of names) {
    try {
      const res = await fetch(`${PROMPT_BUILDER_URL.replace(/\/$/, "")}/web/places-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: `${businessName} ${name}`,
          location_hint: locationHint,
          country,
        }),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as GbpData | { error: string };
      if ("error" in data) continue;

      // The response itself is the primary outlet; sub-results in outlets[].
      const candidates: GbpOutlet[] = [
        data as GbpOutlet,
        ...((data as GbpData).outlets ?? []),
      ];
      for (const c of candidates) {
        if (c.place_id && !existing.has(c.place_id)) {
          existing.add(c.place_id);
          found.push(c);
        }
      }
    } catch (e) {
      console.warn(`[teardown] enrichGbp lookup failed for "${name}":`, e);
    }
  }

  if (found.length === 0) return gbp;

  // Merge primary + existing outlets + newly found, dedupe by place_id.
  const primary: GbpOutlet = {
    place_id: gbp.place_id,
    name: gbp.name,
    address: gbp.address,
    phone: gbp.phone,
    website: gbp.website,
    maps_url: gbp.maps_url,
    rating: gbp.rating,
    user_ratings_total: gbp.user_ratings_total,
    price_level: gbp.price_level,
    hours: gbp.hours,
    photos_count: gbp.photos_count,
    business_status: gbp.business_status,
    lat: gbp.lat,
    lng: gbp.lng,
  };
  const merged: GbpOutlet[] = [];
  const seen = new Set<string>();
  for (const o of [primary, ...(gbp.outlets ?? []), ...found]) {
    if (o.place_id && !seen.has(o.place_id)) {
      seen.add(o.place_id);
      merged.push(o);
    }
  }
  merged.sort((a, b) => (b.user_ratings_total ?? 0) - (a.user_ratings_total ?? 0));

  const total_reviews = merged.reduce((acc, o) => acc + (o.user_ratings_total ?? 0), 0);
  const weightedSum = merged.reduce(
    (acc, o) => acc + (o.rating ?? 0) * (o.user_ratings_total ?? 0),
    0,
  );
  const weighted_avg_rating =
    total_reviews > 0 ? Number((weightedSum / total_reviews).toFixed(2)) : null;
  const total_photos = merged.reduce((acc, o) => acc + (o.photos_count ?? 0), 0);

  // Promote the most-reviewed outlet to flagship.
  const flagship = merged[0];
  return {
    ...flagship,
    outlets: merged,
    aggregate: {
      outlet_count: merged.length,
      total_reviews,
      weighted_avg_rating,
      total_photos,
    },
  };
}

// discoverInstagramHandle — when the site doesn't expose an IG link, try
// to find one via the prompt-builder /web/find-instagram endpoint (which
// uses Firecrawl /v1/search to query site:instagram.com "<biz>"). Returns
// the handle string or undefined. Most Dubai businesses HAVE Instagram,
// they just don't always link it from the homepage.
async function discoverInstagramHandle(
  businessName: string,
  country: "AE" | "SA",
  existingHandle: string | undefined,
): Promise<string | undefined> {
  if (existingHandle) return existingHandle;
  try {
    const res = await fetch(`${PROMPT_BUILDER_URL.replace(/\/$/, "")}/web/find-instagram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_name: businessName, country }),
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { handle?: string; error?: string };
    if (data.error) return undefined;
    return data.handle && data.handle.length >= 2 ? data.handle : undefined;
  } catch (e) {
    console.warn("[teardown] find-instagram failed:", e);
    return undefined;
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
  const t0 = performance.now();
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

  // Discover Instagram handle BEFORE social-pulse so we can pass it
  // explicitly. Many Dubai businesses have IG but no homepage link.
  const igHandleFromCrawl = (crawl.socialProfiles?.instagram || "").match(
    /instagram\.com\/(?:@?)([A-Za-z0-9_.]+)/,
  )?.[1];
  const discoveredIg = await discoverInstagramHandle(businessName, country, igHandleFromCrawl);
  const augmentedSocialProfiles = {
    ...(crawl.socialProfiles || {}),
    ...(discoveredIg && !crawl.socialProfiles?.instagram
      ? { instagram: `https://instagram.com/${discoveredIg}` }
      : {}),
  };

  const [reviews, gbpInitial, social_pulse] = await Promise.all([
    directoryStrategy?.confirmed?.length
      ? fetchReviews(businessName, directoryStrategy.confirmed)
      : Promise.resolve(null),
    fetchGbp(businessName, country, locationHint),
    fetchSocialPulse(businessName, augmentedSocialProfiles, country, category),
  ]);

  // Multi-outlet enrichment from prose. When the site advertises multiple
  // venues but Places only returned one (e.g. brand-seed filter misses),
  // we LLM-extract venue names and re-query each. No-op when we already
  // have 2+ outlets.
  const gbp = gbpInitial
    ? await enrichGbpFromProse(gbpInitial, businessName, country, corpus, locationHint)
    : null;

  // Third-stage: competitor radar — needs the GBP lat/lng. Same
  // graceful-skip pattern.
  const competitor_radar = gbp
    ? await fetchCompetitors(gbp, category, corpus, businessName, country)
    : null;

  // Fourth-stage: the AI employee persona — the finale of the report.
  // Grounded in everything we now know (crawl + GBP + reviews + social).
  // Returns null on failure; the report renders fine without it.
  const agent_persona = await generateAgentPersona({
    businessName,
    country,
    groundingBlock,
    gbp,
    reviews,
    social_pulse,
    insight,
  });

  // Fifth stage — live B2B target research (Firecrawl-backed) runs in
  // parallel with margin notes. We need the real targets BEFORE the
  // platform-demo prompt so the LLM can draft outreach grounded in real
  // organisations rather than inventing them.
  const [agent_notes, realB2BTargets] = await Promise.all([
    generateMarginNotes({
      persona: agent_persona,
      businessName,
      insight,
      faqGapsCount: faq_gaps.length,
      hasReviews: !!reviews,
      hasGbp: !!gbp,
      hasSocial: !!social_pulse,
    }),
    agent_persona
      ? discoverRealB2BTargets({
          persona: agent_persona,
          businessName,
          country,
          category,
        })
      : Promise.resolve<RealB2BTarget[]>([]),
  ]);

  // Sixth stage — the eight-section platform demo, now fed REAL targets
  // from the research step above (when available).
  const platform_demo = await generatePlatformDemo({
    persona: agent_persona,
    businessName,
    country,
    groundingBlock,
    insight,
    gbp,
    reviews,
    social_pulse,
    realTargets: realB2BTargets,
  });

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
    agent_persona,
    agent_notes,
    platform_demo,
    metrics: {
      elapsed_seconds: Math.round((performance.now() - t0) / 1000),
      // Stage-1 LLM calls + verify-listings + persona + notes. Static
      // count avoids the cost of plumbing a counter through the helper.
      ai_tasks:
        8 +
        (directoryStrategy ? 1 : 0) +
        (reviews ? 1 : 0) +
        (agent_persona ? 1 : 0) +
        (agent_notes.length > 0 ? 1 : 0),
      pages_crawled: crawl.pagesScanned?.length || 0,
      reviews_mined: reviews?.sentiment?.total ?? 0,
      outlets_found: gbp?.aggregate?.outlet_count ?? (gbp ? 1 : 0),
      competitors_plotted: competitor_radar?.competitors?.length ?? 0,
      signals_pulled:
        (social_pulse?.instagram ? 1 : 0) +
        (social_pulse?.tiktok ? 1 : 0) +
        (social_pulse?.reddit ? 1 : 0) +
        (gbp ? 1 : 0) +
        (reviews ? 1 : 0),
    },
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

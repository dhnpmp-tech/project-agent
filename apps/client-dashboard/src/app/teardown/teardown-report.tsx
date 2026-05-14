// Shared rendering for a TeardownPackage. Used by both the live-form
// /teardown page (client-rendered on submit response) and the permalink
// /teardown/[slug] page (server-rendered from DB).
//
// Pure component — no data fetching, no client state. Renders both the
// 4 artifacts and the CTA to claim the full 10-artifact day-one package
// by signing up.

export interface FaqGap {
  question: string;
  draft_answer: string;
  evidence?: string;
}

export interface SeoFinding {
  area: string;
  status: "good" | "weak" | "missing";
  detail: string;
  action: string;
}

export interface DirectoryGap {
  platform: string;
  why_it_matters: string;
  signup_url: string;
}

export interface DirectoryEntry {
  platform: string;
  why: string;
  signup_url: string;
  evidence_url?: string;
  ai_take: string;
  recommendation: string;
  automation: string;
}

export interface DirectoryStrategy {
  confirmed: DirectoryEntry[];
  missing: DirectoryEntry[];
  checked: number;
  enriched: boolean;
}

export interface QuickWin {
  category: "marketing" | "seo" | "ads" | "ops" | "social";
  action: string;
  rationale: string;
  estimated_impact: string;
}

export interface BrandVoiceMirror {
  owner_voice: string;
  customer_review: string;
  whatsapp_greeting: string;
}

export interface ReviewSentiment {
  five: number;
  four: number;
  three: number;
  two: number;
  one: number;
  total: number;
}

export interface ReviewComplaint {
  theme: string;
  count: number;
  sample_quote: string;
  draft_response: string;
}

export interface ReviewMining {
  sentiment: ReviewSentiment;
  avg_rating: number | null;
  top_praise: string[];
  top_complaints: ReviewComplaint[];
  summary: string;
  sources: { platform: string; url: string; reviews_found: number }[];
}

export interface Badge {
  emoji: string;
  label: string;
  detail: string;
}

export interface ScoreBreakdown {
  discovery: number;
  content: number;
  reviews: number;
  conversion: number;
  presence: number;
}

export interface AgentScore {
  overall: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  breakdown: ScoreBreakdown;
  percentile_blurb: string;
}

export interface GbpOutlet {
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

export interface GbpAggregate {
  outlet_count: number;
  total_reviews: number;
  weighted_avg_rating: number | null;
  total_photos: number;
}

export interface GbpData extends GbpOutlet {
  outlets?: GbpOutlet[];
  aggregate?: GbpAggregate;
}

export interface Competitor {
  name: string;
  place_id: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  price_level: number | null;
  open_now: boolean | null;
  address: string | null;
  ai_take?: string;
}

export interface CompetitorRadar {
  competitors: Competitor[];
  positioning_summary: string;
  automation: string;
}

export interface InstagramSignal {
  handle: string | null;
  followers: number | null;
  post_count: number | null;
  is_verified: boolean | null;
  bio: string;
  days_since_last_post: number | null;
  profile_url: string | null;
}

export interface TikTokPost {
  views: number;
  likes: number;
  author: string | null;
  desc: string;
  url: string;
}

export interface TikTokSignal {
  post_count: number;
  total_views: number;
  top_posts: TikTokPost[];
}

export interface RedditMention {
  title: string;
  subreddit: string | null;
  score: number | null;
  num_comments: number | null;
  url: string;
}

export interface RedditSignal {
  mention_count: number;
  top_mentions: RedditMention[];
}

export interface SocialPulse {
  instagram: InstagramSignal | null;
  tiktok: TikTokSignal | null;
  reddit: RedditSignal | null;
}

export interface TeardownPackage {
  business_name: string;
  url: string;
  generated_at: string;
  pages_scanned: number;
  brand_voice: string;
  insight: string;
  sample_reply: string;
  social_posts: string[];
  faq_gaps: FaqGap[];
  // Optional richer sections — backward-compat: older permalinks
  // generated before this rollout won't have these. Cards hide.
  seo_findings?: SeoFinding[];
  // OLD shape (LLM-only) — kept for older permalinks.
  directory_gaps?: DirectoryGap[];
  // NEW shape (Firecrawl-verified + LLM-enriched).
  directory_strategy?: DirectoryStrategy;
  quick_wins?: QuickWin[];
  brand_mirror?: BrandVoiceMirror | null;
  // NEW: visual hero + measurement + scoring fields
  screenshot_url?: string | null;
  reviews?: ReviewMining | null;
  agent_score?: AgentScore | null;
  badges?: Badge[];
  gbp?: GbpData | null;
  competitor_radar?: CompetitorRadar | null;
  social_pulse?: SocialPulse | null;
  schema_audit?: SchemaAudit | null;
  agent_persona?: AgentPersona | null;
  agent_notes?: AgentMarginNote[];
  metrics?: ReportMetrics;
  platform_demo?: PlatformDemo | null;
}

export interface AgentMarginNote {
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

export interface ReportMetrics {
  elapsed_seconds: number;
  ai_tasks: number;
  pages_crawled: number;
  reviews_mined: number;
  outlets_found: number;
  competitors_plotted: number;
  signals_pulled: number;
}

export interface SchemaAudit {
  present: string[];
  missing_critical: string[];
  ai_take: string;
  recommendation: string;
  automation: string;
}

import { SchemaEmitButton } from "./schema-emit-button";
import { EmployeePersona, type AgentPersona } from "./employee-persona";
import { PlatformDemoSections, type PlatformDemo } from "./platform-demo";
export type { AgentPersona, PlatformDemo };

const GRADE_PALETTE: Record<AgentScore["grade"], { fg: string; bg: string; ring: string }> = {
  "A+": { fg: "#1e6d3d", bg: "#dfeede", ring: "#2d8e7d" },
  A: { fg: "#1e6d3d", bg: "#dfeede", ring: "#2d8e7d" },
  B: { fg: "#5d8a4a", bg: "#e9f0dd", ring: "#7ab063" },
  C: { fg: "#a07232", bg: "#f4e4cb", ring: "#c89a4f" },
  D: { fg: "#a07232", bg: "#fdf3e3", ring: "#d4a460" },
  F: { fg: "#a83a2b", bg: "#f4d6cf", ring: "#c95c4b" },
};

const STATUS_COLORS: Record<SeoFinding["status"], { fg: string; bg: string; label: string }> = {
  good: { fg: "#1e6d3d", bg: "#dfeede", label: "good" },
  weak: { fg: "#a07232", bg: "#f4e4cb", label: "weak" },
  missing: { fg: "#a83a2b", bg: "#f4d6cf", label: "missing" },
};

const CATEGORY_EMOJI: Record<QuickWin["category"], string> = {
  marketing: "🎯",
  seo: "🔍",
  ads: "💰",
  ops: "⚙️",
  social: "📱",
};

export function TeardownReport({ pkg, slug }: { pkg: TeardownPackage; slug?: string }) {
  const notes = pkg.agent_notes;
  const agentName = pkg.agent_persona?.name;
  return (
    <>
      <AgentGreeting pkg={pkg} />
      {/* Video composition pulled — overlapping layers + clipped badges
          made it read low-craft. Will return when re-composed properly. */}
      {(pkg.agent_score || pkg.screenshot_url) && <VisualHero pkg={pkg} />}
      {pkg.badges && pkg.badges.length > 0 && <BadgeRow badges={pkg.badges} />}
      <AgentNote sectionKey="score" notes={notes} agentName={agentName} />
      {pkg.gbp && (
        <>
          <AgentNote sectionKey="gbp" notes={notes} agentName={agentName} />
          <GbpPanel gbp={pkg.gbp} />
        </>
      )}
      {pkg.social_pulse && (
        <>
          <AgentNote sectionKey="social" notes={notes} agentName={agentName} />
          <SocialPulseSection pulse={pkg.social_pulse} />
        </>
      )}
      {pkg.competitor_radar && pkg.competitor_radar.competitors.length > 0 && (
        <>
          <AgentNote sectionKey="competitors" notes={notes} agentName={agentName} />
          <CompetitorSection radar={pkg.competitor_radar} ownRating={pkg.gbp?.rating ?? null} />
        </>
      )}
      {pkg.reviews && pkg.reviews.sentiment?.total > 0 && (
        <>
          <AgentNote sectionKey="reviews" notes={notes} agentName={agentName} />
          <ReviewsSection reviews={pkg.reviews} />
        </>
      )}
      {pkg.schema_audit && (
        <>
          <AgentNote sectionKey="schema" notes={notes} agentName={agentName} />
          <SchemaAuditSection audit={pkg.schema_audit} slug={slug} />
        </>
      )}
      <section
        style={{
          background: "var(--paper-card, #fbfaf4)",
          border: "1px solid var(--paper-line, #d8d2bf)",
          borderRadius: 8,
          padding: 28,
          marginTop: 20,
        }}
      >
      <AgentNote sectionKey="insight" notes={notes} agentName={agentName} />
      <Block
        eyebrow="§ A · the read"
        title="Sharp first impression"
        body={pkg.insight || "(insight unavailable — try a different URL)"}
      />

      <AgentNote sectionKey="reply" notes={notes} agentName={agentName} />
      <Block
        eyebrow="§ B · a real reply"
        title="Sample WhatsApp response"
        subtitle='Customer: "Hi, I&apos;d like to learn more — are you open this weekend and what makes you different?"'
        body={pkg.sample_reply || "(reply unavailable)"}
      />

      {pkg.faq_gaps.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--paper-mut, #837c69)",
            }}
          >
            § C · the gaps
          </span>
          <h3
            style={{
              fontFamily: "Instrument Serif, serif",
              fontSize: 22,
              fontWeight: 400,
              margin: "6px 0 12px",
              lineHeight: 1.15,
            }}
          >
            {pkg.faq_gaps.length} customer questions your site doesn&apos;t answer yet
          </h3>
          <AgentNote sectionKey="faq" notes={notes} agentName={agentName} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            {pkg.faq_gaps.map((g, i) => (
              <div
                key={i}
                style={{
                  background: "var(--paper, #f6f3eb)",
                  border: "1px solid var(--paper-line, #d8d2bf)",
                  borderRadius: 4,
                  padding: 14,
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 6px" }}>{g.question}</p>
                <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>{g.draft_answer}</p>
                {g.evidence && (
                  <p
                    style={{
                      fontSize: 11,
                      lineHeight: 1.45,
                      margin: "8px 0 0",
                      paddingTop: 8,
                      borderTop: "1px dashed var(--paper-line, #d8d2bf)",
                      color: "var(--paper-mut, #837c69)",
                      fontStyle: "italic",
                    }}
                  >
                    evidence: {g.evidence}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {pkg.seo_findings && pkg.seo_findings.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--paper-mut, #837c69)",
            }}
          >
            § E · the seo audit
          </span>
          <h3
            style={{
              fontFamily: "Instrument Serif, serif",
              fontSize: 22,
              fontWeight: 400,
              margin: "6px 0 12px",
              lineHeight: 1.15,
            }}
          >
            What you can fix in your site this week
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pkg.seo_findings.map((f, i) => {
              const c = STATUS_COLORS[f.status];
              return (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: 12,
                    padding: 12,
                    background: "var(--paper, #f6f3eb)",
                    border: "1px solid var(--paper-line, #d8d2bf)",
                    borderRadius: 4,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--mono, ui-monospace)",
                      fontSize: 10,
                      padding: "3px 8px",
                      borderRadius: 4,
                      color: c.fg,
                      background: c.bg,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      alignSelf: "start",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.label}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{f.area}</p>
                    <p style={{ fontSize: 12.5, lineHeight: 1.5, margin: "4px 0 0", color: "var(--paper-mut, #514c40)" }}>
                      {f.detail}
                    </p>
                    <p
                      style={{
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        margin: "6px 0 0",
                        paddingLeft: 10,
                        borderLeft: "2px solid #2d8e7d",
                      }}
                    >
                      <strong>Fix:</strong> {f.action}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pkg.directory_strategy && (
        <DirectoryStrategySection strategy={pkg.directory_strategy} />
      )}
      {!pkg.directory_strategy && pkg.directory_gaps && pkg.directory_gaps.length > 0 && (
        // Legacy renderer for older permalinks (no verification, no AI take)
        <LegacyDirectoryGaps gaps={pkg.directory_gaps} />
      )}

      {pkg.quick_wins && pkg.quick_wins.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--paper-mut, #837c69)",
            }}
          >
            § G · the playbook
          </span>
          <h3
            style={{
              fontFamily: "Instrument Serif, serif",
              fontSize: 22,
              fontWeight: 400,
              margin: "6px 0 12px",
              lineHeight: 1.15,
            }}
          >
            {pkg.quick_wins.length} moves you can ship this week
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pkg.quick_wins.map((w, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: 14,
                  padding: 14,
                  background: "var(--paper, #f6f3eb)",
                  border: "1px solid var(--paper-line, #d8d2bf)",
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    lineHeight: 1.2,
                    width: 28,
                    textAlign: "center",
                  }}
                >
                  {CATEGORY_EMOJI[w.category]}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{w.action}</p>
                  <p style={{ fontSize: 12.5, lineHeight: 1.5, margin: "4px 0 0", color: "var(--paper-mut, #514c40)" }}>
                    {w.rationale}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      margin: "6px 0 0",
                      fontFamily: "var(--mono, ui-monospace)",
                      color: "#1e6d3d",
                    }}
                  >
                    impact: {w.estimated_impact}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pkg.brand_mirror && (
        <div style={{ marginTop: 32 }}>
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--paper-mut, #837c69)",
            }}
          >
            § H · the voice mirror
          </span>
          <h3
            style={{
              fontFamily: "Instrument Serif, serif",
              fontSize: 22,
              fontWeight: 400,
              margin: "6px 0 12px",
              lineHeight: 1.15,
            }}
          >
            What your brand sounds like — in three voices
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            <VoiceCard
              eyebrow="founder · LinkedIn post"
              body={pkg.brand_mirror.owner_voice}
            />
            <VoiceCard
              eyebrow="customer review · 5★"
              body={pkg.brand_mirror.customer_review}
            />
            <VoiceCard
              eyebrow="WhatsApp · first greeting"
              body={pkg.brand_mirror.whatsapp_greeting}
            />
          </div>
        </div>
      )}

      {pkg.social_posts.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--paper-mut, #837c69)",
            }}
          >
            § D · the calendar
          </span>
          <h3
            style={{
              fontFamily: "Instrument Serif, serif",
              fontSize: 22,
              fontWeight: 400,
              margin: "6px 0 12px",
              lineHeight: 1.15,
            }}
          >
            Three Instagram captions in your voice
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {pkg.social_posts.map((post, i) => (
              <div
                key={i}
                style={{
                  background: "var(--paper, #f6f3eb)",
                  border: "1px solid var(--paper-line, #d8d2bf)",
                  borderRadius: 4,
                  padding: 14,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--mono, ui-monospace)",
                    fontSize: 10,
                    color: "var(--paper-mut, #837c69)",
                  }}
                >
                  Post {i + 1}
                </span>
                <p style={{ fontSize: 13, lineHeight: 1.5, margin: "6px 0 0", whiteSpace: "pre-wrap" }}>
                  {post}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 36,
          padding: 18,
          background: "#e9f0dd",
          border: "1px solid #bdd7af",
          borderRadius: 6,
        }}
      >
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
          <strong>This is 4 of 10.</strong> The full day-one package (a Google Business Profile
          audit, the owner-channel morning brief, three ICP-matched prospects with draft outbound
          messages, a complete 10-turn WhatsApp demo, and the voice-of-the-customer mining from
          your reviews) ships to your dashboard when you sign up.{" "}
          <a
            href="/app/signup"
            style={{ color: "#1e6d3d", fontWeight: 600, textDecoration: "underline" }}
          >
            Start free →
          </a>
        </p>
      </div>
      </section>
      {pkg.platform_demo && pkg.agent_persona && (
        <PlatformDemoSections demo={pkg.platform_demo} persona={pkg.agent_persona} />
      )}
      {pkg.agent_persona && <EmployeePersona persona={pkg.agent_persona} />}
      <ReportFooter pkg={pkg} slug={slug} />
    </>
  );
}

// ============================================================================
// AGENT GREETING — first-person framing. The whole report reads as the
// agent narrating its first 60 seconds on the job.
// ============================================================================

function AgentGreeting({ pkg }: { pkg: TeardownPackage }) {
  const score = pkg.agent_score;
  const grade = score?.grade ?? "?";
  const verb = grade === "A+" || grade === "A" ? "spotted" : grade === "B" || grade === "C" ? "found" : "uncovered";
  const findingCount = [
    pkg.faq_gaps?.length || 0,
    pkg.seo_findings?.length || 0,
    pkg.directory_strategy?.missing?.length || 0,
    pkg.competitor_radar?.competitors?.length || 0,
    pkg.reviews?.top_complaints?.length || 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <section
      style={{
        background: "#1d1c18",
        color: "#fbfaf4",
        borderRadius: 10,
        padding: 24,
        marginBottom: 20,
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 18,
        alignItems: "start",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "#2d8e7d",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Instrument Serif, Georgia, serif",
          fontSize: 26,
          flexShrink: 0,
        }}
      >
        ⏱
      </div>
      <div>
        <div
          style={{
            fontFamily: "var(--mono, ui-monospace)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#837c69",
            marginBottom: 8,
          }}
        >
          your AI agent · just clocked in
        </div>
        <p
          style={{
            fontFamily: "Instrument Serif, Georgia, serif",
            fontSize: 22,
            lineHeight: 1.35,
            margin: 0,
            color: "#fbfaf4",
          }}
        >
          Hi. I&apos;m your AI agent. I just spent <em style={{ color: "#7ad6c0" }}>60 seconds</em> looking at{" "}
          <em style={{ color: "#7ad6c0" }}>{pkg.business_name}</em> from every angle a smart customer would.{" "}
          I {verb} <em style={{ color: "#7ad6c0" }}>{findingCount} specific things</em> across {" "}
          {pkg.gbp ? "Google, " : ""}
          {pkg.social_pulse?.instagram ? "Instagram, " : ""}
          {pkg.reviews && pkg.reviews.sentiment.total > 0 ? "your reviews, " : ""}
          your competitors, and your site itself. Here&apos;s what I&apos;d do if I were you.
        </p>
        <p
          style={{
            fontSize: 12,
            margin: "10px 0 0",
            color: "#837c69",
            fontFamily: "var(--mono, ui-monospace)",
            letterSpacing: "0.04em",
          }}
        >
          → scroll. each card shows what I saw + what I&apos;d do this week + what I&apos;ll automate for you ongoing.
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// VISUAL HERO — screenshot + grade gauge + score breakdown
// ============================================================================

function VisualHero({ pkg }: { pkg: TeardownPackage }) {
  const score = pkg.agent_score;
  return (
    <section
      style={{
        background: "var(--paper-card, #fbfaf4)",
        border: "1px solid var(--paper-line, #d8d2bf)",
        borderRadius: 8,
        padding: 24,
        marginBottom: 20,
        display: "grid",
        gridTemplateColumns: pkg.screenshot_url ? "minmax(0, 1fr) 280px" : "1fr",
        gap: 20,
      }}
    >
      {pkg.screenshot_url && (
        <a
          href={pkg.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            borderRadius: 6,
            overflow: "hidden",
            border: "1px solid var(--paper-line, #d8d2bf)",
            background: "var(--paper, #f6f3eb)",
            aspectRatio: "16 / 10",
            maxHeight: 340,
          }}
        >
          <img
            src={pkg.screenshot_url}
            alt={`${pkg.business_name} homepage`}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top center",
              display: "block",
            }}
          />
        </a>
      )}
      {score && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ScoreGauge score={score} />
          <p
            style={{
              fontSize: 12.5,
              lineHeight: 1.55,
              color: "var(--paper-mut, #514c40)",
              margin: 0,
              fontStyle: "italic",
            }}
          >
            {score.percentile_blurb}
          </p>
          <ScoreRadar breakdown={score.breakdown} />
        </div>
      )}
    </section>
  );
}

function ScoreGauge({ score }: { score: AgentScore }) {
  const palette = GRADE_PALETTE[score.grade];
  // SVG ring gauge — 0-100 → 0-360°
  const radius = 56;
  const stroke = 10;
  const C = 2 * Math.PI * radius;
  const offset = C - (score.overall / 100) * C;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="var(--paper-line, #d8d2bf)"
          strokeWidth={stroke}
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={palette.ring}
          strokeWidth={stroke}
          strokeDasharray={C}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
        />
        <text
          x="70"
          y="74"
          textAnchor="middle"
          style={{
            fontFamily: "Instrument Serif, Georgia, serif",
            fontSize: 36,
            fontWeight: 400,
            fill: palette.fg,
          }}
        >
          {score.overall}
        </text>
        <text
          x="70"
          y="92"
          textAnchor="middle"
          style={{
            fontFamily: "var(--mono, ui-monospace)",
            fontSize: 9,
            letterSpacing: "0.14em",
            fill: "var(--paper-mut, #837c69)",
          }}
        >
          AGENT SCORE
        </text>
      </svg>
      <div>
        <span
          style={{
            display: "inline-block",
            padding: "6px 16px",
            background: palette.bg,
            color: palette.fg,
            borderRadius: 6,
            fontFamily: "Instrument Serif, Georgia, serif",
            fontSize: 32,
            lineHeight: 1,
            letterSpacing: "0.04em",
          }}
        >
          {score.grade}
        </span>
        <p
          style={{
            fontSize: 11,
            margin: "6px 0 0",
            fontFamily: "var(--mono, ui-monospace)",
            color: "var(--paper-mut, #837c69)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          weighted across 5 axes
        </p>
      </div>
    </div>
  );
}

function ScoreRadar({ breakdown }: { breakdown: ScoreBreakdown }) {
  // SVG pentagon radar — 5 axes, score 0-100 mapped to radius
  const cx = 110;
  const cy = 110;
  const maxR = 80;
  const axes: { key: keyof ScoreBreakdown; label: string }[] = [
    { key: "discovery", label: "Discovery" },
    { key: "reviews", label: "Reviews" },
    { key: "presence", label: "Presence" },
    { key: "conversion", label: "Conversion" },
    { key: "content", label: "Content" },
  ];

  // Compute axis positions (top = -90°, then clockwise)
  const points = axes.map((a, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
    const v = (breakdown[a.key] ?? 0) / 100;
    return {
      label: a.label,
      value: breakdown[a.key] ?? 0,
      x: cx + Math.cos(angle) * maxR * v,
      y: cy + Math.sin(angle) * maxR * v,
      lx: cx + Math.cos(angle) * (maxR + 16),
      ly: cy + Math.sin(angle) * (maxR + 16),
      anchor: (Math.abs(Math.cos(angle)) < 0.2 ? "middle" : Math.cos(angle) > 0 ? "start" : "end") as "middle" | "start" | "end",
    };
  });

  // Grid rings at 25/50/75/100
  const rings = [0.25, 0.5, 0.75, 1.0].map((scale) =>
    axes
      .map((_, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
        return `${cx + Math.cos(angle) * maxR * scale},${cy + Math.sin(angle) * maxR * scale}`;
      })
      .join(" "),
  );

  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg
      width="100%"
      height="240"
      viewBox="-40 -10 300 240"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", margin: "0 auto", maxWidth: 360 }}
    >
      {/* Grid rings */}
      {rings.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke="var(--paper-line, #d8d2bf)"
          strokeWidth={1}
          strokeDasharray={i === 3 ? "0" : "2 3"}
        />
      ))}
      {/* Axis lines */}
      {axes.map((_, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
        const x = cx + Math.cos(angle) * maxR;
        const y = cy + Math.sin(angle) * maxR;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="var(--paper-line, #d8d2bf)"
            strokeWidth={1}
          />
        );
      })}
      {/* Score polygon */}
      <polygon
        points={polygon}
        fill="rgba(45, 142, 125, 0.18)"
        stroke="#2d8e7d"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Vertex dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#2d8e7d" />
      ))}
      {/* Labels */}
      {points.map((p, i) => (
        <g key={i}>
          <text
            x={p.lx}
            y={p.ly}
            textAnchor={p.anchor}
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fill: "var(--paper-mut, #514c40)",
            }}
            dominantBaseline="middle"
          >
            {p.label}
          </text>
          <text
            x={p.lx}
            y={p.ly + 12}
            textAnchor={p.anchor}
            style={{
              fontFamily: "Instrument Serif, Georgia, serif",
              fontSize: 14,
              fill: "var(--paper-ink, #1d1c18)",
            }}
            dominantBaseline="middle"
          >
            {p.value}
          </text>
        </g>
      ))}
    </svg>
  );
}

function ScoreBreakdownBars({ breakdown }: { breakdown: ScoreBreakdown }) {
  const axes: { key: keyof ScoreBreakdown; label: string }[] = [
    { key: "discovery", label: "Discovery" },
    { key: "content", label: "Content" },
    { key: "reviews", label: "Reviews" },
    { key: "conversion", label: "Conversion" },
    { key: "presence", label: "Presence" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {axes.map(({ key, label }) => {
        const v = breakdown[key] ?? 0;
        const color = v >= 80 ? "#2d8e7d" : v >= 60 ? "#7ab063" : v >= 40 ? "#c89a4f" : "#c95c4b";
        return (
          <div key={key}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                fontFamily: "var(--mono, ui-monospace)",
                color: "var(--paper-mut, #514c40)",
                marginBottom: 2,
              }}
            >
              <span style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
              <span>{v}</span>
            </div>
            <div
              style={{
                height: 6,
                background: "var(--paper, #f6f3eb)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${v}%`,
                  height: "100%",
                  background: color,
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GbpPanel({ gbp }: { gbp: GbpData }) {
  const outlets = gbp.outlets && gbp.outlets.length > 1 ? gbp.outlets : null;
  const agg = gbp.aggregate;
  const isMulti = !!(outlets && agg && agg.outlet_count > 1);

  return (
    <section
      style={{
        background: "var(--paper-card, #fbfaf4)",
        border: "1px solid var(--paper-line, #d8d2bf)",
        borderRadius: 8,
        padding: 20,
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span
          style={{
            fontFamily: "var(--mono, ui-monospace)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--paper-mut, #837c69)",
          }}
        >
          § google business profile — {isMulti ? `${agg!.outlet_count} outlets aggregated` : "live data"}
        </span>
      </div>
      <h3
        style={{
          fontFamily: "Instrument Serif, Georgia, serif",
          fontSize: 24,
          fontWeight: 400,
          margin: "6px 0 14px",
          lineHeight: 1.15,
        }}
      >
        {isMulti
          ? `${agg!.outlet_count} locations · ${agg!.total_reviews.toLocaleString()} total reviews`
          : gbp.name || "Your Google listing"}
      </h3>

      {/* Aggregate stat row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
        }}
      >
        <StatTile
          label={isMulti ? "Weighted ★" : "Rating"}
          value={
            isMulti && agg!.weighted_avg_rating != null
              ? `${agg!.weighted_avg_rating.toFixed(2)} ★`
              : gbp.rating != null
                ? `${gbp.rating.toFixed(1)} ★`
                : "—"
          }
        />
        <StatTile
          label={isMulti ? "Total reviews" : "Reviews"}
          value={
            isMulti
              ? agg!.total_reviews.toLocaleString()
              : gbp.user_ratings_total != null
                ? gbp.user_ratings_total.toLocaleString()
                : "—"
          }
        />
        <StatTile
          label={isMulti ? "Total photos" : "Photos"}
          value={
            isMulti
              ? agg!.total_photos.toLocaleString()
              : gbp.photos_count != null
                ? String(gbp.photos_count)
                : "—"
          }
        />
        <StatTile
          label="Outlets"
          value={isMulti ? agg!.outlet_count.toString() : "1"}
        />
      </div>

      {/* Per-outlet breakdown when multi-location */}
      {isMulti && outlets && (
        <div style={{ marginTop: 18 }}>
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--paper-mut, #837c69)",
            }}
          >
            outlet-by-outlet
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {outlets.map((o, i) => (
              <a
                key={o.place_id || i}
                href={o.maps_url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 14,
                  padding: 12,
                  background: i === 0 ? "#eef5e9" : "var(--paper, #f6f3eb)",
                  border: `1px solid ${i === 0 ? "#bdd7af" : "var(--paper-line, #d8d2bf)"}`,
                  borderRadius: 6,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>
                    {o.name?.replace(/^Arabian Tea House[^,]*?(?:Restaurant\s*&?\s*Cafe?)?\s*-?\s*/i, "") || o.name}
                    {i === 0 && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontFamily: "var(--mono, ui-monospace)",
                          fontSize: 9,
                          padding: "1px 6px",
                          background: "#1e6d3d",
                          color: "#fbfaf4",
                          borderRadius: 3,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        flagship
                      </span>
                    )}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      fontFamily: "var(--mono, ui-monospace)",
                      color: "var(--paper-mut, #837c69)",
                      margin: "4px 0 0",
                    }}
                  >
                    {o.address}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1e6d3d" }}>
                    {o.rating != null ? `${o.rating.toFixed(1)}★` : "—"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--paper-mut, #837c69)" }}>
                    {(o.user_ratings_total || 0).toLocaleString()} reviews
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Flagship hours/contact for the single-outlet case */}
      {!isMulti && gbp.hours && gbp.hours.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--paper-mut, #837c69)",
            }}
          >
            published hours
          </span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 4,
              marginTop: 6,
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 11.5,
            }}
          >
            {gbp.hours.map((h, i) => (
              <span key={i}>{h}</span>
            ))}
          </div>
        </div>
      )}

      {!isMulti && (
        <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {gbp.maps_url && (
            <a
              href={gbp.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "var(--mono, ui-monospace)",
                fontSize: 11,
                color: "#2d8e7d",
                textDecoration: "underline",
              }}
            >
              view on Maps →
            </a>
          )}
          {gbp.address && (
            <span
              style={{
                fontFamily: "var(--mono, ui-monospace)",
                fontSize: 11,
                color: "var(--paper-mut, #837c69)",
              }}
            >
              {gbp.address}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 10,
        background: "var(--paper, #f6f3eb)",
        border: "1px solid var(--paper-line, #d8d2bf)",
        borderRadius: 6,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--mono, ui-monospace)",
          fontSize: 9,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--paper-mut, #837c69)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "Instrument Serif, Georgia, serif",
          fontSize: 22,
          color: "var(--paper-ink, #1d1c18)",
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function CompetitorSection({
  radar,
  ownRating,
}: {
  radar: CompetitorRadar;
  ownRating: number | null;
}) {
  return (
    <section
      style={{
        background: "var(--paper-card, #fbfaf4)",
        border: "1px solid var(--paper-line, #d8d2bf)",
        borderRadius: 8,
        padding: 24,
        marginBottom: 20,
      }}
    >
      <span
        style={{
          fontFamily: "var(--mono, ui-monospace)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--paper-mut, #837c69)",
        }}
      >
        § competitor radar — within 800m
      </span>
      <h3
        style={{
          fontFamily: "Instrument Serif, Georgia, serif",
          fontSize: 28,
          fontWeight: 400,
          margin: "6px 0 14px",
          lineHeight: 1.1,
        }}
      >
        Where you <em style={{ color: "#2d8e7d" }}>actually</em> stack up
      </h3>

      {radar.positioning_summary && (
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            margin: "0 0 18px",
            padding: 14,
            background: "var(--paper, #f6f3eb)",
            borderRadius: 6,
            borderLeft: "3px solid #2d8e7d",
          }}
        >
          {radar.positioning_summary}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {radar.competitors.map((c, i) => {
          const winningOnRating =
            ownRating != null && c.rating != null && ownRating >= c.rating;
          return (
            <div
              key={i}
              style={{
                padding: 14,
                background: "var(--paper, #f6f3eb)",
                border: "1px solid var(--paper-line, #d8d2bf)",
                borderRadius: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 6,
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{c.name}</p>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  {c.rating != null && (
                    <span
                      style={{
                        fontFamily: "var(--mono, ui-monospace)",
                        fontSize: 12,
                        color: winningOnRating ? "#1e6d3d" : "#a83a2b",
                      }}
                    >
                      {c.rating.toFixed(1)}★ ({c.user_ratings_total?.toLocaleString() ?? "?"})
                    </span>
                  )}
                  {c.price_level != null && (
                    <span
                      style={{
                        fontFamily: "var(--mono, ui-monospace)",
                        fontSize: 12,
                        color: "var(--paper-mut, #837c69)",
                      }}
                    >
                      {"$".repeat(Math.max(1, c.price_level))}
                    </span>
                  )}
                </div>
              </div>
              {c.ai_take && (
                <p
                  style={{
                    fontSize: 12.5,
                    lineHeight: 1.55,
                    margin: 0,
                    color: "var(--paper-ink, #1d1c18)",
                  }}
                >
                  {c.ai_take}
                </p>
              )}
              {c.address && (
                <p
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--mono, ui-monospace)",
                    color: "var(--paper-mut, #837c69)",
                    margin: "6px 0 0",
                  }}
                >
                  {c.address}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {radar.automation && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            background: "#eef5e9",
            border: "1px solid #bdd7af",
            borderRadius: 6,
          }}
        >
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 9,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#1e6d3d",
            }}
          >
            your agent will…
          </span>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              margin: "4px 0 0",
              fontStyle: "italic",
              color: "#1e6d3d",
            }}
          >
            {radar.automation}
          </p>
        </div>
      )}
    </section>
  );
}

function SocialPulseSection({ pulse }: { pulse: SocialPulse }) {
  if (!pulse.instagram && !pulse.tiktok && !pulse.reddit) return null;
  return (
    <section
      style={{
        background: "var(--paper-card, #fbfaf4)",
        border: "1px solid var(--paper-line, #d8d2bf)",
        borderRadius: 8,
        padding: 24,
        marginBottom: 20,
      }}
    >
      <span
        style={{
          fontFamily: "var(--mono, ui-monospace)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--paper-mut, #837c69)",
        }}
      >
        § social pulse — where you live off-site
      </span>
      <h3
        style={{
          fontFamily: "Instrument Serif, Georgia, serif",
          fontSize: 28,
          fontWeight: 400,
          margin: "6px 0 16px",
          lineHeight: 1.1,
        }}
      >
        Your reach <em style={{ color: "#2d8e7d" }}>beyond</em> your website
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 16,
        }}
      >
        {pulse.instagram && pulse.instagram.followers != null && (
          <SocialStatCard
            icon="📷"
            platform="Instagram"
            primary={pulse.instagram.followers.toLocaleString()}
            primaryLabel="followers"
            note={
              pulse.instagram.days_since_last_post != null
                ? `last post ${pulse.instagram.days_since_last_post}d ago${pulse.instagram.days_since_last_post > 14 ? " · getting stale" : ""}`
                : `${pulse.instagram.post_count ?? "?"} posts · ${pulse.instagram.is_verified ? "✓ verified" : "unverified"}`
            }
            href={pulse.instagram.profile_url}
            warn={pulse.instagram.days_since_last_post != null && pulse.instagram.days_since_last_post > 14}
          />
        )}
        {pulse.tiktok && (
          <SocialStatCard
            icon="🎵"
            platform="TikTok"
            primary={pulse.tiktok.post_count.toString()}
            primaryLabel={`UGC posts found`}
            note={
              pulse.tiktok.total_views > 0
                ? `${pulse.tiktok.total_views.toLocaleString()} total views (may include name collisions)`
                : "no UGC found mentioning you"
            }
            warn={pulse.tiktok.post_count === 0}
          />
        )}
        {pulse.reddit && (
          <SocialStatCard
            icon="🗨️"
            platform="Reddit"
            primary={pulse.reddit.mention_count.toString()}
            primaryLabel="mentions"
            note={
              pulse.reddit.mention_count > 0
                ? `${pulse.reddit.top_mentions[0]?.subreddit ? `top in r/${pulse.reddit.top_mentions[0].subreddit}` : "active discussion"}`
                : "no Reddit discussion yet"
            }
            warn={pulse.reddit.mention_count === 0}
          />
        )}
      </div>

      {pulse.instagram?.days_since_last_post != null && pulse.instagram.days_since_last_post > 14 && (
        <div
          style={{
            padding: 12,
            background: "#fdf3e3",
            border: "1px solid #e6c98b",
            borderRadius: 6,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#a07232",
            }}
          >
            ai take · instagram silence
          </span>
          <p style={{ fontSize: 13, lineHeight: 1.55, margin: "4px 0 0" }}>
            {pulse.instagram.days_since_last_post} days since your last Instagram post. Your {pulse.instagram.followers?.toLocaleString()} followers are an asset you&apos;re not compounding.{" "}
            <strong>This week:</strong> post 3 Reels using your best dish/service photos.{" "}
            <em style={{ color: "#1e6d3d" }}>Your agent will: draft + schedule 3 posts per week in your brand voice, post at peak audience hours, monitor engagement.</em>
          </p>
        </div>
      )}

      {pulse.reddit && pulse.reddit.mention_count > 0 && (
        <div style={{ marginTop: 12 }}>
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--paper-mut, #837c69)",
            }}
          >
            top reddit mention
          </span>
          {pulse.reddit.top_mentions.slice(0, 1).map((m, i) => (
            <a
              key={i}
              href={m.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              style={{
                display: "block",
                marginTop: 6,
                padding: 10,
                background: "var(--paper, #f6f3eb)",
                border: "1px solid var(--paper-line, #d8d2bf)",
                borderRadius: 4,
                textDecoration: "none",
                color: "var(--paper-ink, #1d1c18)",
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{m.title}</p>
              <p
                style={{
                  fontSize: 11,
                  fontFamily: "var(--mono, ui-monospace)",
                  color: "var(--paper-mut, #837c69)",
                  margin: "4px 0 0",
                }}
              >
                r/{m.subreddit} · score {m.score} · {m.num_comments ?? 0} comments
              </p>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function SocialStatCard({
  icon,
  platform,
  primary,
  primaryLabel,
  note,
  href,
  warn,
}: {
  icon: string;
  platform: string;
  primary: string;
  primaryLabel: string;
  note: string;
  href?: string | null;
  warn?: boolean;
}) {
  const content = (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span
          style={{
            fontFamily: "var(--mono, ui-monospace)",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--paper-mut, #514c40)",
          }}
        >
          {platform}
        </span>
      </div>
      <div
        style={{
          fontFamily: "Instrument Serif, Georgia, serif",
          fontSize: 32,
          lineHeight: 1,
          color: warn ? "#a07232" : "var(--paper-ink, #1d1c18)",
        }}
      >
        {primary}
      </div>
      <div
        style={{
          fontFamily: "var(--mono, ui-monospace)",
          fontSize: 10,
          letterSpacing: "0.06em",
          color: "var(--paper-mut, #837c69)",
          marginTop: 2,
        }}
      >
        {primaryLabel}
      </div>
      <div
        style={{
          fontSize: 12,
          color: warn ? "#a07232" : "var(--paper-mut, #514c40)",
          marginTop: 8,
          fontStyle: "italic",
        }}
      >
        {note}
      </div>
    </>
  );
  const baseStyle = {
    padding: 14,
    background: warn ? "#fdf3e3" : "var(--paper, #f6f3eb)",
    border: `1px solid ${warn ? "#e6c98b" : "var(--paper-line, #d8d2bf)"}`,
    borderRadius: 6,
    textDecoration: "none",
    color: "inherit",
    display: "block",
  } as const;
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" style={baseStyle}>
      {content}
    </a>
  ) : (
    <div style={baseStyle}>{content}</div>
  );
}

// AgentNote — persona-voiced margin scribble next to a section. Renders
// nothing when there's no note for that section, so we can sprinkle it
// liberally without worrying about empty containers.
function AgentNote({
  sectionKey,
  notes,
  agentName,
}: {
  sectionKey: AgentMarginNote["section"];
  notes?: AgentMarginNote[];
  agentName?: string;
}) {
  const note = notes?.find((n) => n.section === sectionKey);
  if (!note) return null;
  const initial = (agentName?.split(/\s+/)[0] || "A").slice(0, 1).toUpperCase();
  return (
    <div
      style={{
        margin: "8px 0 16px",
        padding: "10px 14px 10px 12px",
        background: "rgba(45,142,125,0.06)",
        borderLeft: "2px solid #2d8e7d",
        borderRadius: "0 6px 6px 0",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#2d8e7d",
          color: "#fbfaf4",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Instrument Serif, serif",
          fontSize: 13,
          fontStyle: "italic",
          marginTop: 1,
        }}
      >
        {initial}
      </span>
      <em
        style={{
          fontFamily: "Instrument Serif, Georgia, serif",
          fontSize: 15,
          lineHeight: 1.45,
          color: "var(--paper-ink, #1d1c18)",
        }}
      >
        {note.note}
      </em>
    </div>
  );
}

// ReportFooter — receipt-style summary + one-tap share to WhatsApp. Sits
// at the very bottom of the teardown after the persona finale.
function ReportFooter({
  pkg,
  slug,
}: {
  pkg: TeardownPackage;
  slug?: string;
}) {
  const m = pkg.metrics;
  const firstName = pkg.agent_persona?.name?.split(/\s+/)[0] || "your agent";
  const permalink = slug ? `https://agents.dcp.sa/teardown/${slug}/` : "";
  const shareText = permalink
    ? `My AI just analyzed ${pkg.business_name} — ${firstName} wants to be hired. Read the teardown: ${permalink}`
    : "";
  const waLink = shareText ? `https://wa.me/?text=${encodeURIComponent(shareText)}` : "";

  return (
    <section
      style={{
        marginTop: 28,
        marginBottom: 20,
        padding: "20px 22px",
        background: "var(--paper, #f6f3eb)",
        border: "1px dashed var(--paper-line, #d8d2bf)",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--paper-mut, #837c69)",
          display: "flex",
          justifyContent: "space-between",
          paddingBottom: 12,
          borderBottom: "1px dashed var(--paper-line, #d8d2bf)",
        }}
      >
        <span>· receipt ·</span>
        <span>agents.dcp.sa</span>
      </div>
      {m && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            rowGap: 6,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 13,
            color: "var(--paper-ink, #1d1c18)",
          }}
        >
          <ReceiptRow k="time spent analyzing" v={`${m.elapsed_seconds}s`} />
          <ReceiptRow k="pages crawled" v={String(m.pages_crawled)} />
          <ReceiptRow k="AI tasks run" v={String(m.ai_tasks)} />
          {m.reviews_mined > 0 && (
            <ReceiptRow k="reviews mined" v={m.reviews_mined.toLocaleString()} />
          )}
          {m.outlets_found > 0 && (
            <ReceiptRow k="outlets verified" v={String(m.outlets_found)} />
          )}
          {m.competitors_plotted > 0 && (
            <ReceiptRow k="competitors plotted" v={String(m.competitors_plotted)} />
          )}
          {m.signals_pulled > 0 && (
            <ReceiptRow k="external signals pulled" v={String(m.signals_pulled)} />
          )}
          <ReceiptRow k="badges earned" v={String(pkg.badges?.length ?? 0)} />
          <div
            style={{
              gridColumn: "1 / -1",
              marginTop: 8,
              paddingTop: 10,
              borderTop: "1px dashed var(--paper-line, #d8d2bf)",
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 600,
            }}
          >
            <span>your cost</span>
            <span style={{ color: "#1e6d3d" }}>$0.00</span>
          </div>
        </div>
      )}

      {waLink && (
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            paddingTop: 4,
          }}
        >
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              background: "#075e54",
              color: "#fff",
              fontFamily: "Instrument Serif, serif",
              fontSize: 16,
              fontStyle: "italic",
              borderRadius: 999,
              textDecoration: "none",
            }}
          >
            <ShareWaIcon />
            Send this to your partner
          </a>
          <span
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--paper-mut, #837c69)",
            }}
          >
            opens WhatsApp · message pre-written
          </span>
        </div>
      )}
    </section>
  );
}

function ReceiptRow({ k, v }: { k: string; v: string }) {
  return (
    <>
      <span style={{ color: "var(--paper-mut, #837c69)" }}>{k}</span>
      <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{v}</span>
    </>
  );
}

function ShareWaIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M3 9 C3 5.5 5.5 3 9 3 C12.5 3 15 5.5 15 9 C15 11.5 13 13.5 11 14 L9 16 L8 14 C5 13.5 3 11.5 3 9 Z" />
      <line x1="6.5" y1="8.5" x2="11.5" y2="8.5" />
      <line x1="6.5" y1="10.5" x2="9.5" y2="10.5" />
    </svg>
  );
}

function BadgeRow({ badges }: { badges: Badge[] }) {
  return (
    <section
      style={{
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {badges.map((b, i) => (
          <div
            key={i}
            title={b.detail}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              background: "#fbfaf4",
              border: "1px solid var(--paper-line, #d8d2bf)",
              borderRadius: 999,
              cursor: "help",
            }}
          >
            <BadgeIcon badge={b} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--paper-ink, #1d1c18)",
              }}
            >
              {b.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// Branded SVG glyph for each badge type. Replaces the colour-emoji that
// reads as low-craft (yellow star, blue globe, etc.). Single accent
// colour (DCP teal) keeps the badge row visually quiet.
function BadgeIcon({ badge }: { badge: Badge }) {
  const TEAL = "#2d8e7d";
  const label = badge.label.toLowerCase();
  const props = {
    width: 16,
    height: 16,
    viewBox: "0 0 18 18",
    fill: "none" as const,
    stroke: TEAL,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: { flexShrink: 0, display: "block" },
  };

  if (label.includes("champion") || label.includes("★")) {
    // Filled star — earned status, not just a tag
    return (
      <svg {...props}>
        <path
          d="M9 1.6 L10.85 6.85 L16.5 7.05 L11.95 10.5 L13.7 15.9 L9 12.85 L4.3 15.9 L6.05 10.5 L1.5 7.05 L7.15 6.85 Z"
          fill={TEAL}
          stroke={TEAL}
        />
      </svg>
    );
  }
  if (label.includes("heritage") || label.includes("year")) {
    return (
      <svg {...props}>
        <path d="M2 6 L9 2.5 L16 6" />
        <line x1="3" y1="6" x2="3" y2="14.5" />
        <line x1="9" y1="6" x2="9" y2="14.5" />
        <line x1="15" y1="6" x2="15" y2="14.5" />
        <line x1="1.5" y1="15.5" x2="16.5" y2="15.5" />
      </svg>
    );
  }
  if (label.includes("outlet") || label.includes("location")) {
    return (
      <svg {...props}>
        <path d="M2 7.5 L9 3.5 L16 7.5" />
        <line x1="3.5" y1="7.5" x2="3.5" y2="15.5" />
        <line x1="14.5" y1="7.5" x2="14.5" y2="15.5" />
        <line x1="3.5" y1="15.5" x2="14.5" y2="15.5" />
        <rect x="7" y="10.5" width="4" height="5" />
      </svg>
    );
  }
  if (label.includes("omnipresent") || label.includes("everywhere") || label.includes("global")) {
    return (
      <svg {...props}>
        <circle cx="9" cy="9" r="7" />
        <ellipse cx="9" cy="9" rx="3.5" ry="7" />
        <line x1="2" y1="9" x2="16" y2="9" />
      </svg>
    );
  }
  if (label.includes("tourism") || label.includes("travel")) {
    return (
      <svg {...props}>
        <path d="M3 10 L7.5 8.5 L7.5 4 L9 4 L10.5 8.5 L15 9.5 L15 11 L10.5 11 L9 15.5 L7.5 15.5 L7.5 11 Z" />
      </svg>
    );
  }
  if (label.includes("channel") || label.includes("whatsapp") || label.includes("multi-channel")) {
    return (
      <svg {...props}>
        <rect x="5.5" y="2.5" width="7" height="12" rx="1.2" />
        <line x1="7.5" y1="12.5" x2="10.5" y2="12.5" />
        <path d="M14.5 5.5 Q16 7.5 14.5 9.5" />
        <path d="M3.5 5.5 Q2 7.5 3.5 9.5" />
      </svg>
    );
  }
  if (label.includes("voice") || label.includes("review")) {
    return (
      <svg {...props}>
        <path d="M2.5 4 L13.5 4 L13.5 11.5 L9.5 11.5 L6.5 14.5 L6.5 11.5 L2.5 11.5 Z" />
        <line x1="5" y1="6.5" x2="11" y2="6.5" />
        <line x1="5" y1="9" x2="9" y2="9" />
      </svg>
    );
  }
  if (label.includes("loved") || label.includes("community") || label.includes("fan")) {
    return (
      <svg {...props}>
        <path d="M9 15 C9 15 2.5 11.5 2.5 6.5 C2.5 4 4.5 2.5 6.5 2.5 C7.8 2.5 8.7 3.3 9 4.3 C9.3 3.3 10.2 2.5 11.5 2.5 C13.5 2.5 15.5 4 15.5 6.5 C15.5 11.5 9 15 9 15 Z" />
      </svg>
    );
  }
  if (label.includes("ready")) {
    return (
      <svg {...props}>
        <path d="M3 9 C3 5.5 5.5 3 9 3 C12.5 3 15 5.5 15 9 C15 11.5 13 13.5 11 14 L9 16 L8 14 C5 13.5 3 11.5 3 9 Z" />
        <line x1="6.5" y1="8.5" x2="11.5" y2="8.5" />
        <line x1="6.5" y1="10.5" x2="9.5" y2="10.5" />
      </svg>
    );
  }
  // Default: rosette / generic award
  return (
    <svg {...props}>
      <circle cx="9" cy="7" r="4.5" />
      <path d="M6 11 L4.5 15.5 L9 14 L13.5 15.5 L12 11" />
    </svg>
  );
}

// ============================================================================
// REVIEWS — sentiment distribution + verbatim praise + draft responses to complaints
// ============================================================================

function ReviewsSection({ reviews }: { reviews: ReviewMining }) {
  const s = reviews.sentiment;
  const total = s.total || 1;
  return (
    <section
      style={{
        background: "var(--paper-card, #fbfaf4)",
        border: "1px solid var(--paper-line, #d8d2bf)",
        borderRadius: 8,
        padding: 24,
        marginBottom: 20,
      }}
    >
      <span
        style={{
          fontFamily: "var(--mono, ui-monospace)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--paper-mut, #837c69)",
        }}
      >
        § review intelligence · {s.total.toLocaleString()} reviews across {reviews.sources.length} platforms
      </span>
      <h3
        style={{
          fontFamily: "Instrument Serif, Georgia, serif",
          fontSize: 28,
          fontWeight: 400,
          margin: "6px 0 16px",
          lineHeight: 1.1,
        }}
      >
        What your customers <em style={{ color: "#2d8e7d" }}>actually</em> say
      </h3>

      {/* Sentiment distribution bars */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: 20,
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            { label: "5★", value: s.five, color: "#2d8e7d" },
            { label: "4★", value: s.four, color: "#7ab063" },
            { label: "3★", value: s.three, color: "#c89a4f" },
            { label: "2★", value: s.two, color: "#d4805a" },
            { label: "1★", value: s.one, color: "#c95c4b" },
          ].map(({ label, value, color }) => {
            const pct = (value / total) * 100;
            return (
              <div key={label} style={{ display: "grid", gridTemplateColumns: "32px 1fr 50px", gap: 8, alignItems: "center" }}>
                <span style={{ fontFamily: "var(--mono, ui-monospace)", fontSize: 11, color: "var(--paper-mut, #514c40)" }}>
                  {label}
                </span>
                <div
                  style={{
                    height: 10,
                    background: "var(--paper, #f6f3eb)",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ width: `${pct}%`, height: "100%", background: color }} />
                </div>
                <span
                  style={{
                    fontFamily: "var(--mono, ui-monospace)",
                    fontSize: 11,
                    color: "var(--paper-mut, #514c40)",
                    textAlign: "right",
                  }}
                >
                  {value.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
        {reviews.avg_rating != null && (
          <div
            style={{
              textAlign: "center",
              padding: 16,
              background: "var(--paper, #f6f3eb)",
              borderRadius: 8,
              border: "1px solid var(--paper-line, #d8d2bf)",
              minWidth: 120,
            }}
          >
            <div
              style={{
                fontFamily: "Instrument Serif, Georgia, serif",
                fontSize: 48,
                lineHeight: 1,
                color: "#2d8e7d",
              }}
            >
              {reviews.avg_rating.toFixed(1)}
            </div>
            <div
              style={{
                fontFamily: "var(--mono, ui-monospace)",
                fontSize: 9,
                color: "var(--paper-mut, #837c69)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginTop: 4,
              }}
            >
              avg ★ across {reviews.sources.length} sources
            </div>
          </div>
        )}
      </div>

      {reviews.summary && (
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            margin: "0 0 18px",
            padding: 14,
            background: "var(--paper, #f6f3eb)",
            borderRadius: 6,
            borderLeft: "3px solid #2d8e7d",
          }}
        >
          {reviews.summary}
        </p>
      )}

      {/* Top praise (verbatim) */}
      {reviews.top_praise.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#1e6d3d",
            }}
          >
            what they love — verbatim
          </span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 10,
              marginTop: 8,
            }}
          >
            {reviews.top_praise.map((q, i) => (
              <div
                key={i}
                style={{
                  padding: 12,
                  background: "#eef5e9",
                  border: "1px solid #bdd7af",
                  borderRadius: 4,
                  fontFamily: "Instrument Serif, Georgia, serif",
                  fontSize: 14,
                  lineHeight: 1.5,
                  fontStyle: "italic",
                  color: "var(--paper-ink, #1d1c18)",
                }}
              >
                &ldquo;{q}&rdquo;
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top complaints with draft owner responses */}
      {reviews.top_complaints.length > 0 && (
        <div>
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#a83a2b",
            }}
          >
            friction points — with draft responses your agent will send
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {reviews.top_complaints.map((c, i) => (
              <div
                key={i}
                style={{
                  padding: 14,
                  background: "#fdf3e3",
                  border: "1px solid #e6c98b",
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{c.theme}</span>
                  <span
                    style={{
                      fontFamily: "var(--mono, ui-monospace)",
                      fontSize: 11,
                      color: "var(--paper-mut, #837c69)",
                    }}
                  >
                    ~{c.count} mentions
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 12.5,
                    fontStyle: "italic",
                    color: "var(--paper-mut, #514c40)",
                    margin: "0 0 8px",
                    paddingLeft: 10,
                    borderLeft: "2px solid var(--paper-line, #d8d2bf)",
                  }}
                >
                  &ldquo;{c.sample_quote}&rdquo;
                </p>
                <div>
                  <span
                    style={{
                      fontFamily: "var(--mono, ui-monospace)",
                      fontSize: 9,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#1e6d3d",
                    }}
                  >
                    your agent will reply
                  </span>
                  <p style={{ fontSize: 13, lineHeight: 1.55, margin: "4px 0 0" }}>{c.draft_response}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function DirectoryStrategySection({ strategy }: { strategy: DirectoryStrategy }) {
  return (
    <div style={{ marginTop: 32 }}>
      <span
        style={{
          fontFamily: "var(--mono, ui-monospace)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--paper-mut, #837c69)",
        }}
      >
        § F · the directories — verified
      </span>
      <h3
        style={{
          fontFamily: "Instrument Serif, serif",
          fontSize: 22,
          fontWeight: 400,
          margin: "6px 0 4px",
          lineHeight: 1.15,
        }}
      >
        Where you actually live online — and where you don&apos;t
      </h3>
      <p
        style={{
          fontSize: 12,
          color: "var(--paper-mut, #837c69)",
          fontStyle: "italic",
          margin: "0 0 16px",
        }}
      >
        We searched {strategy.checked} platforms for your listings.
        {strategy.enriched
          ? " Each entry below has an AI take from the owner's perspective + what we'd automate for you."
          : " Verified by direct search — no LLM guessing."}
      </p>

      {strategy.confirmed.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#1e6d3d",
            }}
          >
            ✓ confirmed listings — {strategy.confirmed.length}
          </span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 12,
              marginTop: 8,
            }}
          >
            {strategy.confirmed.map((d, i) => (
              <DirectoryCard key={i} entry={d} status="confirmed" />
            ))}
          </div>
        </div>
      )}

      {strategy.missing.length > 0 && (
        <div>
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#a83a2b",
            }}
          >
            ✗ missing — {strategy.missing.length}
          </span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 12,
              marginTop: 8,
            }}
          >
            {strategy.missing.map((d, i) => (
              <DirectoryCard key={i} entry={d} status="missing" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DirectoryCard({ entry, status }: { entry: DirectoryEntry; status: "confirmed" | "missing" }) {
  const isConfirmed = status === "confirmed";
  return (
    <div
      style={{
        background: isConfirmed ? "#f4f9ef" : "#fdf3e3",
        border: `1px solid ${isConfirmed ? "#bdd7af" : "#e6c98b"}`,
        borderRadius: 6,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{entry.platform}</p>
        {entry.evidence_url && (
          <a
            href={entry.evidence_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 10,
              color: "#2d8e7d",
              textDecoration: "underline",
            }}
          >
            view listing →
          </a>
        )}
      </div>

      {entry.ai_take && (
        <div>
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 9,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--paper-mut, #837c69)",
            }}
          >
            ai take
          </span>
          <p style={{ fontSize: 12.5, lineHeight: 1.5, margin: "2px 0 0" }}>{entry.ai_take}</p>
        </div>
      )}

      {entry.recommendation && (
        <div>
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 9,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--paper-mut, #837c69)",
            }}
          >
            do this week
          </span>
          <p
            style={{
              fontSize: 12.5,
              lineHeight: 1.5,
              margin: "2px 0 0",
              paddingLeft: 8,
              borderLeft: "2px solid #2d8e7d",
            }}
          >
            {entry.recommendation}
          </p>
        </div>
      )}

      {entry.automation && (
        <div>
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 9,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#1e6d3d",
            }}
          >
            your agent will…
          </span>
          <p
            style={{
              fontSize: 12.5,
              lineHeight: 1.5,
              margin: "2px 0 0",
              fontStyle: "italic",
              color: "#1e6d3d",
            }}
          >
            {entry.automation}
          </p>
        </div>
      )}

      {!isConfirmed && entry.signup_url && (
        <a
          href={entry.signup_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          style={{
            fontFamily: "var(--mono, ui-monospace)",
            fontSize: 11,
            color: "#a83a2b",
            textDecoration: "underline",
            wordBreak: "break-all",
            marginTop: 2,
          }}
        >
          claim →&nbsp;{entry.signup_url.replace(/^https?:\/\//, "")}
        </a>
      )}
    </div>
  );
}

function LegacyDirectoryGaps({ gaps }: { gaps: DirectoryGap[] }) {
  return (
    <div style={{ marginTop: 32 }}>
      <span
        style={{
          fontFamily: "var(--mono, ui-monospace)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--paper-mut, #837c69)",
        }}
      >
        § F · the directories (legacy view)
      </span>
      <h3
        style={{
          fontFamily: "Instrument Serif, serif",
          fontSize: 22,
          fontWeight: 400,
          margin: "6px 0 12px",
          lineHeight: 1.15,
        }}
      >
        Platforms you&apos;re missing
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        {gaps.map((d, i) => (
          <div
            key={i}
            style={{
              background: "var(--paper, #f6f3eb)",
              border: "1px solid var(--paper-line, #d8d2bf)",
              borderRadius: 4,
              padding: 14,
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px" }}>{d.platform}</p>
            <p style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>{d.why_it_matters}</p>
            {d.signup_url && (
              <a
                href={d.signup_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                style={{
                  fontFamily: "var(--mono, ui-monospace)",
                  fontSize: 11,
                  color: "#2d8e7d",
                  textDecoration: "underline",
                  wordBreak: "break-all",
                  marginTop: 8,
                  display: "block",
                }}
              >
                {d.signup_url.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function VoiceCard({ eyebrow, body }: { eyebrow: string; body: string }) {
  return (
    <div
      style={{
        background: "var(--paper, #f6f3eb)",
        border: "1px solid var(--paper-line, #d8d2bf)",
        borderRadius: 4,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <span
        style={{
          fontFamily: "var(--mono, ui-monospace)",
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--paper-mut, #837c69)",
        }}
      >
        {eyebrow}
      </span>
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.55,
          margin: 0,
          whiteSpace: "pre-wrap",
          color: "var(--paper-ink, #1d1c18)",
        }}
      >
        {body}
      </p>
    </div>
  );
}

function SchemaAuditSection({ audit, slug }: { audit: SchemaAudit; slug?: string }) {
  return (
    <section
      style={{
        background: "var(--paper-card, #fbfaf4)",
        border: "1px solid var(--paper-line, #d8d2bf)",
        borderRadius: 8,
        padding: 24,
        marginBottom: 20,
      }}
    >
      <span
        style={{
          fontFamily: "var(--mono, ui-monospace)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--paper-mut, #837c69)",
        }}
      >
        § schema.org audit — measured, not guessed
      </span>
      <h3
        style={{
          fontFamily: "Instrument Serif, Georgia, serif",
          fontSize: 24,
          fontWeight: 400,
          margin: "6px 0 14px",
          lineHeight: 1.15,
        }}
      >
        Your rich-result eligibility on Google
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 14 }}>
        <div
          style={{
            padding: 14,
            background: "#eef5e9",
            border: "1px solid #bdd7af",
            borderRadius: 6,
          }}
        >
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#1e6d3d",
            }}
          >
            ✓ present — {audit.present.length}
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {audit.present.length === 0 ? (
              <span style={{ fontSize: 12, fontStyle: "italic", color: "var(--paper-mut, #514c40)" }}>
                no Schema.org markup detected
              </span>
            ) : (
              audit.present.map((t) => (
                <span
                  key={t}
                  style={{
                    fontFamily: "var(--mono, ui-monospace)",
                    fontSize: 11,
                    padding: "3px 8px",
                    background: "var(--paper, #f6f3eb)",
                    border: "1px solid #bdd7af",
                    borderRadius: 4,
                    color: "#1e6d3d",
                  }}
                >
                  {t}
                </span>
              ))
            )}
          </div>
        </div>

        <div
          style={{
            padding: 14,
            background: audit.missing_critical.length > 0 ? "#fdf3e3" : "var(--paper, #f6f3eb)",
            border: `1px solid ${audit.missing_critical.length > 0 ? "#e6c98b" : "var(--paper-line, #d8d2bf)"}`,
            borderRadius: 6,
          }}
        >
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: audit.missing_critical.length > 0 ? "#a07232" : "var(--paper-mut, #837c69)",
            }}
          >
            ✗ missing — {audit.missing_critical.length}
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {audit.missing_critical.length === 0 ? (
              <span style={{ fontSize: 12, fontStyle: "italic", color: "var(--paper-mut, #514c40)" }}>
                full coverage for your category
              </span>
            ) : (
              audit.missing_critical.map((t) => (
                <span
                  key={t}
                  style={{
                    fontFamily: "var(--mono, ui-monospace)",
                    fontSize: 11,
                    padding: "3px 8px",
                    background: "var(--paper, #f6f3eb)",
                    border: "1px solid #e6c98b",
                    borderRadius: 4,
                    color: "#a07232",
                  }}
                >
                  {t}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <div>
        <span
          style={{
            fontFamily: "var(--mono, ui-monospace)",
            fontSize: 9,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--paper-mut, #837c69)",
          }}
        >
          ai take
        </span>
        <p style={{ fontSize: 13, lineHeight: 1.55, margin: "4px 0 12px" }}>{audit.ai_take}</p>

        <span
          style={{
            fontFamily: "var(--mono, ui-monospace)",
            fontSize: 9,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--paper-mut, #837c69)",
          }}
        >
          do this week
        </span>
        <p style={{ fontSize: 13, lineHeight: 1.55, margin: "4px 0 12px", paddingLeft: 10, borderLeft: "2px solid #2d8e7d" }}>
          {audit.recommendation}
        </p>

        <span
          style={{
            fontFamily: "var(--mono, ui-monospace)",
            fontSize: 9,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#1e6d3d",
          }}
        >
          your agent will…
        </span>
        <p style={{ fontSize: 13, lineHeight: 1.55, margin: "4px 0 0", fontStyle: "italic", color: "#1e6d3d" }}>
          {audit.automation}
        </p>
      </div>

      {slug && audit.missing_critical.length > 0 && (
        <SchemaEmitButton slug={slug} missingTypes={audit.missing_critical} />
      )}
    </section>
  );
}

function Block({
  eyebrow,
  title,
  subtitle,
  body,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  body: string;
}) {
  return (
    <article style={{ marginTop: 0 }}>
      <span
        style={{
          fontFamily: "var(--mono, ui-monospace)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--paper-mut, #837c69)",
        }}
      >
        {eyebrow}
      </span>
      <h3
        style={{
          fontFamily: "Instrument Serif, serif",
          fontSize: 22,
          fontWeight: 400,
          margin: "6px 0 4px",
          lineHeight: 1.15,
        }}
      >
        {title}
      </h3>
      {subtitle && (
        <p
          style={{
            fontSize: 12,
            color: "var(--paper-mut, #837c69)",
            fontStyle: "italic",
            margin: "0 0 8px",
            borderLeft: "2px solid var(--paper-line, #d8d2bf)",
            paddingLeft: 8,
          }}
        >
          {subtitle}
        </p>
      )}
      <p style={{ fontSize: 15, lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap" }}>{body}</p>
    </article>
  );
}

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
}

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

export function TeardownReport({ pkg }: { pkg: TeardownPackage }) {
  return (
    <section
      style={{
        background: "var(--paper-card, #fbfaf4)",
        border: "1px solid var(--paper-line, #d8d2bf)",
        borderRadius: 8,
        padding: 28,
      }}
    >
      <Block
        eyebrow="§ A · the read"
        title="Sharp first impression"
        body={pkg.insight || "(insight unavailable — try a different URL)"}
      />

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

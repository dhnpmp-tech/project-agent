// Day-1 deliverables card. Shows what the AI did in the first 60 seconds
// of the tenant's life — the "holy shit, it's already working" moment.
// Server Component — receives the package as a prop from the dashboard.

import type { DayOnePackage, GbpAuditSummary, FaqGap } from "@/lib/server-queries";

interface Props {
  pkg: DayOnePackage | null;
}

const FIELD_LABELS: Record<string, string> = {
  description: "Business description",
  categories: "Primary category",
  hours: "Hours of operation",
  photos: "Photo coverage",
  phone: "Phone number",
  website: "Website link",
  address: "Verified address",
  menu_services: "Menu / services list",
  attributes: "Attributes (Wi-Fi, parking, etc.)",
  qa_coverage: "Q&A coverage",
  business_name: "Business name match",
};

const GRADE_COLORS: Record<GbpAuditSummary["grade"], { fg: string; bg: string }> = {
  A: { fg: "#1e6d3d", bg: "#dfeede" },
  B: { fg: "#5d8a4a", bg: "#e9f0dd" },
  C: { fg: "#a07232", bg: "#f4e4cb" },
  D: { fg: "#a83a2b", bg: "#f4d6cf" },
};

function formatGenerated(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-AE", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function DayOneCard({ pkg }: Props) {
  if (!pkg) return null;
  return (
    <section className="dcp-paper-section">
      <div className="dcp-paper-section-hd">
        <h2 className="dcp-paper-h2">Day-one deliverables</h2>
        <span className="dcp-paper-eyebrow">
          § generated {formatGenerated(pkg.generated_at)}
        </span>
      </div>
      <p
        style={{
          fontSize: 14,
          color: "var(--paper-mut, #837c69)",
          marginBottom: 20,
          maxWidth: 720,
        }}
      >
        Your agent finished onboarding and immediately produced these four
        artifacts. Edit them, ship them, or trash them — they&apos;re
        yours.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <Block
          eyebrow="§ A · the read"
          title="What your agent noticed"
          body={pkg.insight}
        />
        <Block
          eyebrow="§ B · the welcome"
          title="First-customer welcome (WhatsApp)"
          body={pkg.customer_welcome}
        />
        <Block
          eyebrow="§ C · a real reply"
          title="Sample: anniversary booking"
          body={pkg.sample_customer_reply}
          subtitle='Customer asked: "Is the restaurant open tonight? My wife and I want to celebrate our anniversary."'
        />
        {pkg.gbp_audit && <GbpAuditBlock audit={pkg.gbp_audit} />}
        {pkg.faq_gaps && pkg.faq_gaps.length > 0 && (
          <FaqGapsBlock gaps={pkg.faq_gaps} />
        )}
        <SocialBlock posts={pkg.social_posts} />
      </div>
    </section>
  );
}

function FaqGapsBlock({ gaps }: { gaps: FaqGap[] }) {
  return (
    <article
      style={{
        background: "var(--paper-card, #fbfaf4)",
        border: "1px solid var(--paper-line, #d8d2bf)",
        borderRadius: 6,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        gridColumn: "1 / -1",
      }}
    >
      <span
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--paper-mut, #837c69)",
        }}
      >
        § F · the gaps
      </span>
      <h3
        style={{
          fontFamily: "Instrument Serif, serif",
          fontWeight: 400,
          fontSize: 20,
          lineHeight: 1.15,
          color: "var(--paper-ink, #1d1c18)",
          margin: 0,
        }}
      >
        Five customer questions your site doesn&apos;t answer yet
      </h3>
      <p
        style={{
          fontSize: 12,
          color: "var(--paper-mut, #837c69)",
          fontStyle: "italic",
          margin: 0,
          maxWidth: 720,
        }}
      >
        Your AI agent drafted answers based on your brand voice. Approve them to
        teach the agent — or push back if the question is irrelevant.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
          marginTop: 4,
        }}
      >
        {gaps.map((g, i) => (
          <div
            key={i}
            style={{
              background: "var(--paper, #f6f3eb)",
              border: "1px solid var(--paper-line, #d8d2bf)",
              borderRadius: 4,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: "var(--paper-mut, #837c69)",
              }}
            >
              Gap {i + 1}
            </span>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.4,
                color: "var(--paper-ink, #1d1c18)",
                margin: 0,
              }}
            >
              {g.question}
            </p>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                color: "var(--paper-ink, #1d1c18)",
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {g.draft_answer}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function GbpAuditBlock({ audit }: { audit: GbpAuditSummary }) {
  const grade = GRADE_COLORS[audit.grade];
  return (
    <article
      style={{
        background: "var(--paper-card, #fbfaf4)",
        border: "1px solid var(--paper-line, #d8d2bf)",
        borderRadius: 6,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <span
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--paper-mut, #837c69)",
        }}
      >
        § E · the audit
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h3
          style={{
            fontFamily: "Instrument Serif, serif",
            fontWeight: 400,
            fontSize: 20,
            lineHeight: 1.15,
            color: "var(--paper-ink, #1d1c18)",
            margin: 0,
          }}
        >
          Your Google profile score
        </h3>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 4,
            color: grade.fg,
            background: grade.bg,
            letterSpacing: "0.05em",
          }}
        >
          Grade {audit.grade}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          style={{
            fontFamily: "Instrument Serif, serif",
            fontSize: 36,
            lineHeight: 1,
            color: grade.fg,
          }}
        >
          {audit.score}
        </span>
        <span
          style={{
            fontSize: 13,
            color: "var(--paper-mut, #837c69)",
          }}
        >
          / {audit.max_score}
          {!audit.composio_connected && (
            <span style={{ marginLeft: 8, fontStyle: "italic" }}>
              · scored from your website (connect Google for live data)
            </span>
          )}
        </span>
      </div>

      {audit.top_wins.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--paper-mut, #837c69)",
            }}
          >
            top wins — fix these first
          </span>
          {audit.top_wins.map((win, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                background: "var(--paper, #f6f3eb)",
                border: "1px solid var(--paper-line, #d8d2bf)",
                borderRadius: 4,
                padding: 10,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: "var(--paper-mut, #837c69)",
                  whiteSpace: "nowrap",
                  minWidth: 14,
                }}
              >
                {i + 1}.
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--paper-ink, #1d1c18)",
                  }}
                >
                  {FIELD_LABELS[win.field] ?? win.field}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: "var(--paper-ink, #1d1c18)",
                  }}
                >
                  {win.recommendation}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p
          style={{
            fontSize: 13,
            fontStyle: "italic",
            color: "var(--paper-mut, #837c69)",
            margin: 0,
          }}
        >
          Profile looks tight — no critical gaps found.
        </p>
      )}
    </article>
  );
}

function Block({
  eyebrow,
  title,
  body,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  body: string;
  subtitle?: string;
}) {
  return (
    <article
      style={{
        background: "var(--paper-card, #fbfaf4)",
        border: "1px solid var(--paper-line, #d8d2bf)",
        borderRadius: 6,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <span
        style={{
          fontFamily: "var(--mono)",
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
          fontWeight: 400,
          fontSize: 20,
          lineHeight: 1.15,
          color: "var(--paper-ink, #1d1c18)",
          margin: 0,
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
            margin: 0,
            borderLeft: "2px solid var(--paper-line, #d8d2bf)",
            paddingLeft: 8,
          }}
        >
          {subtitle}
        </p>
      )}
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.55,
          color: "var(--paper-ink, #1d1c18)",
          whiteSpace: "pre-wrap",
          margin: 0,
        }}
      >
        {body || (
          <span style={{ color: "var(--paper-mut, #837c69)", fontStyle: "italic" }}>
            (still generating…)
          </span>
        )}
      </p>
    </article>
  );
}

function SocialBlock({ posts }: { posts: string[] }) {
  return (
    <article
      style={{
        background: "var(--paper-card, #fbfaf4)",
        border: "1px solid var(--paper-line, #d8d2bf)",
        borderRadius: 6,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        gridColumn: "1 / -1",
      }}
    >
      <span
        style={{
          fontFamily: "var(--mono)",
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
          fontWeight: 400,
          fontSize: 20,
          lineHeight: 1.15,
          color: "var(--paper-ink, #1d1c18)",
          margin: 0,
        }}
      >
        Three social posts in your voice
      </h3>
      {posts.length === 0 ? (
        <p style={{ color: "var(--paper-mut, #837c69)", fontStyle: "italic" }}>
          (still generating…)
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 4,
          }}
        >
          {posts.map((post, i) => (
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
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: "var(--paper-mut, #837c69)",
                }}
              >
                Post {i + 1}
              </span>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "var(--paper-ink, #1d1c18)",
                  whiteSpace: "pre-wrap",
                  marginTop: 6,
                }}
              >
                {post}
              </p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

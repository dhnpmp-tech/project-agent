// Day-1 deliverables card. Shows what the AI did in the first 60 seconds
// of the tenant's life — the "holy shit, it's already working" moment.
// Server Component — receives the package as a prop from the dashboard.

import type {
  DayOnePackage,
  GbpAuditSummary,
  FaqGap,
  DemoTranscript,
  OwnerBriefPreview,
  IcpLead,
  ReviewMining,
} from "@/lib/server-queries";
import { FaqGapApproveButton } from "./faq-gap-approve-button";

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
        {pkg.owner_brief && pkg.owner_brief.bullets.length >= 3 && (
          <OwnerBriefBlock brief={pkg.owner_brief} />
        )}
        {pkg.demo_transcript && pkg.demo_transcript.turns.length >= 4 && (
          <DemoTranscriptBlock transcript={pkg.demo_transcript} />
        )}
        {pkg.faq_gaps && pkg.faq_gaps.length > 0 && (
          <FaqGapsBlock gaps={pkg.faq_gaps} />
        )}
        {pkg.icp_leads && pkg.icp_leads.length > 0 && (
          <IcpLeadsBlock leads={pkg.icp_leads} />
        )}
        {pkg.review_mining && (
          <ReviewMiningBlock mining={pkg.review_mining} />
        )}
        <SocialBlock posts={pkg.social_posts} />
      </div>
    </section>
  );
}

function ReviewMiningBlock({ mining }: { mining: ReviewMining }) {
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
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--paper-mut, #837c69)",
          }}
        >
          § J · the voice of the customer
        </span>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--paper-mut, #837c69)",
          }}
        >
          · based on {mining.source_count} testimonial{mining.source_count === 1 ? "" : "s"} from your site
        </span>
      </div>
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
        What your existing customers are telling us
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
          marginTop: 4,
        }}
      >
        <div
          style={{
            background: "#eef5e9",
            border: "1px solid #bdd7af",
            borderRadius: 4,
            padding: 14,
          }}
        >
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#1e6d3d",
            }}
          >
            what they love
          </span>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: "var(--paper-ink, #1d1c18)",
              margin: "6px 0 0",
              whiteSpace: "pre-wrap",
            }}
          >
            {mining.top_praise}
          </p>
        </div>
        <div
          style={{
            background: "#fdf3e3",
            border: "1px solid #e6c98b",
            borderRadius: 4,
            padding: 14,
          }}
        >
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#a07232",
            }}
          >
            what to watch
          </span>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: "var(--paper-ink, #1d1c18)",
              margin: "6px 0 0",
              whiteSpace: "pre-wrap",
            }}
          >
            {mining.top_concern}
          </p>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--paper-mut, #837c69)",
          }}
        >
          reusable WhatsApp response templates
        </span>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 10,
            marginTop: 6,
          }}
        >
          {mining.response_templates.map((tpl, i) => (
            <div
              key={i}
              style={{
                background: "var(--paper, #f6f3eb)",
                border: "1px solid var(--paper-line, #d8d2bf)",
                borderRadius: 4,
                padding: 12,
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  margin: 0,
                  color: "var(--paper-ink, #1d1c18)",
                }}
              >
                when: {tpl.trigger}
              </p>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "var(--paper-ink, #1d1c18)",
                  margin: "4px 0 0",
                  whiteSpace: "pre-wrap",
                }}
              >
                {tpl.template}
              </p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function IcpLeadsBlock({ leads }: { leads: IcpLead[] }) {
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
        § I · the prospects
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
        Three accounts your AI SDR would start working today
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
        Each prospect comes with the actual first message your SDR will send.
        Approve them later in the SDR tab — for now, see who&apos;d be on the
        list.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
          marginTop: 4,
        }}
      >
        {leads.map((lead, i) => (
          <div
            key={i}
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
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: "var(--paper-mut, #837c69)",
              }}
            >
              Prospect {i + 1}
            </span>
            <h4
              style={{
                fontFamily: "Instrument Serif, serif",
                fontWeight: 400,
                fontSize: 18,
                lineHeight: 1.2,
                color: "var(--paper-ink, #1d1c18)",
                margin: 0,
              }}
            >
              {lead.name_and_location}
            </h4>
            <p
              style={{
                fontSize: 12,
                lineHeight: 1.5,
                color: "var(--paper-mut, #514c40)",
                fontStyle: "italic",
                margin: 0,
              }}
            >
              {lead.why_it_matches}
            </p>
            <div
              style={{
                background: "#fffef9",
                border: "1px solid var(--paper-line, #d8d2bf)",
                borderRadius: 4,
                padding: 10,
                marginTop: 2,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--paper-mut, #837c69)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                draft first message
              </span>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "var(--paper-ink, #1d1c18)",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {lead.first_message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function OwnerBriefBlock({ brief }: { brief: OwnerBriefPreview }) {
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
        § H · the morning brief
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
        Tomorrow's 9 AM brief on your owner channel
      </h3>
      <p
        style={{
          fontSize: 12,
          color: "var(--paper-mut, #837c69)",
          fontStyle: "italic",
          margin: 0,
        }}
      >
        Every morning your AI Chief of Staff sends one of these to your private
        WhatsApp. Yesterday's recap, today's preview, the one decision you owe.
      </p>

      <div
        style={{
          marginTop: 6,
          padding: 16,
          borderRadius: 8,
          background: "#ebebd9",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            maxWidth: "92%",
            padding: "12px 16px",
            borderRadius: 12,
            borderTopLeftRadius: 4,
            background: "#ffffff",
            border: "1px solid #e0e0d2",
            fontSize: 13.5,
            lineHeight: 1.55,
            color: "var(--paper-ink, #1d1c18)",
            whiteSpace: "pre-wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--paper-mut, #837c69)",
              display: "block",
              marginBottom: 6,
            }}
          >
            agent · owner channel
          </span>
          <p style={{ fontWeight: 500, marginBottom: 8 }}>{brief.greeting}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {brief.bullets.map((b, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontSize: 15, lineHeight: 1.2 }}>{b.emoji}</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{b.label}</span>
                  <span style={{ fontSize: 13, color: "var(--paper-mut, #514c40)" }}>
                    {b.detail}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid #e0e0d2",
              fontStyle: "italic",
            }}
          >
            {brief.decision}
          </p>
          <p
            style={{
              marginTop: 6,
              fontSize: 12.5,
              color: "var(--paper-mut, #837c69)",
            }}
          >
            {brief.closer}
          </p>
        </div>
      </div>
    </article>
  );
}

function DemoTranscriptBlock({ transcript }: { transcript: DemoTranscript }) {
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
        § G · the preview
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
        What your AI actually does, end to end
      </h3>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          marginTop: 4,
          marginBottom: 2,
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: "var(--paper-mut, #837c69)",
            fontStyle: "italic",
            margin: 0,
          }}
        >
          <strong>Scenario:</strong> {transcript.scenario}
        </p>
        <p
          style={{
            fontSize: 12,
            color: "var(--paper-mut, #837c69)",
            fontStyle: "italic",
            margin: 0,
          }}
        >
          <strong>Outcome:</strong> {transcript.resolution}
        </p>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: 14,
          background: "#ebebd9",
          borderRadius: 8,
          marginTop: 6,
        }}
      >
        {transcript.turns.map((turn, i) => {
          const isAgent = turn.speaker === "agent";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: isAgent ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "78%",
                  padding: "8px 12px",
                  borderRadius: 12,
                  borderTopLeftRadius: isAgent ? 12 : 4,
                  borderTopRightRadius: isAgent ? 4 : 12,
                  background: isAgent ? "#dcf8c6" : "#ffffff",
                  border: `1px solid ${isAgent ? "#c4e29c" : "#e0e0d2"}`,
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: "var(--paper-ink, #1d1c18)",
                  whiteSpace: "pre-wrap",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--paper-mut, #837c69)",
                    display: "block",
                    marginBottom: 2,
                  }}
                >
                  {isAgent ? "agent" : "customer"}
                </span>
                {turn.text}
              </div>
            </div>
          );
        })}
      </div>
    </article>
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
              background: g.approved ? "#eef5e9" : "var(--paper, #f6f3eb)",
              border: `1px solid ${g.approved ? "#bdd7af" : "var(--paper-line, #d8d2bf)"}`,
              borderRadius: 4,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              opacity: g.approved ? 0.85 : 1,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: "var(--paper-mut, #837c69)",
                }}
              >
                Gap {i + 1}
              </span>
              {g.approved && (
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#1e6d3d",
                  }}
                >
                  ✓ approved
                </span>
              )}
            </div>
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
            {!g.approved && (
              <FaqGapApproveButton
                question={g.question}
                draftAnswer={g.draft_answer}
              />
            )}
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

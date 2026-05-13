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
}

export interface TeardownPackage {
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
              </div>
            ))}
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

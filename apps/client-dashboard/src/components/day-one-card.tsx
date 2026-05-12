// Day-1 deliverables card. Shows what the AI did in the first 60 seconds
// of the tenant's life — the "holy shit, it's already working" moment.
// Server Component — receives the package as a prop from the dashboard.

import type { DayOnePackage } from "@/lib/server-queries";

interface Props {
  pkg: DayOnePackage | null;
}

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
        <SocialBlock posts={pkg.social_posts} />
      </div>
    </section>
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

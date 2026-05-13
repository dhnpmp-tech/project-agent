// Public teardown page — no auth required, no /app gate logic, just a
// URL input that runs the day-one analysis on any prospect site.
//
// This is the viral acquisition wedge: prospects discover the report
// through Rami's outbound DMs or organic share, see all 4 hooks applied
// to their own business, then click signup. The "$5K-of-consulting for
// free" surface.

"use client";

import { useState } from "react";
import { apiUrl } from "@/lib/api-url";

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

export default function TeardownPage() {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pkg, setPkg] = useState<TeardownPackage | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || pending) return;
    setError(null);
    setPkg(null);
    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/teardown"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(
          data?.detail || data?.error || "Couldn't analyze this site — try a different URL.",
        );
        return;
      }
      setPkg(data.package as TeardownPackage);
    } catch {
      setError("Network error — try again in a moment.");
    } finally {
      setPending(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--paper, #f6f3eb)",
        color: "var(--paper-ink, #1d1c18)",
        padding: "60px 24px 120px",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <header style={{ marginBottom: 32 }}>
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--paper-mut, #837c69)",
            }}
          >
            § agents.dcp.sa · public teardown
          </span>
          <h1
            style={{
              fontFamily: "Instrument Serif, Georgia, serif",
              fontSize: 56,
              fontWeight: 400,
              margin: "10px 0 18px",
              lineHeight: 1.05,
            }}
          >
            See how an AI agent would{" "}
            <em style={{ color: "#2d8e7d" }}>think about your business</em> in 30 seconds.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: "var(--paper-mut, #514c40)" }}>
            Paste any UAE or Saudi SMB website and our agent will produce a free analysis:
            its sharp first impression, three customer questions your site doesn&apos;t answer
            yet, three on-brand Instagram captions, and a sample WhatsApp reply. No signup
            required. ~30 seconds.
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          style={{
            display: "flex",
            gap: 12,
            background: "var(--paper-card, #fbfaf4)",
            padding: 16,
            border: "1px solid var(--paper-line, #d8d2bf)",
            borderRadius: 8,
            marginBottom: 40,
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="your-restaurant.com"
            disabled={pending}
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            style={{
              flex: "1 1 320px",
              minWidth: 0,
              fontSize: 16,
              padding: "12px 14px",
              background: "var(--paper, #f6f3eb)",
              border: "1px solid var(--paper-line, #d8d2bf)",
              borderRadius: 6,
              color: "var(--paper-ink, #1d1c18)",
              fontFamily: "inherit",
            }}
          />
          <button
            type="submit"
            disabled={pending || !url.trim()}
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 13,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "12px 20px",
              background: pending ? "var(--paper-line, #d8d2bf)" : "#1d1c18",
              color: pending ? "var(--paper-mut, #837c69)" : "#fbfaf4",
              border: "1px solid #1d1c18",
              borderRadius: 6,
              cursor: pending ? "wait" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {pending ? "analyzing…" : "Generate teardown"}
          </button>
        </form>

        {error && (
          <div
            style={{
              padding: 14,
              background: "#f4d6cf",
              border: "1px solid #b94a3b",
              borderRadius: 6,
              color: "#7a2620",
              marginBottom: 32,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {pending && !pkg && (
          <div
            style={{
              padding: 40,
              background: "var(--paper-card, #fbfaf4)",
              border: "1px solid var(--paper-line, #d8d2bf)",
              borderRadius: 8,
              textAlign: "center",
              fontFamily: "Instrument Serif, serif",
              fontSize: 20,
              color: "var(--paper-mut, #837c69)",
              lineHeight: 1.4,
            }}
          >
            Crawling the site, then running 4 parallel AI tasks…
            <br />
            <span style={{ fontSize: 13, fontFamily: "var(--mono, ui-monospace)", color: "var(--paper-mut, #837c69)" }}>
              this usually takes 20–60 seconds
            </span>
          </div>
        )}

        {pkg && <TeardownReport pkg={pkg} />}

        {!pending && !pkg && !error && (
          <div
            style={{
              padding: 24,
              background: "var(--paper-card, #fbfaf4)",
              border: "1px dashed var(--paper-line, #d8d2bf)",
              borderRadius: 8,
              fontSize: 14,
              color: "var(--paper-mut, #514c40)",
              lineHeight: 1.55,
            }}
          >
            <strong>How it works.</strong> We crawl your public pages (about, services, FAQ,
            contact, team) and route the content through our inference layer — the same agent
            that runs Saffron Kitchen (Dubai) and Jareed Coffee (Riyadh) in production. The
            report is generated in real time; we don&apos;t cache, sell, or share what we
            find. After the analysis, you can sign up to get a full 10-artifact day-one
            package, an owner WhatsApp channel, and the actual agent on your number.
          </div>
        )}
      </div>
    </main>
  );
}

function TeardownReport({ pkg }: { pkg: TeardownPackage }) {
  return (
    <section
      style={{
        background: "var(--paper-card, #fbfaf4)",
        border: "1px solid var(--paper-line, #d8d2bf)",
        borderRadius: 8,
        padding: 28,
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <span
          style={{
            fontFamily: "var(--mono, ui-monospace)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--paper-mut, #837c69)",
          }}
        >
          § teardown for {pkg.business_name} · {pkg.pages_scanned} page{pkg.pages_scanned === 1 ? "" : "s"} scanned
        </span>
        <h2
          style={{
            fontFamily: "Instrument Serif, Georgia, serif",
            fontSize: 36,
            fontWeight: 400,
            margin: "8px 0 0",
            lineHeight: 1.1,
          }}
        >
          What an AI agent would do with{" "}
          <em style={{ color: "#2d8e7d" }}>{pkg.business_name}</em> on day one.
        </h2>
      </div>

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
          <strong>This is 4 of 10.</strong> The full day-one package (a Google Business Profile audit,
          the owner-channel morning brief, three ICP-matched prospects with draft outbound messages, a
          complete 10-turn WhatsApp demo, and the voice-of-the-customer mining from your reviews) ships
          to your dashboard when you sign up.{" "}
          <a
            href="/app/signup"
            style={{
              color: "#1e6d3d",
              fontWeight: 600,
              textDecoration: "underline",
            }}
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
    <article style={{ marginTop: 28 }}>
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
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.55,
          margin: 0,
          whiteSpace: "pre-wrap",
        }}
      >
        {body}
      </p>
    </article>
  );
}

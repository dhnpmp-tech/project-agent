"use client";

// Index page for the 3 agents-section design previews.

import { SubShell } from "@/components/dcp/sub-shell";

const PREVIEWS = [
  {
    href: "/preview/agents-a",
    code: "A",
    title: "Roles + Constellation",
    pitch: "8 specialists, 3 jobs, one brain.",
    note: "Three labelled columns by job-to-be-done. Constellation header shows they all connect to one brain. Hero card per column + compact rows beneath.",
  },
  {
    href: "/preview/agents-b",
    code: "B",
    title: "Day in the life",
    pitch: "Always on. Always in concert.",
    note: "Horizontal timeline 6am→midnight. Eight color-coded lanes. Dots show when each agent fires through the day.",
  },
  {
    href: "/preview/agents-c",
    code: "C",
    title: "Bento",
    pitch: "One front door. Seven specialists behind it.",
    note: "WhatsApp is the 2×2 hero tile with a sample reply. The other seven sit around it as compact 1×1 tiles, accent-striped by tier.",
  },
];

export default function PreviewAgentsIndex() {
  return (
    <SubShell>
      <section className="section">
        <div className="container">
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: ".16em",
              color: "var(--mut)",
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            Design previews
          </div>
          <h2 className="display-2" style={{ marginBottom: 16 }}>
            <em>Agents section</em> — pick the layout.
          </h2>
          <p
            style={{
              color: "var(--ink-2)",
              fontSize: 15.5,
              lineHeight: 1.55,
              maxWidth: "60ch",
              marginBottom: 28,
            }}
          >
            Three takes on the &quot;8 AI employees&quot; section. Same data, three different
            stories. Open each, then tell me which to ship to the homepage.
          </p>

          <a
            href="/preview/agents-narratives"
            style={{
              display: "block",
              background:
                "color-mix(in oklab, var(--teal) 8%, var(--paper))",
              border: "1px solid var(--teal)",
              borderRadius: 14,
              padding: "26px 28px",
              textDecoration: "none",
              color: "inherit",
              marginBottom: 36,
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: ".18em",
                color: "var(--teal)",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              ★ Latest · Narrative compare (A/B/C on one page)
            </div>
            <h3
              style={{
                fontFamily: "var(--serif)",
                fontSize: 28,
                lineHeight: 1.15,
                margin: "0 0 8px",
              }}
            >
              Three story spines, side by side.
            </h3>
            <p
              style={{
                color: "var(--ink-2)",
                fontSize: 14.5,
                lineHeight: 1.55,
                margin: 0,
                maxWidth: "70ch",
              }}
            >
              Front door · Day in the life · Before / after. New takes that
              start with a real WhatsApp chat as the hero, then frame the
              other 7 agents inside each narrative.
            </p>
            <div
              style={{
                marginTop: 14,
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: ".14em",
                color: "var(--teal)",
                textTransform: "uppercase",
              }}
            >
              Open compare page →
            </div>
          </a>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
            }}
          >
            {PREVIEWS.map((p) => (
              <a
                key={p.code}
                href={p.href}
                style={{
                  display: "block",
                  background: "var(--paper)",
                  border: "1px solid var(--hair)",
                  borderRadius: 12,
                  padding: "26px 22px",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "background 200ms ease",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    letterSpacing: ".16em",
                    color: "var(--teal)",
                    marginBottom: 14,
                  }}
                >
                  PREVIEW · {p.code}
                </div>
                <h3
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: 24,
                    lineHeight: 1.15,
                    margin: "0 0 8px",
                  }}
                >
                  {p.title}
                </h3>
                <p style={{ color: "var(--ink)", fontSize: 14, fontWeight: 600, margin: "0 0 10px" }}>
                  {p.pitch}
                </p>
                <p
                  style={{
                    color: "var(--ink-2)",
                    fontSize: 13,
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {p.note}
                </p>
                <div
                  style={{
                    marginTop: 18,
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    letterSpacing: ".12em",
                    color: "var(--teal)",
                    textTransform: "uppercase",
                  }}
                >
                  Open →
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </SubShell>
  );
}

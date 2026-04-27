"use client";

// Preview B v2 — Day-in-the-life timeline + agent detail strip below.
// Story: 6am to midnight, every agent firing in concert.
// Each lane shows monogram + name + tier; below the timeline, the full
// agent details so users get both the "they collaborate" and "what they
// actually do" stories.

import { SubShell } from "@/components/dcp/sub-shell";
import { AGENTS, type Agent } from "@/lib/agents-data";

function pos(time: string): number {
  const m = time.match(/(\d{2}):(\d{2})/);
  if (!m) return 0;
  const h = parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
  const start = 6;
  const end = 24;
  return Math.max(0, Math.min(1, (h - start) / (end - start)));
}

const HOURS = [6, 9, 12, 15, 18, 21, 24];

const ACCENT_BY_TIER: Record<string, string> = {
  starter: "var(--info)",
  growth: "var(--teal)",
  pro: "var(--orange)",
  enterprise: "var(--err)",
};

function Lane({ a, idx }: { a: Agent; idx: number }) {
  const accent = ACCENT_BY_TIER[a.tier] ?? "var(--teal)";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        alignItems: "stretch",
        borderTop: idx === 0 ? "1px solid var(--hair)" : undefined,
        borderBottom: "1px solid var(--hair)",
        minHeight: 96,
      }}
    >
      <div
        style={{
          padding: "20px 22px",
          borderInlineEnd: "1px solid var(--hair)",
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            flexShrink: 0,
            border: `1px solid ${accent}`,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--mono)",
            fontSize: 13,
            color: accent,
            background: `color-mix(in oklab, ${accent} 8%, transparent)`,
            letterSpacing: ".06em",
          }}
        >
          {a.monogram}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              letterSpacing: ".14em",
              color: "var(--mut)",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {a.code} · {a.tier}
          </div>
          <div
            style={{
              fontFamily: "var(--serif)",
              fontSize: 22,
              lineHeight: 1.15,
            }}
          >
            {a.name}
          </div>
        </div>
      </div>
      <div style={{ position: "relative", padding: "16px 0" }}>
        {a.fires.map((f, i) => {
          const left = pos(f.time) * 100;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `calc(${left}% - 7px)`,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: accent,
                  boxShadow: `0 0 0 5px color-mix(in oklab, ${accent} 22%, transparent)`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 22,
                  top: -10,
                  fontSize: 12.5,
                  lineHeight: 1.45,
                  color: "var(--ink)",
                  whiteSpace: "nowrap",
                  background: "var(--bg)",
                  padding: "5px 10px",
                  border: "1px solid var(--hair)",
                  borderRadius: 6,
                  pointerEvents: "none",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    color: "var(--mut)",
                    marginInlineEnd: 8,
                    fontSize: 11,
                  }}
                >
                  {f.time}
                </span>
                <span>{f.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HourScale() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        background: "var(--bg-2)",
      }}
    >
      <div
        style={{
          padding: "16px 22px",
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: ".16em",
          color: "var(--mut)",
          textTransform: "uppercase",
          borderInlineEnd: "1px solid var(--hair)",
        }}
      >
        Agent · Tier
      </div>
      <div style={{ position: "relative", height: 48 }}>
        {HOURS.map((h) => {
          const left = ((h - 6) / 18) * 100;
          return (
            <div
              key={h}
              style={{
                position: "absolute",
                left: `${left}%`,
                top: 0,
                bottom: 0,
                borderInlineStart: h === 6 ? undefined : "1px dashed var(--hair)",
                paddingInlineStart: 8,
                fontFamily: "var(--mono)",
                fontSize: 11.5,
                color: "var(--mut)",
                display: "flex",
                alignItems: "center",
                letterSpacing: ".05em",
              }}
            >
              {h === 24 ? "00:00" : `${String(h).padStart(2, "0")}:00`}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgentDetail({ a }: { a: Agent }) {
  const accent = ACCENT_BY_TIER[a.tier] ?? "var(--teal)";
  return (
    <article
      style={{
        background: "var(--paper)",
        border: "1px solid var(--hair)",
        borderRadius: 12,
        padding: "26px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <header style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div
          style={{
            width: 44,
            height: 44,
            flexShrink: 0,
            border: `1px solid ${accent}`,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--mono)",
            fontSize: 13,
            color: accent,
            background: `color-mix(in oklab, ${accent} 8%, transparent)`,
            letterSpacing: ".06em",
          }}
        >
          {a.monogram}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              letterSpacing: ".14em",
              color: "var(--mut)",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {a.code} · {a.tier}
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 22, lineHeight: 1.15 }}>
            {a.name}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>
            {a.pitch}
          </div>
        </div>
      </header>
      <p style={{ color: "var(--ink-2)", fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>
        {a.summary}
      </p>
    </article>
  );
}

export default function PreviewAgentsBPage() {
  return (
    <SubShell>
      <section className="section">
        <div className="container">
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: ".18em",
              color: "var(--mut)",
              marginBottom: 12,
              textTransform: "uppercase",
            }}
          >
            Preview B · Day in the life
          </div>
          <h2 className="display-2" style={{ marginBottom: 24, fontSize: 64, lineHeight: 1.02 }}>
            <em>Always on.</em>
            <br /> Always in concert.
          </h2>
          <p
            style={{
              color: "var(--ink-2)",
              fontSize: 18,
              lineHeight: 1.6,
              maxWidth: "62ch",
              marginBottom: 56,
            }}
          >
            One day at Saffron Kitchen. From the 9am brief to the 22:30 last-order rush, every
            agent on the team is firing — and they all share the same memory of every customer who
            walked in, called, or DM&apos;d.
          </p>

          <div style={{ border: "1px solid var(--hair)", borderRadius: 10, overflow: "hidden" }}>
            <HourScale />
            {AGENTS.map((a, i) => (
              <Lane key={a.id} a={a} idx={i} />
            ))}
          </div>

          <div
            style={{
              marginTop: 28,
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: ".12em",
              color: "var(--mut)",
              textTransform: "uppercase",
            }}
          >
            {(["starter", "growth", "pro", "enterprise"] as const).map((t) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: ACCENT_BY_TIER[t],
                  }}
                />
                {t}
              </span>
            ))}
          </div>

          <div style={{ marginTop: 96 }}>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: ".18em",
                color: "var(--mut)",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              The team in detail
            </div>
            <h3
              style={{
                fontFamily: "var(--serif)",
                fontSize: 36,
                lineHeight: 1.05,
                margin: "0 0 32px",
              }}
            >
              What each one actually does.
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 18,
              }}
            >
              {AGENTS.map((a) => (
                <AgentDetail key={a.id} a={a} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </SubShell>
  );
}

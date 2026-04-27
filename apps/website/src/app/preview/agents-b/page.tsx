"use client";

// Preview B — Day-in-the-life timeline.
// Story: from 6am to midnight, all 8 agents are firing in concert.

import { SubShell } from "@/components/dcp/sub-shell";
import { AGENTS, type Agent } from "@/lib/agents-data";

// Map an "hh:mm" or "hh:mm Sun" into a 0-1 position across our 6am→24h span.
function pos(time: string): number {
  const m = time.match(/(\d{2}):(\d{2})/);
  if (!m) return 0;
  const h = parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
  // Span: 6:00 (0%) → 24:00 (100%)
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
        gridTemplateColumns: "200px 1fr",
        alignItems: "center",
        borderTop: idx === 0 ? "1px solid var(--hair)" : undefined,
        borderBottom: "1px solid var(--hair)",
        minHeight: 64,
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderInlineEnd: "1px solid var(--hair)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>{a.glyph}</span>
        <div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9.5,
              letterSpacing: ".12em",
              color: "var(--mut)",
              textTransform: "uppercase",
            }}
          >
            {a.code} · {a.tier}
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 17, lineHeight: 1.15 }}>{a.name}</div>
        </div>
      </div>
      <div style={{ position: "relative", height: 64 }}>
        {a.fires.map((f, i) => {
          const left = pos(f.time) * 100;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `calc(${left}% - 6px)`,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: accent,
                  boxShadow: `0 0 0 4px color-mix(in oklab, ${accent} 22%, transparent)`,
                }}
                title={`${f.time} — ${f.label}`}
              />
              <div
                style={{
                  position: "absolute",
                  left: 18,
                  top: -6,
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: ".06em",
                  color: "var(--ink-2)",
                  whiteSpace: "nowrap",
                  background: "var(--bg)",
                  padding: "2px 6px",
                  border: "1px solid var(--hair)",
                  borderRadius: 4,
                  pointerEvents: "none",
                }}
              >
                <span style={{ color: "var(--mut)" }}>{f.time}</span>{" "}
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
        gridTemplateColumns: "200px 1fr",
        borderTop: "1px solid var(--hair)",
        background: "var(--bg-2)",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          fontFamily: "var(--mono)",
          fontSize: 10.5,
          letterSpacing: ".14em",
          color: "var(--mut)",
          textTransform: "uppercase",
          borderInlineEnd: "1px solid var(--hair)",
        }}
      >
        Agent · Tier
      </div>
      <div style={{ position: "relative", height: 36 }}>
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
                paddingInlineStart: 6,
                fontFamily: "var(--mono)",
                fontSize: 10.5,
                color: "var(--mut)",
                display: "flex",
                alignItems: "center",
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

export default function PreviewAgentsBPage() {
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
            Preview B · Day in the life
          </div>
          <h2 className="display-2" style={{ marginBottom: 18 }}>
            <em>Always on.</em>
            <br /> Always in concert.
          </h2>
          <p
            style={{
              color: "var(--ink-2)",
              fontSize: 15.5,
              lineHeight: 1.55,
              maxWidth: 60 + "ch",
              marginBottom: 36,
            }}
          >
            One day at Saffron Kitchen. From the 9am brief to the 22:30 last-order rush, every
            agent on the team is firing — and they all share the same memory of every customer who
            walked through.
          </p>
          <div style={{ border: "1px solid var(--hair)" }}>
            <HourScale />
            {AGENTS.map((a, i) => (
              <Lane key={a.id} a={a} idx={i} />
            ))}
          </div>
          <div
            style={{
              marginTop: 24,
              display: "flex",
              gap: 18,
              flexWrap: "wrap",
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              letterSpacing: ".1em",
              color: "var(--mut)",
              textTransform: "uppercase",
            }}
          >
            {(["starter", "growth", "pro", "enterprise"] as const).map((t) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
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
        </div>
      </section>
    </SubShell>
  );
}

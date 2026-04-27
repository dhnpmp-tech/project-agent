"use client";

// Preview C — Bento grid.
// Story: WhatsApp is the hero (the gateway). 7 specialists support around it.

import { SubShell } from "@/components/dcp/sub-shell";
import { AGENTS, type Agent } from "@/lib/agents-data";

const HERO_ID = "whatsapp";

const ACCENT_BY_TIER: Record<string, string> = {
  starter: "var(--info)",
  growth: "var(--teal)",
  pro: "var(--orange)",
  enterprise: "var(--err)",
};

function HeroTile({ a }: { a: Agent }) {
  return (
    <div
      style={{
        gridColumn: "span 2",
        gridRow: "span 2",
        background: "var(--paper)",
        border: "1px solid var(--hair)",
        borderRadius: 14,
        padding: "28px 26px",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 90% 10%, color-mix(in oklab, var(--teal) 18%, transparent), transparent 55%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <span style={{ fontSize: 36, lineHeight: 1 }}>{a.glyph}</span>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              letterSpacing: ".14em",
              color: "var(--mut)",
              textTransform: "uppercase",
              border: "1px solid var(--hair)",
              padding: "4px 10px",
              borderRadius: 999,
            }}
          >
            ●  Most used · {a.tier}
          </span>
        </div>
        <h3
          style={{
            fontFamily: "var(--serif)",
            fontSize: 36,
            lineHeight: 1.1,
            margin: "0 0 10px",
          }}
        >
          {a.name}
        </h3>
        <p style={{ color: "var(--ink)", fontSize: 17, fontWeight: 600, margin: "0 0 12px" }}>
          {a.pitch}
        </p>
        <p
          style={{
            color: "var(--ink-2)",
            fontSize: 14,
            lineHeight: 1.6,
            margin: "0 0 18px",
            maxWidth: "44ch",
          }}
        >
          {a.summary}
        </p>
      </div>
      <div
        style={{
          marginTop: "auto",
          background: "var(--bg-2)",
          border: "1px solid var(--hair)",
          borderRadius: 10,
          padding: "14px 16px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: ".14em",
            color: "var(--mut)",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Sample reply
        </div>
        <div style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.55 }}>
          “Welcome back, Mohammed Al-Qahtani 👋 — table 12 by the window, same as last time.
          Booked. Want me to set up your usual (kabsa + tamr hindi)?”
        </div>
      </div>
    </div>
  );
}

function SmallTile({ a }: { a: Agent }) {
  const accent = ACCENT_BY_TIER[a.tier] ?? "var(--teal)";
  return (
    <div
      style={{
        background: "var(--paper)",
        border: "1px solid var(--hair)",
        borderRadius: 12,
        padding: "20px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: accent,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{a.glyph}</span>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9.5,
            letterSpacing: ".12em",
            color: "var(--mut)",
            textTransform: "uppercase",
          }}
        >
          {a.code}
        </span>
      </div>
      <div>
        <div
          style={{
            fontFamily: "var(--serif)",
            fontSize: 18,
            lineHeight: 1.15,
            marginBottom: 4,
          }}
        >
          {a.name}
        </div>
        <div style={{ color: "var(--ink-2)", fontSize: 13, lineHeight: 1.5 }}>{a.pitch}</div>
      </div>
      <div
        style={{
          marginTop: "auto",
          fontFamily: "var(--mono)",
          fontSize: 9.5,
          letterSpacing: ".12em",
          color: "var(--mut)",
          textTransform: "uppercase",
        }}
      >
        {a.tier}
      </div>
    </div>
  );
}

export default function PreviewAgentsCPage() {
  const hero = AGENTS.find((a) => a.id === HERO_ID)!;
  const rest = AGENTS.filter((a) => a.id !== HERO_ID);
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
            Preview C · Bento
          </div>
          <h2 className="display-2" style={{ marginBottom: 18 }}>
            <em>One front door.</em>
            <br /> Seven specialists behind it.
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
            Most customers reach you on WhatsApp. Behind that single front door, seven specialist
            agents handle the rest — sharing the same memory, never asking the customer to repeat
            themselves.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gridAutoRows: "200px",
              gap: 14,
            }}
          >
            <HeroTile a={hero} />
            {rest.map((a) => (
              <SmallTile key={a.id} a={a} />
            ))}
          </div>
        </div>
      </section>
    </SubShell>
  );
}

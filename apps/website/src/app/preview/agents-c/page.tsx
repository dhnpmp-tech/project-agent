"use client";

// Preview C v2 — Bento. WhatsApp is the 2x2 hero with sample reply +
// full description. The other seven are 1x1 tiles with monogram + name +
// pitch + 3-sentence summary + tier strip — no emojis anywhere.

import { SubShell } from "@/components/dcp/sub-shell";
import { AGENTS_EN as AGENTS, type AgentEn as Agent } from "@/lib/agents-data";

const HERO_ID = "whatsapp";

const ACCENT_BY_TIER: Record<string, string> = {
  starter: "var(--info)",
  growth: "var(--teal)",
  pro: "var(--orange)",
  enterprise: "var(--err)",
};

function HeroTile({ a }: { a: Agent }) {
  const accent = ACCENT_BY_TIER[a.tier] ?? "var(--teal)";
  return (
    <div
      style={{
        gridColumn: "span 2",
        gridRow: "span 2",
        background: "var(--paper)",
        border: "1px solid var(--hair)",
        borderRadius: 14,
        padding: "36px 32px",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 95% 5%, color-mix(in oklab, ${accent} 14%, transparent), transparent 55%)`,
          pointerEvents: "none",
        }}
      />
      <header style={{ position: "relative", zIndex: 1, display: "flex", gap: 18, alignItems: "flex-start" }}>
        <div
          style={{
            width: 64,
            height: 64,
            border: `1px solid ${accent}`,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--mono)",
            fontSize: 18,
            color: accent,
            background: `color-mix(in oklab, ${accent} 8%, transparent)`,
            letterSpacing: ".08em",
            flexShrink: 0,
          }}
        >
          {a.monogram}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: ".16em",
              color: "var(--mut)",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            <span>Agent {a.code} · {a.tier}</span>
            <span style={{ color: accent }}>● Most used</span>
          </div>
          <h3
            style={{
              fontFamily: "var(--serif)",
              fontSize: 42,
              lineHeight: 1.05,
              letterSpacing: "-.015em",
              margin: "0 0 8px",
            }}
          >
            {a.name}
          </h3>
          <p style={{ color: "var(--ink)", fontSize: 19, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
            {a.pitch}
          </p>
        </div>
      </header>

      <p
        style={{
          color: "var(--ink-2)",
          fontSize: 15.5,
          lineHeight: 1.65,
          margin: 0,
          position: "relative",
          zIndex: 1,
        }}
      >
        {a.summary}
      </p>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px 28px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {a.bullets.map((b) => (
          <li
            key={b}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              fontSize: 14,
              color: "var(--ink)",
              lineHeight: 1.45,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: accent,
                marginTop: 7,
                flexShrink: 0,
              }}
            />
            {b}
          </li>
        ))}
      </ul>

      <div
        style={{
          marginTop: "auto",
          background: "var(--bg-2)",
          border: "1px solid var(--hair)",
          borderRadius: 10,
          padding: "18px 20px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            letterSpacing: ".16em",
            color: "var(--mut)",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Sample reply, 19:41
        </div>
        <div style={{ fontSize: 15, color: "var(--ink)", lineHeight: 1.55 }}>
          &ldquo;Welcome back, Mohammed Al-Qahtani — table 12 by the window, same as last time.
          Booked. Want me to set up your usual (kabsa + tamr hindi)?&rdquo;
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
        padding: "22px 22px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        position: "relative",
        overflow: "hidden",
        minHeight: 320,
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
      <header style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: `1px solid ${accent}`,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--mono)",
            fontSize: 12,
            color: accent,
            background: `color-mix(in oklab, ${accent} 8%, transparent)`,
            letterSpacing: ".06em",
            flexShrink: 0,
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
          <div style={{ fontFamily: "var(--serif)", fontSize: 20, lineHeight: 1.15 }}>{a.name}</div>
        </div>
      </header>
      <p style={{ color: "var(--ink)", fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
        {a.pitch}
      </p>
      <p style={{ color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>
        {a.summary}
      </p>
      <div
        style={{
          marginTop: "auto",
          paddingTop: 12,
          borderTop: "1px solid var(--hair)",
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: ".14em",
          color: "var(--mut)",
          textTransform: "uppercase",
          display: "flex",
          flexWrap: "wrap",
          gap: "4px 8px",
        }}
      >
        <span style={{ marginInlineEnd: 4 }}>Integrates</span>
        {a.integrates.slice(0, 3).map((tool) => (
          <span key={tool}>{tool}</span>
        ))}
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
              letterSpacing: ".18em",
              color: "var(--mut)",
              marginBottom: 12,
              textTransform: "uppercase",
            }}
          >
            Preview C · Bento
          </div>
          <h2 className="display-2" style={{ marginBottom: 24, fontSize: 64, lineHeight: 1.02 }}>
            <em>One front door.</em>
            <br /> Seven specialists behind it.
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
            Most customers reach you on WhatsApp — that&apos;s the front door. Behind it, seven
            specialist agents handle the rest, sharing the same memory and never asking the
            customer to repeat themselves.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gridAutoRows: "320px",
              gap: 16,
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

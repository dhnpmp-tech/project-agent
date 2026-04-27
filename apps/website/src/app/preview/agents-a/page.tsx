"use client";

// Preview A — Roles columns + constellation header.
// Story: 8 specialists, 3 jobs, one shared brain.

import { SubShell } from "@/components/dcp/sub-shell";
import { AGENTS, ROLE_META, type Agent, type AgentRole } from "@/lib/agents-data";

const ROLES: AgentRole[] = ["customer", "growth", "ops"];

function Constellation() {
  // 8 nodes around a central "brain" node. SVG laid out on a 800×220 canvas.
  const cx = 400;
  const cy = 110;
  const r = 90;
  const nodes = AGENTS.map((a, i) => {
    const angle = (Math.PI * 2 * i) / AGENTS.length - Math.PI / 2;
    return {
      a,
      x: cx + Math.cos(angle) * r * 2.6,
      y: cy + Math.sin(angle) * r * 0.95,
    };
  });
  return (
    <svg
      viewBox="0 0 800 220"
      style={{ width: "100%", maxWidth: 720, height: "auto", display: "block", margin: "0 auto 32px" }}
      role="img"
      aria-label="Eight AI agents connected to one shared brain"
    >
      {nodes.map((n) => (
        <line
          key={"l-" + n.a.id}
          x1={cx}
          y1={cy}
          x2={n.x}
          y2={n.y}
          stroke="var(--hair)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
      ))}
      <circle cx={cx} cy={cy} r={28} fill="var(--paper)" stroke="var(--teal)" strokeWidth="1.5" />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontSize="11"
        fontFamily="var(--mono)"
        fill="var(--teal)"
        letterSpacing="0.12em"
      >
        BRAIN
      </text>
      {nodes.map((n) => (
        <g key={n.a.id}>
          <circle cx={n.x} cy={n.y} r={18} fill="var(--bg)" stroke="var(--hair)" strokeWidth="1" />
          <text
            x={n.x}
            y={n.y + 5}
            textAnchor="middle"
            fontSize="14"
          >
            {n.a.glyph}
          </text>
          <text
            x={n.x}
            y={n.y + 36}
            textAnchor="middle"
            fontSize="9.5"
            fontFamily="var(--mono)"
            fill="var(--mut)"
            letterSpacing="0.08em"
          >
            {n.a.name.toUpperCase()}
          </text>
        </g>
      ))}
    </svg>
  );
}

function HeroCard({ a }: { a: Agent }) {
  return (
    <div
      style={{
        background: "var(--paper)",
        border: "1px solid var(--hair)",
        padding: "24px 22px",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: ".12em",
          color: "var(--mut)",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 22, lineHeight: 1 }}>{a.glyph}</span>
        <span>{a.code} · {a.tier}</span>
      </div>
      <h3 style={{ fontFamily: "var(--serif)", fontSize: 26, lineHeight: 1.15, margin: "0 0 8px" }}>
        {a.name}
      </h3>
      <p style={{ color: "var(--ink)", fontSize: 15, fontWeight: 600, margin: "0 0 10px" }}>
        {a.pitch}
      </p>
      <p style={{ color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>
        {a.summary}
      </p>
    </div>
  );
}

function CompactCard({ a }: { a: Agent }) {
  return (
    <div
      style={{
        background: "transparent",
        borderTop: "1px solid var(--hair)",
        padding: "16px 0",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
      }}
    >
      <div style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{a.glyph}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            letterSpacing: ".12em",
            color: "var(--mut)",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          {a.code} · {a.tier}
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 19, lineHeight: 1.2, marginBottom: 4 }}>
          {a.name}
        </div>
        <div style={{ color: "var(--ink-2)", fontSize: 13, lineHeight: 1.5 }}>{a.pitch}</div>
      </div>
    </div>
  );
}

function Column({ role }: { role: AgentRole }) {
  const meta = ROLE_META[role];
  const agents = AGENTS.filter((a) => a.role === role);
  const [hero, ...rest] = agents;
  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            letterSpacing: ".16em",
            color: meta.accent,
            marginBottom: 6,
          }}
        >
          {meta.label}
        </div>
        <p style={{ color: "var(--mut)", fontSize: 13, margin: 0, lineHeight: 1.5 }}>{meta.sub}</p>
      </div>
      <HeroCard a={hero} />
      <div style={{ marginTop: 8 }}>
        {rest.map((a) => (
          <CompactCard key={a.id} a={a} />
        ))}
      </div>
    </div>
  );
}

export default function PreviewAgentsAPage() {
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
            Preview A · Roles + Constellation
          </div>
          <h2 className="display-2" style={{ marginBottom: 18 }}>
            <em>Eight specialists.</em>
            <br /> Three jobs. One brain.
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
            Not bots with scripts. Personalities with backstories, expertise, and memory that spans
            months. They share the same brain — what your sales rep learns, your content engine
            posts about. What your customers ask, your owner brain hears.
          </p>
          <Constellation />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 32,
              marginTop: 24,
            }}
          >
            {ROLES.map((r) => (
              <Column key={r} role={r} />
            ))}
          </div>
        </div>
      </section>
    </SubShell>
  );
}

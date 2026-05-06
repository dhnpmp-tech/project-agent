"use client";

// Preview A v2 — Roles, vertical sections, big readable cards.
// Story: 8 specialists organized by job-to-be-done. Each card explains
// the agent in full (pitch + 4 sentences + 4 capabilities + integrations).

import { SubShell } from "@/components/dcp/sub-shell";
import {
  AGENTS_EN as AGENTS,
  ROLE_META_EN as ROLE_META,
  type AgentEn as Agent,
  type AgentRole,
} from "@/lib/agents-data";

const ROLES: AgentRole[] = ["customer", "growth", "ops"];

function Monogram({ text, accent }: { text: string; accent: string }) {
  return (
    <div
      style={{
        width: 56,
        height: 56,
        flexShrink: 0,
        border: `1px solid ${accent}`,
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--mono)",
        fontSize: 16,
        letterSpacing: ".08em",
        color: accent,
        background: `color-mix(in oklab, ${accent} 8%, transparent)`,
      }}
    >
      {text}
    </div>
  );
}

function AgentCard({ a, accent }: { a: Agent; accent: string }) {
  return (
    <article
      style={{
        background: "var(--paper)",
        border: "1px solid var(--hair)",
        borderRadius: 14,
        padding: "32px 30px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <header style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
        <Monogram text={a.monogram} accent={accent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: ".16em",
              color: "var(--mut)",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Agent {a.code} · {a.tier}
          </div>
          <h3
            style={{
              fontFamily: "var(--serif)",
              fontSize: 30,
              lineHeight: 1.1,
              letterSpacing: "-.01em",
              margin: "0 0 8px",
            }}
          >
            {a.name}
          </h3>
          <p
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: "var(--ink)",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
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
        }}
      >
        {a.summary}
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
        {a.bullets.map((b) => (
          <li
            key={b}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              fontSize: 14.5,
              color: "var(--ink)",
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: accent,
                marginTop: 8,
                flexShrink: 0,
              }}
            />
            {b}
          </li>
        ))}
      </ul>

      <footer
        style={{
          borderTop: "1px solid var(--hair)",
          paddingTop: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            letterSpacing: ".14em",
            color: "var(--mut)",
            textTransform: "uppercase",
            marginInlineEnd: 6,
          }}
        >
          Integrates with
        </span>
        {a.integrates.map((tool) => (
          <span
            key={tool}
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--ink-2)",
              border: "1px solid var(--hair)",
              padding: "3px 9px",
              borderRadius: 999,
            }}
          >
            {tool}
          </span>
        ))}
      </footer>
    </article>
  );
}

function RoleSection({ role, idx }: { role: AgentRole; idx: number }) {
  const meta = ROLE_META[role];
  const agents = AGENTS.filter((a) => a.role === role);
  return (
    <section style={{ marginTop: idx === 0 ? 0 : 96 }}>
      <header
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 360px) 1fr",
          gap: 48,
          alignItems: "end",
          marginBottom: 32,
          paddingBottom: 24,
          borderBottom: "1px solid var(--hair)",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: ".18em",
              color: meta.accent,
              marginBottom: 12,
            }}
          >
            {String(idx + 1).padStart(2, "0")} · {meta.label}
          </div>
          <h3
            style={{
              fontFamily: "var(--serif)",
              fontSize: 44,
              lineHeight: 1.05,
              letterSpacing: "-.015em",
              margin: 0,
            }}
          >
            {meta.sub}
          </h3>
        </div>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: ".14em",
            color: "var(--mut)",
            textTransform: "uppercase",
            textAlign: "right",
            paddingBottom: 8,
          }}
        >
          {agents.length} agent{agents.length === 1 ? "" : "s"}
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: agents.length === 2 ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
          gap: 20,
        }}
      >
        {agents.map((a) => (
          <AgentCard key={a.id} a={a} accent={meta.accent} />
        ))}
      </div>
    </section>
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
              letterSpacing: ".18em",
              color: "var(--mut)",
              marginBottom: 12,
              textTransform: "uppercase",
            }}
          >
            Preview A · Roles, vertical
          </div>
          <h2
            className="display-2"
            style={{ marginBottom: 24, fontSize: 64, lineHeight: 1.02 }}
          >
            <em>Eight specialists.</em>
            <br /> Three jobs. One brain.
          </h2>
          <p
            style={{
              color: "var(--ink-2)",
              fontSize: 18,
              lineHeight: 1.6,
              maxWidth: "62ch",
              marginBottom: 80,
            }}
          >
            Not bots with scripts. Personalities with backstories, expertise, and memory that
            spans months. They share the same brain — what your sales rep learns, your content
            engine posts about. What your customers ask, your owner brain hears.
          </p>

          {ROLES.map((r, i) => (
            <RoleSection key={r} role={r} idx={i} />
          ))}
        </div>
      </section>
    </SubShell>
  );
}

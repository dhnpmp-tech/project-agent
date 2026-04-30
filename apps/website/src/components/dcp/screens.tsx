"use client";

// Screen primitives for marketing pages.
// Ported from /tmp/dcp-design/assets/screens.jsx
// (WhatsAppThread + OwnerBriefCard + AgentCard).

import { fmtInt, type LangContextValue } from "./lib";
import type { DemoMessage, OwnerBriefItem } from "@/lib/demo-data";
import type { Agent } from "@/lib/agents-data";

type Lang = LangContextValue["lang"];

interface WhatsAppThreadProps {
  thread: DemoMessage[];
  side: "cust" | "ai" | "owner";
  label: string;
  sublabel: string;
  lang: Lang;
}

export function WhatsAppThread({ thread, side, label, sublabel, lang }: WhatsAppThreadProps) {
  return (
    <div className={"wa-thread " + (side === "owner" ? "wa-owner" : "")}>
      <div className="wa-hd">
        <div className="wa-av">{side === "owner" ? "OB" : "DCP"}</div>
        <div className="wa-meta">
          <div className="wa-name">{label}</div>
          <div className="wa-status">
            <span className="d" />
            {sublabel}
          </div>
        </div>
        <div className="wa-net mono">{lang === "ar" ? "مباشر" : "LIVE"}</div>
      </div>
      <div className="wa-body">
        {thread.map((m, i) => (
          <div key={i} className={"wa-msg wa-" + m.side}>
            {m.k && <span className="wa-tag mono">{m.k}</span>}
            <div className="wa-bubble">{m.msg}</div>
            <div className="wa-t mono">{m.t}</div>
          </div>
        ))}
        <div className="wa-typing">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

/* AgentCard — homepage employee tile.
   Ported from /tmp/dcp-design/assets/screens.jsx (lines 38-53).
   The original read a.ar.{name,role,summary} for Arabic; our typed Agent has
   no `ar` sub-object, so we render the canonical English fields in both
   languages (matches what the rest of the homepage already does). */
interface AgentCardProps {
  a: Agent;
}

export function AgentCard({ a }: AgentCardProps) {
  return (
    <div className="agent-card">
      <div className="agent-num mono">§ {a.code}</div>
      <div className="agent-av">{a.monogram || a.name[0]}</div>
      <div className="agent-name">{a.name}</div>
      <div className="agent-role mono">{a.pitch}</div>
      <p className="agent-sum">{a.summary}</p>
      <div className="agent-tier mono">
        <span className={"tier-dot tier-" + a.tier} />
        {a.tier}
      </div>
    </div>
  );
}

interface OwnerBriefCardProps {
  items: OwnerBriefItem[];
  lang: Lang;
}

export function OwnerBriefCard({ items, lang }: OwnerBriefCardProps) {
  const ar = lang === "ar";
  return (
    <div className="surface flush owner-brief">
      <div className="surface-hd">
        <b>{ar ? "العقل المالك" : "Owner brain"}</b>
        <span>
          {ar ? "اليوم" : "TODAY"} · {fmtInt(items.length, lang)}
        </span>
      </div>
      <ul className="brief-list">
        {items.map((it, i) => (
          <li key={i}>
            <span className="brief-t mono">{it.t}</span>
            <span className={"brief-k mono k-" + it.k.toLowerCase()}>{it.k}</span>
            <span className="brief-msg">{it.msg}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

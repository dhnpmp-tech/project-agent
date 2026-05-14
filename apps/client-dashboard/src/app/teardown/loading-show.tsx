// LoadingShow — the in-flight teardown experience.
//
// While the backend runs the actual analysis (20-60s), we show a live-feel
// "agent dashboard": a streaming terminal of inferred actions, an animated
// WhatsApp phone preview, and smooth counters. Cycles through four phases
// (crawl → reviews → draft → score) every ~5.2s. The values are
// representative — the real package replaces this entire panel on success.
//
// Pure React + CSS keyframes, no extra deps. Tree-shakeable. Deterministic
// (state-driven; no Math.random in render).

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ─── Phase data ─── */

type LogKind = "sys" | "ok" | "wait" | "warn";

interface LogLine {
  k: LogKind;
  t: string;
}

interface Bubble {
  side: "in" | "out";
  text: string;
}

interface Phase {
  id: string;
  label: string;
  logs: LogLine[];
  convo: Bubble[];
  showTyping: boolean;
  pages: number;
  reviews: number;
  aiCalls: number;
  tokens: number;
}

function buildPhases(host: string): Phase[] {
  const h = host || "your-site.com";
  return [
    {
      id: "crawl",
      label: "Crawling your public pages",
      logs: [
        { k: "sys", t: `fetching https://${h}/ ...` },
        { k: "ok", t: "/ · 4.2s · 18 KB · 1 form, 3 CTAs detected" },
        { k: "ok", t: "/menu · 47 items · 6 categories" },
        { k: "ok", t: "/about · voice: warm, casual, Dubai-coded" },
        { k: "wait", t: "/faq · parsing 12 Q&As..." },
        { k: "ok", t: "/contact · hours, address, phone extracted" },
      ],
      convo: [],
      showTyping: false,
      pages: 5,
      reviews: 0,
      aiCalls: 0,
      tokens: 0,
    },
    {
      id: "reviews",
      label: "Mining reviews + sentiment",
      logs: [
        { k: "sys", t: "fetching Google Maps reviews..." },
        { k: "ok", t: "847 reviews pulled · ★ 4.6 avg" },
        { k: "sys", t: "classifying sentiment via MiniMax..." },
        { k: "ok", t: "612 positive · 178 neutral · 57 complaints" },
        { k: "sys", t: "drafting owner replies for top 3 complaints..." },
        { k: "ok", t: "replies ready — approve from WhatsApp later" },
      ],
      convo: [{ side: "in", text: "Hi! Table for 4 tonight at 9pm?" }],
      showTyping: false,
      pages: 5,
      reviews: 847,
      aiCalls: 2,
      tokens: 8420,
    },
    {
      id: "draft",
      label: "Drafting your demo conversation",
      logs: [
        { k: "sys", t: "running 4 AI tasks in parallel..." },
        { k: "wait", t: "[1/4] first impressions ▓▓▓▓▓▓▓░░░ 70%" },
        { k: "wait", t: "[2/4] FAQ gap analysis ▓▓▓▓▓▓▓▓░░ 80%" },
        { k: "wait", t: "[3/4] Instagram captions ▓▓▓▓▓░░░░░ 50%" },
        { k: "wait", t: "[4/4] WhatsApp sample reply ▓▓▓▓▓▓▓▓▓░ 92%" },
        { k: "sys", t: "merging outputs..." },
      ],
      convo: [{ side: "in", text: "Hi! Table for 4 tonight at 9pm?" }],
      showTyping: true,
      pages: 5,
      reviews: 847,
      aiCalls: 6,
      tokens: 14920,
    },
    {
      id: "score",
      label: "Scoring + writing your report",
      logs: [
        { k: "ok", t: "all 4 tasks complete · 8.4s wall time" },
        { k: "sys", t: "scoring across 6 axes (0-100)..." },
        { k: "ok", t: "score: 78 · grade: B+" },
        { k: "ok", t: "5 quick wins identified" },
        { k: "ok", t: "3 badges earned · hospitality · vip-tier · niche" },
        { k: "sys", t: "writing to permalink..." },
        { k: "ok", t: "report ready ✨" },
      ],
      convo: [
        { side: "in", text: "Hi! Table for 4 tonight at 9pm?" },
        {
          side: "out",
          text:
            "Welcome back, Ahmed 👋 Table 12 by the window, 9:00 PM, party of 4 — same as last time. Want me to put in your usual (kabsa + tamr hindi)?",
        },
      ],
      showTyping: false,
      pages: 5,
      reviews: 847,
      aiCalls: 12,
      tokens: 24508,
    },
  ];
}

const PREFIX: Record<LogKind, { glyph: string; color: string }> = {
  sys: { glyph: ">", color: "#7b8aa5" },
  ok: { glyph: "✓", color: "#4ade80" },
  wait: { glyph: "⊙", color: "#fbbf24" },
  warn: { glyph: "!", color: "#f97316" },
};

/* ─── Hooks ─── */

function useTickedCounter(target: number, ms = 1200): number {
  const [v, setV] = useState(target);
  const fromRef = useRef(target);
  const t0Ref = useRef(0);
  useEffect(() => {
    fromRef.current = v;
    t0Ref.current = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0Ref.current) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = fromRef.current + (target - fromRef.current) * eased;
      setV(Math.round(next));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Intentionally only react to target — we don't want to chase v.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ms]);
  return v;
}

function useCursorBlink(periodMs = 530): boolean {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setOn((x) => !x), periodMs);
    return () => clearInterval(id);
  }, [periodMs]);
  return on;
}

function useElapsed(): number {
  const [s, setS] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    const id = setInterval(() => {
      setS((performance.now() - t0) / 1000);
    }, 100);
    return () => clearInterval(id);
  }, []);
  return s;
}

/* ─── Component ─── */

export function LoadingShow({ targetUrl }: { targetUrl: string }) {
  const host = useMemo(() => {
    const raw = (targetUrl || "").trim();
    try {
      return new URL(raw.startsWith("http") ? raw : `https://${raw}`).hostname.replace(
        /^www\./,
        "",
      );
    } catch {
      return raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "") || "your-site.com";
    }
  }, [targetUrl]);

  const phases = useMemo(() => buildPhases(host), [host]);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const phase = phases[phaseIdx];

  // Cycle phases.
  useEffect(() => {
    const id = setInterval(() => {
      setPhaseIdx((i) => (i + 1) % phases.length);
    }, 5400);
    return () => clearInterval(id);
  }, [phases.length]);

  // Stream log lines within the active phase.
  const [shownLogs, setShownLogs] = useState(0);
  useEffect(() => {
    setShownLogs(0);
    let i = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const next = () => {
      i += 1;
      setShownLogs(i);
      if (i < phase.logs.length) {
        timers.push(setTimeout(next, 620));
      }
    };
    timers.push(setTimeout(next, 220));
    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [phase.logs.length, phaseIdx]);

  // Stream conversation bubbles within the active phase.
  const [shownBubbles, setShownBubbles] = useState(0);
  useEffect(() => {
    setShownBubbles(0);
    let i = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const next = () => {
      i += 1;
      setShownBubbles(i);
      if (i < phase.convo.length) {
        timers.push(setTimeout(next, 900));
      }
    };
    timers.push(setTimeout(next, 350));
    return () => timers.forEach((t) => clearTimeout(t));
  }, [phase.convo.length, phaseIdx]);

  const pages = useTickedCounter(phase.pages, 900);
  const reviews = useTickedCounter(phase.reviews, 1400);
  const aiCalls = useTickedCounter(phase.aiCalls, 800);
  const tokens = useTickedCounter(phase.tokens, 1400);
  const elapsed = useElapsed();
  const cursorOn = useCursorBlink();

  const visibleLogs = phase.logs.slice(0, shownLogs);
  const visibleBubbles = phase.convo.slice(0, shownBubbles);

  return (
    <div style={SX.root}>
      <style>{KEYFRAMES}</style>

      {/* Header strip */}
      <div style={SX.header}>
        <div style={SX.headerLeft}>
          <span style={SX.liveDot} />
          <span style={SX.liveLabel}>LIVE · agent working</span>
        </div>
        <div style={SX.headerCenter}>{phase.label}</div>
        <div style={SX.headerRight}>
          phase {phaseIdx + 1}/{phases.length} · {elapsed.toFixed(1)}s
        </div>
      </div>

      {/* Two-column body */}
      <div style={SX.body}>
        {/* Terminal */}
        <div style={SX.terminal}>
          <div style={SX.termChrome}>
            <span style={{ ...SX.termDot, background: "#ff5f57" }} />
            <span style={{ ...SX.termDot, background: "#febc2e" }} />
            <span style={{ ...SX.termDot, background: "#28c840" }} />
            <span style={SX.termTitle}>agent · {host}</span>
          </div>
          <div style={SX.termBody}>
            {visibleLogs.map((line, i) => (
              <LogRow key={`${phase.id}-${i}`} line={line} />
            ))}
            <div style={SX.termPrompt}>
              <span style={{ color: "#7b8aa5" }}>$</span>
              <span style={{ ...SX.cursor, opacity: cursorOn ? 1 : 0 }}>▮</span>
            </div>
          </div>
        </div>

        {/* Phone */}
        <div style={SX.phoneWrap}>
          <div style={SX.phone}>
            <div style={SX.notch} />
            <div style={SX.waHeader}>
              <div style={SX.waAvatar}>L</div>
              <div>
                <div style={SX.waName}>Layla · Saffron Kitchen</div>
                <div style={SX.waStatus}>
                  <span style={SX.waStatusDot} /> AI agent · online
                </div>
              </div>
            </div>
            <div style={SX.waBody}>
              {visibleBubbles.map((b, i) => (
                <Bubble key={`${phase.id}-b${i}`} bubble={b} />
              ))}
              {phase.showTyping && visibleBubbles.length >= 1 && <TypingIndicator />}
            </div>
            <div style={SX.waFoot}>
              <div style={SX.waInput}>WhatsApp · end-to-end</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={SX.stats}>
        <Stat label="pages crawled" value={pages.toLocaleString()} unit="/ 5" />
        <Stat label="reviews scanned" value={reviews.toLocaleString()} />
        <Stat label="AI calls" value={aiCalls.toLocaleString()} />
        <Stat label="tokens used" value={tokens.toLocaleString()} />
        <Stat label="elapsed" value={`${elapsed.toFixed(1)}s`} muted />
      </div>

      {/* Progress + small print */}
      <div style={SX.foot}>
        <div style={SX.progressDots}>
          {phases.map((p, i) => (
            <span
              key={p.id}
              style={{
                ...SX.progressDot,
                background: i <= phaseIdx ? "#2d8e7d" : "rgba(255,255,255,0.18)",
                transform: i === phaseIdx ? "scale(1.6)" : "scale(1)",
              }}
            />
          ))}
        </div>
        <div style={SX.smallPrint}>
          live agent dashboard · representative values · your report replaces this on
          completion
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function LogRow({ line }: { line: LogLine }) {
  const p = PREFIX[line.k];
  return (
    <div style={SX.logRow}>
      <span style={{ ...SX.logGlyph, color: p.color }}>{p.glyph}</span>
      <span style={SX.logText}>{line.t}</span>
    </div>
  );
}

function Bubble({ bubble }: { bubble: Bubble }) {
  const isOut = bubble.side === "out";
  return (
    <div style={isOut ? SX.bubbleRowOut : SX.bubbleRowIn}>
      <div style={isOut ? SX.bubbleOut : SX.bubbleIn}>{bubble.text}</div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={SX.bubbleRowOut}>
      <div style={SX.typingBubble}>
        <span style={{ ...SX.typingDot, animationDelay: "0ms" }} />
        <span style={{ ...SX.typingDot, animationDelay: "180ms" }} />
        <span style={{ ...SX.typingDot, animationDelay: "360ms" }} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  muted = false,
}: {
  label: string;
  value: string;
  unit?: string;
  muted?: boolean;
}) {
  return (
    <div style={SX.stat}>
      <div style={{ ...SX.statValue, color: muted ? "#9ca3af" : "#f3f1ea" }}>
        {value}
        {unit && <span style={SX.statUnit}>{unit}</span>}
      </div>
      <div style={SX.statLabel}>{label}</div>
    </div>
  );
}

/* ─── Styles + keyframes ─── */

const MONO =
  "ui-monospace, SFMono-Regular, 'JetBrains Mono', 'IBM Plex Mono', Menlo, Consolas, monospace";
const SERIF = "Instrument Serif, Georgia, serif";

const KEYFRAMES = `
@keyframes ld-fade-up {
  0% { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes ld-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.85); }
}
@keyframes ld-typing {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
  40% { transform: translateY(-4px); opacity: 1; }
}
@keyframes ld-shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
}
`;

const SX: Record<string, React.CSSProperties> = {
  root: {
    background: "linear-gradient(180deg, #15151a 0%, #1a1a22 100%)",
    color: "#f3f1ea",
    borderRadius: 12,
    border: "1px solid #2a2a36",
    padding: 0,
    overflow: "hidden",
    boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
    borderBottom: "1px solid #2a2a36",
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    background: "rgba(0,0,0,0.18)",
    gap: 12,
    flexWrap: "wrap",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 8 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#4ade80",
    animation: "ld-pulse 1.4s ease-in-out infinite",
  },
  liveLabel: { color: "#4ade80", fontWeight: 600 },
  headerCenter: {
    color: "#c9c5bd",
    fontFamily: SERIF,
    fontSize: 14,
    letterSpacing: 0,
    textTransform: "none",
    flex: 1,
    textAlign: "center",
  },
  headerRight: { color: "#7b8aa5", fontVariantNumeric: "tabular-nums" },

  body: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)",
    gap: 0,
  },

  /* terminal */
  terminal: {
    borderRight: "1px solid #2a2a36",
    background: "#0e0e13",
    fontFamily: MONO,
    fontSize: 12.5,
    lineHeight: 1.65,
    display: "flex",
    flexDirection: "column",
    minHeight: 360,
  },
  termChrome: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 14px",
    borderBottom: "1px solid #1f1f29",
    background: "#13131a",
  },
  termDot: { width: 11, height: 11, borderRadius: "50%", display: "inline-block" },
  termTitle: {
    fontFamily: MONO,
    fontSize: 11,
    color: "#7b8aa5",
    marginLeft: 12,
    letterSpacing: "0.04em",
  },
  termBody: {
    padding: "16px 18px 20px",
    flex: 1,
    overflowY: "auto",
  },
  logRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    animation: "ld-fade-up 240ms ease-out both",
  },
  logGlyph: { fontWeight: 600, width: 14, flexShrink: 0 },
  logText: { color: "#d6d4cc", wordBreak: "break-word" },
  termPrompt: {
    display: "flex",
    gap: 8,
    marginTop: 4,
    alignItems: "center",
  },
  cursor: {
    color: "#4ade80",
    transition: "opacity 80ms linear",
  },

  /* phone */
  phoneWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 18px",
    background: "radial-gradient(circle at 50% 0%, rgba(45,142,125,0.08), transparent 60%)",
  },
  phone: {
    width: "100%",
    maxWidth: 280,
    minHeight: 320,
    borderRadius: 24,
    background: "#fdfaf2",
    color: "#0c2018",
    border: "1px solid #2a2a36",
    boxShadow: "0 8px 32px rgba(0,0,0,0.32)",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  notch: {
    position: "absolute",
    top: 8,
    left: "50%",
    transform: "translateX(-50%)",
    width: 56,
    height: 5,
    borderRadius: 999,
    background: "#15151a",
  },
  waHeader: {
    background: "#075e54",
    color: "#fff",
    padding: "22px 14px 12px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  waAvatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#0f4d45",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: SERIF,
    fontSize: 18,
    fontStyle: "italic",
  },
  waName: { fontSize: 13, fontWeight: 600, lineHeight: 1.2 },
  waStatus: {
    fontSize: 10,
    opacity: 0.85,
    display: "flex",
    alignItems: "center",
    gap: 5,
    marginTop: 1,
  },
  waStatusDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#4ade80",
    display: "inline-block",
    animation: "ld-pulse 1.6s ease-in-out infinite",
  },
  waBody: {
    flex: 1,
    background: "#e6dfcf",
    padding: "12px 10px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 12,
    minHeight: 160,
  },
  waFoot: {
    background: "#fdfaf2",
    borderTop: "1px solid #d8d2bf",
    padding: "10px 12px",
  },
  waInput: {
    background: "#fff",
    border: "1px solid #d8d2bf",
    borderRadius: 999,
    padding: "8px 14px",
    fontSize: 11,
    color: "#9ca3af",
    fontFamily: MONO,
  },

  bubbleRowIn: { display: "flex", justifyContent: "flex-start" },
  bubbleRowOut: { display: "flex", justifyContent: "flex-end" },
  bubbleIn: {
    background: "#fff",
    color: "#0c2018",
    padding: "8px 12px",
    borderRadius: "8px 8px 8px 2px",
    maxWidth: "78%",
    boxShadow: "0 1px 1px rgba(0,0,0,0.06)",
    fontSize: 12,
    lineHeight: 1.4,
    animation: "ld-fade-up 320ms ease-out both",
  },
  bubbleOut: {
    background: "#d9fdd3",
    color: "#0c2018",
    padding: "8px 12px",
    borderRadius: "8px 8px 2px 8px",
    maxWidth: "82%",
    boxShadow: "0 1px 1px rgba(0,0,0,0.06)",
    fontSize: 12,
    lineHeight: 1.4,
    animation: "ld-fade-up 360ms ease-out both",
  },
  typingBubble: {
    background: "#fff",
    padding: "10px 14px",
    borderRadius: "8px 8px 8px 2px",
    display: "flex",
    gap: 4,
    alignItems: "center",
    boxShadow: "0 1px 1px rgba(0,0,0,0.06)",
    alignSelf: "flex-start",
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#7b8aa5",
    display: "inline-block",
    animation: "ld-typing 1.2s ease-in-out infinite",
  },

  /* stats */
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 0,
    borderTop: "1px solid #2a2a36",
    background: "rgba(0,0,0,0.18)",
  },
  stat: {
    padding: "16px 18px",
    borderRight: "1px solid #2a2a36",
  },
  statValue: {
    fontFamily: SERIF,
    fontSize: 26,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
  statUnit: {
    fontFamily: MONO,
    fontSize: 11,
    color: "#7b8aa5",
    marginLeft: 4,
  },
  statLabel: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#7b8aa5",
    marginTop: 8,
  },

  /* footer */
  foot: {
    padding: "14px 20px 16px",
    borderTop: "1px solid #2a2a36",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  progressDots: { display: "flex", gap: 10, alignItems: "center" },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    transition: "all 300ms ease",
  },
  smallPrint: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#7b8aa5",
  },
};

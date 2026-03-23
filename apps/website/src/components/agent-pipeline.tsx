"use client";

import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/* ── Agent pipeline data ─────────────────────────────────────── */
const agents = [
  {
    id: "lead",
    label: "Incoming Lead",
    icon: "message",
    color: "#22c55e",
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10 ring-emerald-500/20",
    bubble: "Hi, I saw your ad on Instagram. Do you offer property management for short-term rentals?",
    tag: "WhatsApp",
  },
  {
    id: "qualifier",
    label: "Lead Qualifier",
    icon: "filter",
    color: "#0ea5e9",
    colorClass: "text-sky-400",
    bgClass: "bg-sky-500/10 ring-sky-500/20",
    bubble: "Analyzing intent... Property management inquiry. High-value lead. Portfolio size: checking...",
    tag: "AI Agent",
  },
  {
    id: "responder",
    label: "Smart Responder",
    icon: "reply",
    color: "#8b5cf6",
    colorClass: "text-violet-400",
    bgClass: "bg-violet-500/10 ring-violet-500/20",
    bubble: "Absolutely! We manage 200+ short-term rental units across Dubai. Can I schedule a quick call to discuss your portfolio?",
    tag: "Auto-reply",
  },
  {
    id: "scheduler",
    label: "Appointment Setter",
    icon: "calendar",
    color: "#f59e0b",
    colorClass: "text-amber-400",
    bgClass: "bg-amber-500/10 ring-amber-500/20",
    bubble: "Booking confirmed: Tomorrow, 2:00 PM GST. Calendar invite sent. CRM updated with lead details.",
    tag: "Calendly",
  },
  {
    id: "crm",
    label: "CRM Updater",
    icon: "database",
    color: "#f43f5e",
    colorClass: "text-rose-400",
    bgClass: "bg-rose-500/10 ring-rose-500/20",
    bubble: "Contact created: Ahmed K. — Property Mgmt lead. Stage: Meeting Booked. Source: Instagram Ad.",
    tag: "HubSpot",
  },
];

const outputStats = [
  { label: "Response time", value: "<1s", prev: "~4 hrs" },
  { label: "Leads qualified", value: "94%", prev: "31%" },
  { label: "Meetings booked", value: "3.2x", prev: "baseline" },
  { label: "Cost per lead", value: "-67%", prev: "baseline" },
];

/* ── Icons ───────────────────────────────────────────────────── */
function AgentPipelineIcon({ type, color }: { type: string; color: string }) {
  const p = { stroke: color, strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  switch (type) {
    case "message":
      return <svg viewBox="0 0 18 18" className="w-4 h-4"><path d="M3 4a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H8l-4 3V12H3" {...p} /></svg>;
    case "filter":
      return <svg viewBox="0 0 18 18" className="w-4 h-4"><path d="M2 3h14l-5 6v5l-4 2V9L2 3z" {...p} /></svg>;
    case "reply":
      return <svg viewBox="0 0 18 18" className="w-4 h-4"><path d="M7 5L3 9l4 4" {...p} /><path d="M3 9h8a4 4 0 014 4v1" {...p} /></svg>;
    case "calendar":
      return <svg viewBox="0 0 18 18" className="w-4 h-4"><rect x="2" y="3" width="14" height="13" rx="2" {...p} /><path d="M6 1v4M12 1v4M2 8h14" {...p} /></svg>;
    case "database":
      return <svg viewBox="0 0 18 18" className="w-4 h-4"><ellipse cx="9" cy="5" rx="6" ry="2.5" {...p} /><path d="M3 5v8c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V5" {...p} /><path d="M3 9c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5" {...p} /></svg>;
    default:
      return null;
  }
}

/* ── Single agent node ───────────────────────────────────────── */
function AgentNode({
  agent,
  index,
  progress,
}: {
  agent: (typeof agents)[number];
  index: number;
  progress: number;
}) {
  const isActive = progress > index / agents.length;
  const nodeProgress = Math.max(0, Math.min(1, (progress - index / agents.length) * agents.length));

  // Alternate left/right offset for the angled effect
  const xOffset = index % 2 === 0 ? 0 : 24;

  return (
    <div
      className="relative"
      style={{
        marginLeft: xOffset,
        opacity: isActive ? 1 : 0.15,
        transform: `translateY(${isActive ? 0 : 8}px)`,
        transition: "all 0.6s cubic-bezier(0.32, 0.72, 0, 1)",
      }}
    >
      {/* Connector line to next node */}
      {index < agents.length - 1 && (
        <div className="absolute -bottom-5 left-6 w-px h-5">
          <svg
            className="absolute top-0 left-0 w-16 h-5 overflow-visible"
            viewBox="0 0 64 20"
            fill="none"
          >
            <motion.path
              d={index % 2 === 0 ? "M0 0 L24 20" : "M24 0 L0 20"}
              stroke={agent.color}
              strokeWidth="1.5"
              strokeDasharray="4 3"
              strokeOpacity={isActive ? 0.4 : 0.1}
              style={{ transition: "stroke-opacity 0.6s" }}
            />
            {isActive && (
              <motion.circle
                r="2.5"
                fill={agent.color}
                animate={
                  index % 2 === 0
                    ? { cx: [0, 24], cy: [0, 20], opacity: [0, 1, 1, 0] }
                    : { cx: [24, 0], cy: [0, 20], opacity: [0, 1, 1, 0] }
                }
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 2,
                  ease: "easeInOut",
                }}
              />
            )}
          </svg>
        </div>
      )}

      {/* Chat bubble card */}
      <div
        className={cn(
          "rounded-2xl ring-1 p-3.5 transition-all duration-600 max-w-[280px]",
          isActive ? agent.bgClass : "bg-white/[0.02] ring-white/[0.04]"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: isActive ? `${agent.color}20` : "rgba(255,255,255,0.03)",
              transition: "background-color 0.6s",
            }}
          >
            <AgentPipelineIcon type={agent.icon} color={isActive ? agent.color : "#555"} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-white/90 truncate">{agent.label}</p>
          </div>
          <span
            className="text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ring-1"
            style={{
              color: isActive ? agent.color : "#666",
              backgroundColor: isActive ? `${agent.color}15` : "transparent",
              borderColor: isActive ? `${agent.color}30` : "#333",
              transition: "all 0.6s",
            }}
          >
            {agent.tag}
          </span>
        </div>
        {/* Message */}
        <p
          className="text-[10px] leading-relaxed"
          style={{
            color: isActive ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)",
            transition: "color 0.6s",
          }}
        >
          {agent.bubble}
        </p>

        {/* Typing indicator when becoming active */}
        {nodeProgress > 0 && nodeProgress < 0.5 && (
          <div className="flex gap-0.5 mt-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: agent.color }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Output dashboard ────────────────────────────────────────── */
function OutputDashboard({ progress }: { progress: number }) {
  const isActive = progress > 0.85;

  return (
    <div
      className="mt-3"
      style={{
        opacity: isActive ? 1 : 0.1,
        transform: `translateY(${isActive ? 0 : 12}px) scale(${isActive ? 1 : 0.97})`,
        transition: "all 0.8s cubic-bezier(0.32, 0.72, 0, 1)",
      }}
    >
      {/* Final connector */}
      <div className="flex justify-center mb-3">
        <svg width="2" height="20" viewBox="0 0 2 20">
          <line
            x1="1" y1="0" x2="1" y2="20"
            stroke="#22c55e"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            strokeOpacity={isActive ? 0.5 : 0.1}
          />
        </svg>
      </div>

      {/* Output card */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-500/10 via-surface-900/80 to-violet-500/5 ring-1 ring-brand-500/20 p-4 relative overflow-hidden">
        {/* Glow */}
        {isActive && (
          <motion.div
            className="absolute -top-8 -right-8 w-32 h-32 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(34,197,94,0.2) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        )}

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-md bg-brand-500/20 flex items-center justify-center">
              <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 12V8M5 12V6M8 12V4M11 12V7M14 12V2" />
              </svg>
            </div>
            <p className="text-[11px] font-bold text-white/90">Business Outcome</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {outputStats.map((stat, i) => (
              <div
                key={stat.label}
                className="rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06] p-2"
                style={{
                  opacity: isActive ? 1 : 0,
                  transform: `translateY(${isActive ? 0 : 6}px)`,
                  transition: `all 0.5s cubic-bezier(0.32, 0.72, 0, 1) ${i * 0.1}s`,
                }}
              >
                <p className="text-[9px] text-white/30 font-medium">{stat.label}</p>
                <p className="text-sm font-extrabold text-brand-400 tracking-tight mt-0.5">{stat.value}</p>
                <p className="text-[8px] text-white/20 mt-0.5">was {stat.prev}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main pipeline component ─────────────────────────────────── */
export function AgentPipeline({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Map scroll to a 0–1 progress
  const progress = useTransform(scrollYProgress, [0.1, 0.85], [0, 1]);

  return (
    <div ref={containerRef} className={className}>
      <AgentPipelineInner progressMv={progress} />
    </div>
  );
}

/* Inner component that reads progress */
function AgentPipelineInner({
  progressMv,
}: {
  progressMv: ReturnType<typeof useTransform<number, number>>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-10%" });

  /* Use a state-driven approach to read the MotionValue */
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const unsub = progressMv.on("change", (v: number) => setProgress(v));
    return unsub;
  }, [progressMv]);

  return (
    <div ref={ref} className="relative">
      {/* Title */}
      <div
        className="mb-5"
        style={{
          opacity: inView ? 1 : 0,
          transform: `translateY(${inView ? 0 : 16}px)`,
          transition: "all 0.8s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[9px] uppercase tracking-[0.15em] font-semibold bg-white/5 text-white/40 ring-1 ring-white/10 mb-3">
          <span className="w-1 h-1 rounded-full bg-brand-400 animate-pulse" />
          Live agent flow
        </span>
        <p className="text-xs text-white/30 leading-relaxed max-w-[260px]">
          Watch how your AI agents work together — from first message to business results.
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 rounded-full bg-white/5 mb-5 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 via-sky-500 to-violet-500"
          style={{ width: `${Math.min(100, progress * 100)}%`, transition: "width 0.3s" }}
        />
      </div>

      {/* Agent nodes */}
      <div className="space-y-5">
        {agents.map((agent, i) => (
          <AgentNode key={agent.id} agent={agent} index={i} progress={progress} />
        ))}
      </div>

      {/* Output */}
      <OutputDashboard progress={progress} />
    </div>
  );
}

/* Need React import for useState/useEffect */
import React from "react";

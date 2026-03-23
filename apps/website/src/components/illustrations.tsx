"use client";

import { motion } from "framer-motion";

const spring = { type: "spring" as const, stiffness: 80, damping: 18 };
const smooth = { duration: 0.8, ease: [0.32, 0.72, 0, 1] as const };

/* ── Hero illustration: animated agent network ─────────────── */
export function AgentNetworkSVG({ className }: { className?: string }) {
  const nodes = [
    { x: 200, y: 100, label: "WhatsApp", color: "#22c55e", icon: "chat" },
    { x: 380, y: 60, label: "Sales", color: "#f59e0b", icon: "chart" },
    { x: 340, y: 220, label: "Content", color: "#f43f5e", icon: "pen" },
    { x: 120, y: 260, label: "HR", color: "#0ea5e9", icon: "people" },
    { x: 60, y: 140, label: "Finance", color: "#8b5cf6", icon: "coin" },
  ];
  const center = { x: 220, y: 170 };

  return (
    <svg viewBox="0 0 440 340" fill="none" className={className}>
      <defs>
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>
        {nodes.map((n, i) => (
          <radialGradient key={i} id={`glow-${i}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={n.color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={n.color} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>

      {/* Connection lines with animated dashes */}
      {nodes.map((n, i) => (
        <motion.line
          key={`line-${i}`}
          x1={center.x}
          y1={center.y}
          x2={n.x}
          y2={n.y}
          stroke={n.color}
          strokeWidth="1.5"
          strokeOpacity="0.3"
          strokeDasharray="6 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.3 + i * 0.15, ease: "easeOut" }}
        />
      ))}

      {/* Animated data particles along lines */}
      {nodes.map((n, i) => (
        <motion.circle
          key={`particle-${i}`}
          r="3"
          fill={n.color}
          initial={{ opacity: 0 }}
          animate={{
            cx: [center.x, n.x],
            cy: [center.y, n.y],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 2,
            delay: 1 + i * 0.4,
            repeat: Infinity,
            repeatDelay: 3,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Center hub */}
      <motion.circle
        cx={center.x}
        cy={center.y}
        r="50"
        fill="url(#centerGlow)"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...spring, delay: 0.2 }}
      />
      <motion.circle
        cx={center.x}
        cy={center.y}
        r="28"
        fill="#09090b"
        stroke="#22c55e"
        strokeWidth="2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...spring, delay: 0.3 }}
      />
      <motion.text
        x={center.x}
        y={center.y - 4}
        textAnchor="middle"
        fill="#22c55e"
        fontSize="9"
        fontWeight="700"
        fontFamily="system-ui"
        letterSpacing="0.05em"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        AI CORE
      </motion.text>
      <motion.text
        x={center.x}
        y={center.y + 10}
        textAnchor="middle"
        fill="#22c55e"
        fontSize="7"
        fontFamily="system-ui"
        opacity="0.6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.9 }}
      >
        ORCHESTRATOR
      </motion.text>

      {/* Agent nodes */}
      {nodes.map((n, i) => (
        <motion.g
          key={`node-${i}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...spring, delay: 0.5 + i * 0.12 }}
          style={{ originX: `${n.x}px`, originY: `${n.y}px` }}
        >
          {/* Glow */}
          <circle cx={n.x} cy={n.y} r="30" fill={`url(#glow-${i})`} />
          {/* Node background */}
          <circle cx={n.x} cy={n.y} r="18" fill="#18181b" stroke={n.color} strokeWidth="1.5" />
          {/* Icon */}
          <AgentIcon type={n.icon} x={n.x} y={n.y} color={n.color} />
          {/* Label */}
          <text
            x={n.x}
            y={n.y + 30}
            textAnchor="middle"
            fill="white"
            fontSize="8"
            fontWeight="600"
            fontFamily="system-ui"
            opacity="0.7"
          >
            {n.label}
          </text>
        </motion.g>
      ))}

      {/* Pulsing ring on center */}
      <motion.circle
        cx={center.x}
        cy={center.y}
        r="28"
        fill="none"
        stroke="#22c55e"
        strokeWidth="1"
        initial={{ r: 28, opacity: 0.6 }}
        animate={{ r: 50, opacity: 0 }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
      />
    </svg>
  );
}

function AgentIcon({ type, x, y, color }: { type: string; x: number; y: number; color: string }) {
  const props = { stroke: color, strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

  switch (type) {
    case "chat":
      return (
        <g transform={`translate(${x - 7}, ${y - 7})`}>
          <path d="M2 4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5l-3 3V4z" {...props} />
        </g>
      );
    case "chart":
      return (
        <g transform={`translate(${x - 7}, ${y - 7})`}>
          <path d="M2 12V8M6 12V4M10 12V6M14 12V2" {...props} />
        </g>
      );
    case "pen":
      return (
        <g transform={`translate(${x - 7}, ${y - 7})`}>
          <path d="M2 12L10 4l2 2-8 8H2v-2z" {...props} />
        </g>
      );
    case "people":
      return (
        <g transform={`translate(${x - 7}, ${y - 7})`}>
          <circle cx="5" cy="4" r="2.5" {...props} />
          <path d="M1 12a4 4 0 0 1 8 0" {...props} />
          <circle cx="11" cy="4" r="2" {...props} />
          <path d="M10 12a3 3 0 0 1 4 0" {...props} />
        </g>
      );
    case "coin":
      return (
        <g transform={`translate(${x - 7}, ${y - 7})`}>
          <circle cx="7" cy="7" r="6" {...props} />
          <path d="M7 3v8M5 5h4M5 9h4" {...props} />
        </g>
      );
    default:
      return null;
  }
}

/* ── Workflow step illustration ─────────────────────────────── */
export function WorkflowSVG({ className }: { className?: string }) {
  const steps = [
    { x: 40, label: "Input", color: "#0ea5e9", sublabel: "Customer message" },
    { x: 150, label: "Process", color: "#8b5cf6", sublabel: "AI reasoning" },
    { x: 260, label: "Action", color: "#22c55e", sublabel: "Auto-response" },
    { x: 370, label: "Learn", color: "#f59e0b", sublabel: "Improve over time" },
  ];
  const y = 60;

  return (
    <svg viewBox="0 0 420 130" fill="none" className={className}>
      {/* Connection arrows */}
      {steps.slice(0, -1).map((s, i) => (
        <motion.g key={`arrow-${i}`}>
          <motion.line
            x1={s.x + 32}
            y1={y}
            x2={steps[i + 1].x - 12}
            y2={y}
            stroke="white"
            strokeWidth="1.5"
            strokeOpacity="0.2"
            strokeDasharray="4 3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.3 + i * 0.2 }}
          />
          {/* Animated dot */}
          <motion.circle
            r="2.5"
            fill={steps[i + 1].color}
            animate={{
              cx: [s.x + 32, steps[i + 1].x - 12],
              cy: [y, y],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 1.5,
              delay: 1 + i * 0.6,
              repeat: Infinity,
              repeatDelay: 2.5,
            }}
          />
        </motion.g>
      ))}

      {/* Step nodes */}
      {steps.map((s, i) => (
        <motion.g
          key={`step-${i}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...smooth, delay: 0.1 + i * 0.15 }}
        >
          <circle cx={s.x + 10} cy={y} r="22" fill={s.color} fillOpacity="0.1" />
          <circle cx={s.x + 10} cy={y} r="12" fill="#18181b" stroke={s.color} strokeWidth="1.5" />
          <text x={s.x + 10} y={y + 4} textAnchor="middle" fill={s.color} fontSize="8" fontWeight="700" fontFamily="monospace">
            {String(i + 1).padStart(2, "0")}
          </text>
          <text x={s.x + 10} y={y + 38} textAnchor="middle" fill="white" fontSize="9" fontWeight="600" fontFamily="system-ui">
            {s.label}
          </text>
          <text x={s.x + 10} y={y + 50} textAnchor="middle" fill="white" fillOpacity="0.4" fontSize="7" fontFamily="system-ui">
            {s.sublabel}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}

/* ── Chat mockup for WhatsApp agent ────────────────────────── */
export function ChatMockupSVG({ className }: { className?: string }) {
  const messages = [
    { fromUser: true, text: "Hi, I'd like to book a viewing for the Marina apartment", delay: 0.3 },
    { fromUser: false, text: "Of course! I have availability tomorrow at 2 PM or Thursday at 10 AM. Which works better?", delay: 1.2 },
    { fromUser: true, text: "Tomorrow at 2 PM please", delay: 2.0 },
    { fromUser: false, text: "Done! Booking confirmed for tomorrow at 2 PM. You'll receive a calendar invite shortly.", delay: 2.8 },
  ];

  return (
    <div className={className}>
      <div className="bg-surface-900/80 rounded-2xl border border-white/10 p-4 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 mb-3 border-b border-white/5">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-400" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-white/90">AI Agent</p>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400/80">Online · responds in &lt;1s</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-2.5">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              className={`flex ${m.fromUser ? "justify-end" : "justify-start"}`}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: m.delay }}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed ${
                  m.fromUser
                    ? "bg-emerald-500/20 text-emerald-100 rounded-br-md"
                    : "bg-white/5 text-white/70 rounded-bl-md"
                }`}
              >
                {!m.fromUser && (
                  <motion.span
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ delay: m.delay - 0.3, duration: 0.3 }}
                    className="absolute"
                  >
                    ...
                  </motion.span>
                )}
                {m.text}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Gradient mesh background ──────────────────────────────── */
export function GradientMesh({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <motion.div
        className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)" }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)" }}
        animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, transparent 70%)" }}
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/* ── Integration / brand logos (inline SVG) ───────────────── */
export function WhatsAppLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.963 7.963 0 01-4.1-1.13L4 20l1.13-3.9A7.963 7.963 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
    </svg>
  );
}

export function CalendlyLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14l2 2 4-4" />
    </svg>
  );
}

export function HubSpotLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.5 8.5V6a2 2 0 10-2-2v2.5a4.5 4.5 0 00-2.85 1.56l-5.21-3.4a2.27 2.27 0 10-1.06 1.62l5.21 3.4A4.5 4.5 0 0011 12.5a4.5 4.5 0 00.59 2.22l-1.64 1.64a1.89 1.89 0 101.06 1.06l1.64-1.64A4.5 4.5 0 1017.5 8.5zm-2 7a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
    </svg>
  );
}

export function LinkedInLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

export function InstagramLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}

export function TikTokLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.84a4.83 4.83 0 01-1-.15z"/>
    </svg>
  );
}

export function ZohoLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 15l2-6h4l2 6" />
      <path d="M9 13h6" />
    </svg>
  );
}

export function AirtableLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8l9-4 9 4-9 4-9-4z" />
      <path d="M3 12l9 4 9-4" />
      <path d="M3 16l9 4 9-4" />
    </svg>
  );
}

/* ── Integration logos row (animated) ────────────────────────── */
export function IntegrationLogos({ className }: { className?: string }) {
  const integrations = [
    { name: "WhatsApp", Logo: WhatsAppLogo, color: "text-emerald-400" },
    { name: "LinkedIn", Logo: LinkedInLogo, color: "text-sky-400" },
    { name: "Instagram", Logo: InstagramLogo, color: "text-rose-400" },
    { name: "TikTok", Logo: TikTokLogo, color: "text-white/60" },
    { name: "HubSpot", Logo: HubSpotLogo, color: "text-amber-400" },
    { name: "Calendly", Logo: CalendlyLogo, color: "text-violet-400" },
  ];

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        {integrations.map((item, i) => (
          <motion.div
            key={item.name}
            className="flex flex-col items-center gap-1.5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 * i }}
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center hover:bg-white/10 transition-all duration-300">
              <item.Logo className={`w-5 h-5 ${item.color}`} />
            </div>
            <span className="text-[9px] text-white/30 font-medium">{item.name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Animated grid background ──────────────────────────────── */
export function GridBackground({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      {/* Fade edges */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-transparent to-surface-950" />
    </div>
  );
}

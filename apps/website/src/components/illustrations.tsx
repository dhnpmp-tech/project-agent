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

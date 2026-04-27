// Shared agents catalogue used by homepage + preview routes.
// Mirrors AGENTS in apps/website/src/app/page.tsx; keep in sync.

export type AgentTier = "starter" | "growth" | "pro" | "enterprise";

export type AgentRole = "customer" | "growth" | "ops";

export interface Agent {
  id: string;
  code: string;
  name: string;
  tier: AgentTier;
  role: AgentRole;
  pitch: string;
  summary: string;
  bullets: string[];
  // Time-of-day where this agent typically fires (24h, e.g. 9 = 9am).
  // Used by timeline preview.
  fires: { time: string; label: string }[];
  // Single-glyph icon used by bento + constellation previews.
  glyph: string;
}

export const AGENTS: Agent[] = [
  {
    id: "whatsapp",
    code: "01",
    name: "WhatsApp Agent",
    tier: "starter",
    role: "customer",
    glyph: "💬",
    pitch: "Not a chatbot — a person.",
    summary:
      "A unique AI employee with a real backstory, personality, and voice. She remembers every customer — name, usual order, even their wife's birthday. Texts like a real person: short messages, natural timing.",
    bullets: ["Custom persona + voice", "Cross-conversation memory", "Birthday & sentiment aware"],
    fires: [
      { time: "08:30", label: "Reservation reminders sent" },
      { time: "12:14", label: "26 lunch inquiries handled" },
      { time: "19:41", label: "Mohammed's table booked" },
      { time: "22:30", label: "Late-night orders captured" },
    ],
  },
  {
    id: "owner",
    code: "02",
    name: "Owner Brain",
    tier: "starter",
    role: "growth",
    glyph: "🧠",
    pitch: "Your AI Chief of Staff.",
    summary:
      "Structured 9am brief with variance detection, VIP arrivals, and risk alerts. Drafts review replies for your approval, flags churn risk, tells you what you're missing. Take a photo of today's special — it updates everything.",
    bullets: ["9am morning brief", "Photo-to-knowledge", "Owner-only WhatsApp commands"],
    fires: [
      { time: "09:00", label: "Morning brief delivered" },
      { time: "14:00", label: "Photo of today's special → menu updated" },
      { time: "20:00", label: "VIP arrivals alert" },
    ],
  },
  {
    id: "sales",
    code: "03",
    name: "Sales Rep",
    tier: "starter",
    role: "growth",
    glyph: "🎯",
    pitch: "Never lose a lead to slow follow-up.",
    summary:
      "Scores every lead 1–100 against your ICP. Hot leads get personalized outreach in minutes. Warm leads get nurtured. Cold leads get archived. You only see the ones worth your time.",
    bullets: ["Lead scoring 1–100", "Day-1 / Day-3 / Day-7 nurture", "Win/loss analysis"],
    fires: [
      { time: "10:00", label: "5 new leads scored" },
      { time: "13:30", label: "Day-3 nurture batch sent" },
      { time: "17:00", label: "Hot lead flagged for owner" },
    ],
  },
  {
    id: "content",
    code: "04",
    name: "Content Engine",
    tier: "growth",
    role: "growth",
    glyph: "📸",
    pitch: "Content that posts itself.",
    summary:
      "Weekly content plan for Instagram, LinkedIn, TikTok — bilingual, AI-generated from your brand voice. Owner takes a photo → it becomes a reel, a post, a story. On schedule, on brand, zero effort.",
    bullets: ["3 caption variants per topic", "Ramadan / Eid aware", "Marketplace auto-posting"],
    fires: [
      { time: "07:00", label: "Daily reel published" },
      { time: "15:00", label: "Story posted" },
      { time: "21:00", label: "Tomorrow's posts queued" },
    ],
  },
  {
    id: "hr",
    code: "05",
    name: "HR Screening",
    tier: "pro",
    role: "ops",
    glyph: "📋",
    pitch: "23 CVs in. 4 interviews out.",
    summary:
      "23 CVs arrive. Four minutes later, you see 4 candidates worth interviewing — with scores, strengths, suggested questions. Decline emails sent. Interviews already on your calendar.",
    bullets: ["CV → score in <4 min", "Auto decline emails", "Interview slot booking"],
    fires: [
      { time: "11:00", label: "CV batch screened" },
      { time: "16:00", label: "Interviews scheduled" },
    ],
  },
  {
    id: "finance",
    code: "06",
    name: "Financial Intelligence",
    tier: "enterprise",
    role: "ops",
    glyph: "📊",
    pitch: "Numbers that tell you what to do.",
    summary:
      "Sunday morning: a plain-language report on WhatsApp. Revenue up 12%. Seafood costs spiked 18% — here's a cheaper supplier. Dessert orders dropped — time for a new menu item?",
    bullets: ["Weekly Sunday report", "Cost spike detection", "Menu / SKU suggestions"],
    fires: [
      { time: "06:00 Sun", label: "Weekly report on WhatsApp" },
      { time: "12:00", label: "Cost spike flagged" },
    ],
  },
  {
    id: "voice",
    code: "07",
    name: "Voice Notes",
    tier: "pro",
    role: "customer",
    glyph: "🎙️",
    pitch: "Talk like you talk to a friend.",
    summary:
      "Customers send voice notes — your AI transcribes, understands, and replies with its own voice in Arabic or English. No typing needed. Just talk to your business.",
    bullets: ["AR + EN voice in / out", "Native Gulf Arabic routing", "On every channel"],
    fires: [
      { time: "10:42", label: "Voice note transcribed + replied (Gulf Arabic)" },
      { time: "18:15", label: "Voice booking confirmed" },
    ],
  },
  {
    id: "multi",
    code: "08",
    name: "Multi-Channel",
    tier: "growth",
    role: "customer",
    glyph: "🌐",
    pitch: "One brain. Every channel.",
    summary:
      "WhatsApp, your website, Telegram, Instagram DM. Same personality, same memory, every channel. A customer who messages on Instagram at noon and WhatsApp at night gets one continuous conversation.",
    bullets: ["WhatsApp · Web · Telegram · IG", "Shared customer memory", "Voice on every channel"],
    fires: [
      { time: "12:00", label: "Instagram DM → continued on WhatsApp at 20:00" },
      { time: "20:00", label: "Memory shared across channels" },
    ],
  },
];

export const ROLE_META: Record<AgentRole, { label: string; sub: string; accent: string }> = {
  customer: {
    label: "TALKS TO YOUR CUSTOMERS",
    sub: "Every channel. Same personality. Persistent memory.",
    accent: "var(--teal)",
  },
  growth: {
    label: "GROWS THE BUSINESS",
    sub: "Briefs you. Scores leads. Posts content. While you sleep.",
    accent: "var(--orange)",
  },
  ops: {
    label: "RUNS THE BACK OFFICE",
    sub: "Hiring, finance, decisions — out of your inbox.",
    accent: "var(--info)",
  },
};

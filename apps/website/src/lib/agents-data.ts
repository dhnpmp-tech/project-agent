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
  // Two-letter monogram for icon slots (no emoji).
  monogram: string;
  // What this agent integrates with — anchors the abstract pitch in real tools.
  integrates: string[];
}

export const AGENTS: Agent[] = [
  {
    id: "whatsapp",
    code: "01",
    name: "WhatsApp Agent",
    tier: "starter",
    role: "customer",
    monogram: "WA",
    pitch: "Not a chatbot — a person.",
    summary:
      "A unique AI employee with a real backstory, personality, and voice — generated for your brand on day one. She remembers every customer (name, usual order, last visit, dietary notes), texts like a real person with short messages and natural timing, and never says she's an AI. Handles bookings, FAQ, complaints, and lead qualification on your customer-facing WhatsApp number.",
    bullets: [
      "Persistent customer memory across months",
      "Natural Gulf-aware tone (no robot-speak)",
      "Booking, FAQ, complaints, lead qualification",
      "Sentiment + birthday + churn-risk awareness",
    ],
    integrates: ["WhatsApp Business API", "Kapso", "Google Calendar", "Foodics / SevenRooms"],
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
    monogram: "OB",
    pitch: "Your AI Chief of Staff.",
    summary:
      "Every morning at 9am, a structured McKinsey-style brief lands on your private WhatsApp: situation, complication, key question, recommended action. Variance-detection flags what changed overnight, VIP arrivals get pre-flagged, churn-risk customers get surfaced. You can update everything by replying — take a photo of today's special and it updates the menu, the website, and the agents.",
    bullets: [
      "9am morning brief with variance detection",
      "Photo-to-knowledge: snap → menu + agents updated",
      "Drafts Google review replies for your approval",
      "Flags churn-risk customers before they leave",
    ],
    integrates: ["WhatsApp owner channel", "Google Reviews", "Knowledge base", "Composio tools"],
    fires: [
      { time: "09:00", label: "Morning brief delivered" },
      { time: "14:00", label: "Photo of today's special, menu updated" },
      { time: "20:00", label: "VIP arrivals alert" },
    ],
  },
  {
    id: "sales",
    code: "03",
    name: "Sales Rep",
    tier: "starter",
    role: "growth",
    monogram: "SR",
    pitch: "Never lose a lead to slow follow-up.",
    summary:
      "Scores every inbound lead 1–100 against your ICP within seconds. Hot leads (80+) get a personalized outreach in minutes drawing on their LinkedIn, company news, and stated needs. Warm leads enter a Day-1 / Day-3 / Day-7 nurture cadence. Cold leads get politely archived. Win/loss analysis runs weekly so the scoring model gets sharper.",
    bullets: [
      "ICP-based scoring 1–100 in seconds",
      "Personalized outreach drafted per lead",
      "Day-1 / Day-3 / Day-7 nurture cadence",
      "Weekly win/loss self-improvement",
    ],
    integrates: ["Apollo.io", "HubSpot / Pipedrive", "LinkedIn", "Calendar"],
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
    monogram: "CE",
    pitch: "Content that posts itself.",
    summary:
      "A weekly content plan for Instagram, LinkedIn, and TikTok — bilingual Arabic + English, generated from your brand voice and tuned to local seasons (Ramadan, Eid, National Day, summer travel). Owner takes a photo of today's plate, dish, or storefront — it becomes a reel, a post, and a story automatically. Three caption variants per topic so you pick the one you like.",
    bullets: [
      "Bilingual AR + EN, brand-voice tuned",
      "Photo-to-reel + post + story in one capture",
      "3 caption variants per topic",
      "Ramadan / Eid / National Day awareness",
    ],
    integrates: ["Instagram Graph", "LinkedIn", "TikTok", "Haraj marketplace"],
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
    monogram: "HR",
    pitch: "23 CVs in. 4 interviews out.",
    summary:
      "Twenty-three CVs land in your inbox over the weekend. Four minutes later, you see four candidates worth interviewing — each with a fit score, strengths, weaknesses, and three suggested interview questions. Decline emails for the others have already gone out (in your tone), and the four interviews are already booked into your Google Calendar at slots you actually have free.",
    bullets: [
      "CV → fit score in under four minutes",
      "Auto decline emails in your tone",
      "Interview slot booking on your real calendar",
      "Suggested questions tuned to each candidate",
    ],
    integrates: ["Gmail", "Google Calendar", "LinkedIn", "ATS (Greenhouse / Lever)"],
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
    monogram: "FI",
    pitch: "Numbers that tell you what to do.",
    summary:
      "Sunday morning, before you open the laptop, a plain-language report lands on WhatsApp: revenue up 12% week-on-week, seafood costs spiked 18% (here's a cheaper supplier you've used before), dessert orders dropped 9% (time for a new menu item?). Cost-spike detection runs continuously, so you hear about an issue when you can still fix it — not when the month closes.",
    bullets: [
      "Weekly Sunday report, plain language",
      "Continuous cost-spike detection",
      "Supplier swap suggestions",
      "Menu / SKU performance signals",
    ],
    integrates: ["Foodics POS", "Zoho Books", "Bank feeds", "Inventory systems"],
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
    monogram: "VN",
    pitch: "Talk like you talk to a friend.",
    summary:
      "Half your Gulf customers prefer voice notes to typing — especially older customers and Saudi locals. Voice Notes transcribes incoming voice messages in native Gulf Arabic (or English), understands intent, and replies in its own voice — same persona, same warmth. Works on every channel where voice exists: WhatsApp, Telegram, Instagram DM.",
    bullets: [
      "Native Gulf Arabic understanding",
      "Voice reply in the agent's own voice",
      "Works on WhatsApp, Telegram, Instagram",
      "Same persistent memory as text",
    ],
    integrates: ["WhatsApp voice", "ElevenLabs", "Whisper-large", "Telegram"],
    fires: [
      { time: "10:42", label: "Voice note transcribed and replied in Gulf Arabic" },
      { time: "18:15", label: "Voice booking confirmed" },
    ],
  },
  {
    id: "multi",
    code: "08",
    name: "Multi-Channel",
    tier: "growth",
    role: "customer",
    monogram: "MC",
    pitch: "One brain. Every channel.",
    summary:
      "WhatsApp, your website chat, Telegram, Instagram DM, and SMS — all powered by the same persona, the same memory, the same brain. A customer who DMs you on Instagram at noon and switches to WhatsApp at night gets one continuous conversation, not two strangers. The agent picks up where the last channel left off, even mid-booking.",
    bullets: [
      "WhatsApp · website · Telegram · Instagram · SMS",
      "Shared customer memory across all channels",
      "Voice on every channel that supports it",
      "Channel handoff mid-conversation",
    ],
    integrates: ["WhatsApp", "Web chat widget", "Telegram", "Instagram Graph", "SMS"],
    fires: [
      { time: "12:00", label: "Instagram DM, continued on WhatsApp at 20:00" },
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

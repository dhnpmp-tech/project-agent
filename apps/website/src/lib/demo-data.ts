// Demo page data — mirrors /tmp/dcp-design/assets/data.js demoThread block,
// plus a synthesized DEMO_OWNER stream that the brain "thinks" alongside
// the customer chat. Single source of truth for /demo.

export type ChatSide = "cust" | "ai" | "owner";

export interface DemoMessage {
  side: ChatSide;
  t: string;
  msg: string;
  k?: string;
}

export interface OwnerBriefItem {
  t: string;
  k: string;
  msg: string;
}

// Saudi restaurant booking flow — Mohammed, returning customer.
export const DEMO_THREAD: DemoMessage[] = [
  { side: "cust", t: "19:42", msg: "السلام عليكم، عندكم طاولة لأربعة الليلة الساعة ٩؟" },
  { side: "ai",   t: "19:42", msg: "وعليكم السلام أهلاً 👋 ‎أكيد، الساعة ٩ متاحة. باسم مين أحجز؟" },
  { side: "cust", t: "19:43", msg: "محمد. وأبغى نفس الطاولة اللي قعدنا عليها آخر مرة لو يصير" },
  { side: "ai",   t: "19:43", msg: "تذكّرتك يا محمد — طاولة ١٢ عند النافذة. حجزتها لك. تبغى نفس الطلب أيضاً (كبسة لحم + تمر هندي)؟" },
  { side: "cust", t: "19:44", msg: "تمام، شكراً" },
  { side: "ai",   t: "19:44", msg: "تمّ ✓ راح أبعث تذكير الساعة ٨:٣٠. مساء الخير" },
];

// Owner brain side-stream — appears as the chat unfolds (offset by 2 steps in DemoLab).
export const DEMO_OWNER: OwnerBriefItem[] = [
  { t: "19:43", k: "memory", msg: "Recognized Mohammed — returning customer · visit #4 · prefers table 12" },
  { t: "19:43", k: "lead",   msg: "Booking · party of 4 · 21:00 · table 12 confirmed" },
  { t: "19:44", k: "msg",    msg: "Auto-suggested 'usual' (lamb kabsa + tamr-hindi) — accepted" },
  { t: "19:44", k: "alert",  msg: "Reminder scheduled · WhatsApp · 20:30 · 30-min pre-arrival" },
];

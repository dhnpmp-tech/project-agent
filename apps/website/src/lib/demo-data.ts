// Demo page data — mirrors /tmp/dcp-design/assets/data.js demoThread block,
// plus a synthesized DEMO_OWNER stream that the brain "thinks" alongside
// the customer chat. Single source of truth for /demo.
//
// Bilingual: store en + ar side-by-side, resolve at consumer via
// getDemoThread(lang) / getDemoOwner(lang). Timestamps are localized
// (ASCII digits in EN, Arabic-Indic digits in AR).

export type ChatSide = "cust" | "ai" | "owner";
export type Lang = "en" | "ar";

export interface DemoMessage {
  side: ChatSide;
  t: string;
  msg: string;
  k?: string;
}

export interface OwnerBriefItem {
  t: string;
  // Stable slug used for styling (k-memory, k-lead, k-msg, k-alert).
  k: string;
  // Localized display label for the chip.
  kLabel: string;
  msg: string;
}

interface BiString {
  en: string;
  ar: string;
}

interface BiDemoMessage {
  side: ChatSide;
  t: BiString;
  msg: BiString;
  k?: BiString;
}

interface BiOwnerBriefItem {
  t: BiString;
  k: string;
  kLabel: BiString;
  msg: BiString;
}

// Saudi restaurant booking flow — Mohammed, returning customer.
const THREAD: BiDemoMessage[] = [
  {
    side: "cust",
    t: { en: "19:42", ar: "١٩:٤٢" },
    msg: {
      en: "Salam, do you have a table for 4 tonight at 9?",
      ar: "السلام عليكم، عندكم طاولة لأربعة الليلة الساعة ٩؟",
    },
  },
  {
    side: "ai",
    t: { en: "19:42", ar: "١٩:٤٢" },
    msg: {
      en: "Wa alaykum salam, ahlan 👋 Yes, 9 is open. Whose name is the booking?",
      ar: "وعليكم السلام أهلاً 👋 ‎أكيد، الساعة ٩ متاحة. باسم مين أحجز؟",
    },
  },
  {
    side: "cust",
    t: { en: "19:43", ar: "١٩:٤٣" },
    msg: {
      en: "Mohammed. And same table as last time if possible.",
      ar: "محمد. وأبغى نفس الطاولة اللي قعدنا عليها آخر مرة لو يصير",
    },
  },
  {
    side: "ai",
    t: { en: "19:43", ar: "١٩:٤٣" },
    msg: {
      en: "I remember you, Mohammed — table 12 by the window. Booked it. Same order too (lamb kabsa + tamr-hindi)?",
      ar: "تذكّرتك يا محمد — طاولة ١٢ عند النافذة. حجزتها لك. تبغى نفس الطلب أيضاً (كبسة لحم + تمر هندي)؟",
    },
  },
  {
    side: "cust",
    t: { en: "19:44", ar: "١٩:٤٤" },
    msg: { en: "Yes, thanks", ar: "تمام، شكراً" },
  },
  {
    side: "ai",
    t: { en: "19:44", ar: "١٩:٤٤" },
    msg: {
      en: "Done ✓ I'll send you a reminder at 8:30. Have a good evening.",
      ar: "تمّ ✓ راح أبعث تذكير الساعة ٨:٣٠. مساء الخير",
    },
  },
];

// Owner brain side-stream — appears as the chat unfolds (offset by 2 steps in DemoLab).
const OWNER: BiOwnerBriefItem[] = [
  {
    t: { en: "19:43", ar: "١٩:٤٣" },
    k: "memory",
    kLabel: { en: "memory", ar: "ذاكرة" },
    msg: {
      en: "Recognized Mohammed — returning customer · visit #4 · prefers table 12",
      ar: "تعرّفت على محمد — عميل عائد · زيارة رقم ٤ · يفضّل طاولة ١٢",
    },
  },
  {
    t: { en: "19:43", ar: "١٩:٤٣" },
    k: "lead",
    kLabel: { en: "lead", ar: "حجز" },
    msg: {
      en: "Booking · party of 4 · 21:00 · table 12 confirmed",
      ar: "حجز · مجموعة من ٤ · ٢١:٠٠ · طاولة ١٢ مؤكّدة",
    },
  },
  {
    t: { en: "19:44", ar: "١٩:٤٤" },
    k: "msg",
    kLabel: { en: "msg", ar: "رسالة" },
    msg: {
      en: "Auto-suggested 'usual' (lamb kabsa + tamr-hindi) — accepted",
      ar: "اقترحت تلقائياً «المعتاد» (كبسة لحم + تمر هندي) — قُبل",
    },
  },
  {
    t: { en: "19:44", ar: "١٩:٤٤" },
    k: "alert",
    kLabel: { en: "alert", ar: "تنبيه" },
    msg: {
      en: "Reminder scheduled · WhatsApp · 20:30 · 30-min pre-arrival",
      ar: "تذكير مجدول · واتساب · ٢٠:٣٠ · قبل الوصول بـ ٣٠ دقيقة",
    },
  },
];

export function getDemoThread(lang: Lang): DemoMessage[] {
  return THREAD.map((m) => ({
    side: m.side,
    t: m.t[lang],
    msg: m.msg[lang],
    ...(m.k ? { k: m.k[lang] } : {}),
  }));
}

export function getDemoOwner(lang: Lang): OwnerBriefItem[] {
  return OWNER.map((it) => ({
    t: it.t[lang],
    k: it.k,
    kLabel: it.kLabel[lang],
    msg: it.msg[lang],
  }));
}

// Backward-compat: legacy Arabic-default exports for any consumer that
// hasn't switched to the helpers yet. New code should use getDemoThread /
// getDemoOwner so both languages render correctly.
export const DEMO_THREAD: DemoMessage[] = getDemoThread("ar");
export const DEMO_OWNER: OwnerBriefItem[] = getDemoOwner("en");

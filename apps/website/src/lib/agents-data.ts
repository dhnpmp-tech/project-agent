// Shared agents catalogue used by homepage + preview routes.
// Mirrors AGENTS in apps/website/src/app/page.tsx; keep in sync.

export type AgentTier = "starter" | "growth" | "pro" | "enterprise";

export type AgentRole = "customer" | "growth" | "ops";

export interface BiString {
  en: string;
  ar: string;
}

export interface AgentFire {
  time: string;
  label: BiString;
}

export interface Agent {
  id: string;
  code: string;
  name: BiString;
  tier: AgentTier;
  role: AgentRole;
  pitch: BiString;
  summary: BiString;
  bullets: BiString[];
  // Time-of-day where this agent typically fires (24h, e.g. 9 = 9am).
  // Used by timeline preview.
  fires: AgentFire[];
  // Two-letter monogram for icon slots (no emoji).
  monogram: string;
  // What this agent integrates with — anchors the abstract pitch in real tools.
  integrates: BiString[];
}

export const AGENTS: Agent[] = [
  {
    id: "whatsapp",
    code: "01",
    name: { en: "WhatsApp Agent", ar: "موظف واتساب" },
    tier: "starter",
    role: "customer",
    monogram: "WA",
    pitch: { en: "Not a chatbot — a person.", ar: "ليس روبوت محادثة — شخص حقيقي." },
    summary: {
      en: "A unique AI employee with a real backstory, personality, and voice — generated for your brand on day one. She remembers every customer (name, usual order, last visit, dietary notes), texts like a real person with short messages and natural timing, and never says she's an AI. Handles bookings, FAQ, complaints, and lead qualification on your customer-facing WhatsApp number.",
      ar: "موظف ذكاء اصطناعي بقصة حقيقية وشخصية وصوت — يُصنع لعلامتك من أول يوم. تتذكّر كل عميل (الاسم، الطلب المعتاد، آخر زيارة، الحساسيات)، وتراسل مثل أي شخص حقيقي برسائل قصيرة وتوقيت طبيعي، وما تقول أبداً إنها ذكاء اصطناعي. تتولّى الحجوزات والأسئلة الشائعة والشكاوى وتأهيل العملاء على رقم واتساب الخاص بعملائك.",
    },
    bullets: [
      {
        en: "Persistent customer memory across months",
        ar: "ذاكرة عملاء دائمة تمتدّ لأشهر",
      },
      { en: "Natural Gulf-aware tone (no robot-speak)", ar: "لهجة خليجية طبيعية (بلا كلام آلي)" },
      {
        en: "Booking, FAQ, complaints, lead qualification",
        ar: "حجوزات، أسئلة شائعة، شكاوى، تأهيل عملاء",
      },
      {
        en: "Sentiment + birthday + churn-risk awareness",
        ar: "تتبّع المشاعر وأعياد الميلاد ومخاطر الفقد",
      },
    ],
    integrates: [
      { en: "WhatsApp Business API", ar: "واتساب بزنس API" },
      { en: "Kapso", ar: "Kapso" },
      { en: "Google Calendar", ar: "تقويم قوقل" },
      { en: "Foodics / SevenRooms", ar: "Foodics / SevenRooms" },
    ],
    fires: [
      {
        time: "08:30",
        label: { en: "Reservation reminders sent", ar: "إرسال تذكير الحجوزات" },
      },
      {
        time: "12:14",
        label: { en: "26 lunch inquiries handled", ar: "معالجة ٢٦ استفسار غداء" },
      },
      {
        time: "19:41",
        label: { en: "Mohammed's table booked", ar: "تأكيد طاولة محمد" },
      },
      {
        time: "22:30",
        label: { en: "Late-night orders captured", ar: "استقبال طلبات آخر الليل" },
      },
    ],
  },
  {
    id: "owner",
    code: "02",
    name: { en: "Owner Brain", ar: "عقل المالك" },
    tier: "starter",
    role: "growth",
    monogram: "OB",
    pitch: { en: "Your AI Chief of Staff.", ar: "رئيس مكتبك الذكي." },
    summary: {
      en: "Every morning at 9am, a structured McKinsey-style brief lands on your private WhatsApp: situation, complication, key question, recommended action. Variance-detection flags what changed overnight, VIP arrivals get pre-flagged, churn-risk customers get surfaced. You can update everything by replying — take a photo of today's special and it updates the menu, the website, and the agents.",
      ar: "كل صباح الساعة ٩، يوصل موجز منظّم بأسلوب ماكنزي على واتساب الخاص بك: الوضع، الإشكال، السؤال الرئيسي، الإجراء الموصى به. كشف الانحرافات يبرز اللي تغيّر بالليل، يتم تنبيهك بقدوم VIP، ويتم رصد العملاء المعرّضين للفقد. تقدر تحدّث كل شي برد واحد — صوّر سبيشل اليوم ويتحدّث القائمة والموقع والموظفين الأذكياء.",
    },
    bullets: [
      {
        en: "9am morning brief with variance detection",
        ar: "موجز ٩ صباحاً مع كشف الانحرافات",
      },
      {
        en: "Photo-to-knowledge: snap → menu + agents updated",
        ar: "من صورة لمعرفة: لقطة → تحديث القائمة والموظفين",
      },
      {
        en: "Drafts Google review replies for your approval",
        ar: "يصيغ ردود مراجعات قوقل لموافقتك",
      },
      {
        en: "Flags churn-risk customers before they leave",
        ar: "ينبّه على العملاء المعرّضين للفقد قبل ما يبتعدون",
      },
    ],
    integrates: [
      { en: "WhatsApp owner channel", ar: "قناة واتساب المالك" },
      { en: "Google Reviews", ar: "مراجعات قوقل" },
      { en: "Knowledge base", ar: "قاعدة المعرفة" },
      { en: "Composio tools", ar: "أدوات Composio" },
    ],
    fires: [
      { time: "09:00", label: { en: "Morning brief delivered", ar: "تسليم موجز الصباح" } },
      {
        time: "14:00",
        label: { en: "Photo of today's special, menu updated", ar: "صورة سبيشل اليوم، تحديث القائمة" },
      },
      { time: "20:00", label: { en: "VIP arrivals alert", ar: "تنبيه قدوم VIP" } },
    ],
  },
  {
    id: "sales",
    code: "03",
    name: { en: "Sales Rep", ar: "مندوب المبيعات" },
    tier: "starter",
    role: "growth",
    monogram: "SR",
    pitch: {
      en: "Never lose a lead to slow follow-up.",
      ar: "ما تخسر عميل بسبب متابعة بطيئة.",
    },
    summary: {
      en: "Scores every inbound lead 1–100 against your ICP within seconds. Hot leads (80+) get a personalized outreach in minutes drawing on their LinkedIn, company news, and stated needs. Warm leads enter a Day-1 / Day-3 / Day-7 nurture cadence. Cold leads get politely archived. Win/loss analysis runs weekly so the scoring model gets sharper.",
      ar: "يقيّم كل عميل وارد من ١ إلى ١٠٠ مقارنةً بـ ICP خلال ثوانٍ. العملاء الحارّون (٨٠+) يحصلون على تواصل مخصّص خلال دقائق بناءً على LinkedIn وأخبار شركتهم واحتياجاتهم. الفاترين يدخلون مسار رعاية يوم-١ / ٣ / ٧. الباردين يُؤرشَفون بأدب. تحليل الفوز والخسارة يجري أسبوعياً ليصبح التقييم أدقّ.",
    },
    bullets: [
      { en: "ICP-based scoring 1–100 in seconds", ar: "تقييم ICP من ١ إلى ١٠٠ في ثوانٍ" },
      { en: "Personalized outreach drafted per lead", ar: "صياغة رسالة مخصّصة لكل عميل" },
      {
        en: "Day-1 / Day-3 / Day-7 nurture cadence",
        ar: "مسار رعاية يوم-١ / يوم-٣ / يوم-٧",
      },
      { en: "Weekly win/loss self-improvement", ar: "تحسين ذاتي أسبوعي بالفوز/الخسارة" },
    ],
    integrates: [
      { en: "Apollo.io", ar: "Apollo.io" },
      { en: "HubSpot / Pipedrive", ar: "HubSpot / Pipedrive" },
      { en: "LinkedIn", ar: "LinkedIn" },
      { en: "Calendar", ar: "التقويم" },
    ],
    fires: [
      { time: "10:00", label: { en: "5 new leads scored", ar: "تقييم ٥ عملاء جدد" } },
      { time: "13:30", label: { en: "Day-3 nurture batch sent", ar: "إرسال دفعة رعاية يوم-٣" } },
      { time: "17:00", label: { en: "Hot lead flagged for owner", ar: "تنبيه المالك بعميل حارّ" } },
    ],
  },
  {
    id: "content",
    code: "04",
    name: { en: "Content Engine", ar: "محرّك المحتوى" },
    tier: "growth",
    role: "growth",
    monogram: "CE",
    pitch: { en: "Content that posts itself.", ar: "محتوى ينشر نفسه." },
    summary: {
      en: "A weekly content plan for Instagram, LinkedIn, and TikTok — bilingual Arabic + English, generated from your brand voice and tuned to local seasons (Ramadan, Eid, National Day, summer travel). Owner takes a photo of today's plate, dish, or storefront — it becomes a reel, a post, and a story automatically. Three caption variants per topic so you pick the one you like.",
      ar: "خطة محتوى أسبوعية لإنستغرام و LinkedIn و TikTok — ثنائية اللغة عربي/إنجليزي، تُولَّد من صوت علامتك ومتوافقة مع المواسم المحليّة (رمضان، العيد، اليوم الوطني، سفر الصيف). المالك يصوّر طبق اليوم أو واجهة المحل — يصير ريل وبوست وستوري تلقائياً. ثلاثة خيارات لكل تعليق وتختار اللي يعجبك.",
    },
    bullets: [
      { en: "Bilingual AR + EN, brand-voice tuned", ar: "ثنائي اللغة، مضبوط على صوت علامتك" },
      {
        en: "Photo-to-reel + post + story in one capture",
        ar: "من صورة لريل وبوست وستوري بضغطة وحدة",
      },
      { en: "3 caption variants per topic", ar: "٣ خيارات تعليق لكل موضوع" },
      {
        en: "Ramadan / Eid / National Day awareness",
        ar: "وعي بمواسم رمضان والعيد واليوم الوطني",
      },
    ],
    integrates: [
      { en: "Instagram Graph", ar: "Instagram Graph" },
      { en: "LinkedIn", ar: "LinkedIn" },
      { en: "TikTok", ar: "TikTok" },
      { en: "Haraj marketplace", ar: "حراج" },
    ],
    fires: [
      { time: "07:00", label: { en: "Daily reel published", ar: "نشر ريل اليوم" } },
      { time: "15:00", label: { en: "Story posted", ar: "نشر ستوري" } },
      { time: "21:00", label: { en: "Tomorrow's posts queued", ar: "جدولة بوستات الغد" } },
    ],
  },
  {
    id: "hr",
    code: "05",
    name: { en: "HR Screening", ar: "فرز التوظيف" },
    tier: "pro",
    role: "ops",
    monogram: "HR",
    pitch: { en: "23 CVs in. 4 interviews out.", ar: "٢٣ سيرة ذاتية. ٤ مقابلات." },
    summary: {
      en: "Twenty-three CVs land in your inbox over the weekend. Four minutes later, you see four candidates worth interviewing — each with a fit score, strengths, weaknesses, and three suggested interview questions. Decline emails for the others have already gone out (in your tone), and the four interviews are already booked into your Google Calendar at slots you actually have free.",
      ar: "ثلاث وعشرون سيرة ذاتية تصل في عطلة الأسبوع. بعد أربع دقائق ترى أربعة مرشحين يستحقّون المقابلة — لكل واحد درجة ملاءمة ونقاط قوة وضعف وثلاثة أسئلة مقترحة. رسائل الاعتذار للباقين أُرسلت (بأسلوبك)، والمقابلات الأربع محجوزة في تقويم قوقل في أوقات فعلاً متاحة عندك.",
    },
    bullets: [
      { en: "CV → fit score in under four minutes", ar: "من سيرة لتقييم في أقلّ من ٤ دقائق" },
      { en: "Auto decline emails in your tone", ar: "رسائل اعتذار تلقائية بأسلوبك" },
      {
        en: "Interview slot booking on your real calendar",
        ar: "حجز مقابلات على تقويمك الفعلي",
      },
      {
        en: "Suggested questions tuned to each candidate",
        ar: "أسئلة مقترحة مخصّصة لكل مرشّح",
      },
    ],
    integrates: [
      { en: "Gmail", ar: "Gmail" },
      { en: "Google Calendar", ar: "تقويم قوقل" },
      { en: "LinkedIn", ar: "LinkedIn" },
      { en: "ATS (Greenhouse / Lever)", ar: "أنظمة ATS (Greenhouse / Lever)" },
    ],
    fires: [
      { time: "11:00", label: { en: "CV batch screened", ar: "فرز دفعة السير الذاتية" } },
      { time: "16:00", label: { en: "Interviews scheduled", ar: "جدولة المقابلات" } },
    ],
  },
  {
    id: "finance",
    code: "06",
    name: { en: "Financial Intelligence", ar: "الذكاء المالي" },
    tier: "enterprise",
    role: "ops",
    monogram: "FI",
    pitch: {
      en: "Numbers that tell you what to do.",
      ar: "أرقام تقول لك إيش تسوّي.",
    },
    summary: {
      en: "Sunday morning, before you open the laptop, a plain-language report lands on WhatsApp: revenue up 12% week-on-week, seafood costs spiked 18% (here's a cheaper supplier you've used before), dessert orders dropped 9% (time for a new menu item?). Cost-spike detection runs continuously, so you hear about an issue when you can still fix it — not when the month closes.",
      ar: "صباح الأحد، قبل ما تفتح اللابتوب، يوصل تقرير بلغة بسيطة على واتساب: الإيرادات صاعدة ١٢٪ أسبوعياً، تكاليف الأسماك ارتفعت ١٨٪ (وهذا مورّد أرخص استخدمته قبل)، طلبات الحلا نزلت ٩٪ (وقت تضيف صنف جديد؟). كشف ارتفاع التكاليف يشتغل باستمرار، فتسمع عن المشكلة وأنت تقدر تحلّها — مو لمّا يقفل الشهر.",
    },
    bullets: [
      { en: "Weekly Sunday report, plain language", ar: "تقرير أحد أسبوعي بلغة بسيطة" },
      { en: "Continuous cost-spike detection", ar: "كشف مستمر لارتفاع التكاليف" },
      { en: "Supplier swap suggestions", ar: "اقتراحات تبديل المورّدين" },
      { en: "Menu / SKU performance signals", ar: "إشارات أداء الأصناف / SKU" },
    ],
    integrates: [
      { en: "Foodics POS", ar: "Foodics POS" },
      { en: "Zoho Books", ar: "Zoho Books" },
      { en: "Bank feeds", ar: "حسابات البنك" },
      { en: "Inventory systems", ar: "أنظمة المخزون" },
    ],
    fires: [
      {
        time: "06:00 Sun",
        label: { en: "Weekly report on WhatsApp", ar: "تقرير أسبوعي على واتساب" },
      },
      { time: "12:00", label: { en: "Cost spike flagged", ar: "تنبيه ارتفاع تكلفة" } },
    ],
  },
  {
    id: "voice",
    code: "07",
    name: { en: "Voice Notes", ar: "الرسائل الصوتية" },
    tier: "pro",
    role: "customer",
    monogram: "VN",
    pitch: { en: "Talk like you talk to a friend.", ar: "تكلّم مثل ما تكلّم صاحبك." },
    summary: {
      en: "Half your Gulf customers prefer voice notes to typing — especially older customers and Saudi locals. Voice Notes transcribes incoming voice messages in native Gulf Arabic (or English), understands intent, and replies in its own voice — same persona, same warmth. Works on every channel where voice exists: WhatsApp, Telegram, Instagram DM.",
      ar: "نصف عملائك في الخليج يفضّلون الصوتيات على الكتابة — خاصةً الأكبر سناً والمواطنين السعوديين. هذا الموظف يفرّغ الصوتيات الواردة بالعربية الخليجية الأصلية (أو الإنجليزية)، يفهم القصد، ويردّ بصوته الخاص — نفس الشخصية، نفس الدفء. يشتغل على كل قناة فيها صوت: واتساب، تيليغرام، رسائل إنستغرام.",
    },
    bullets: [
      { en: "Native Gulf Arabic understanding", ar: "فهم خليجي أصيل" },
      { en: "Voice reply in the agent's own voice", ar: "ردّ صوتي بصوت الموظف نفسه" },
      { en: "Works on WhatsApp, Telegram, Instagram", ar: "يشتغل على واتساب وتيليغرام وإنستغرام" },
      { en: "Same persistent memory as text", ar: "نفس الذاكرة الدائمة مثل النص" },
    ],
    integrates: [
      { en: "WhatsApp voice", ar: "صوتيات واتساب" },
      { en: "ElevenLabs", ar: "ElevenLabs" },
      { en: "Whisper-large", ar: "Whisper-large" },
      { en: "Telegram", ar: "Telegram" },
    ],
    fires: [
      {
        time: "10:42",
        label: {
          en: "Voice note transcribed and replied in Gulf Arabic",
          ar: "تفريغ صوتي والردّ بالخليجية",
        },
      },
      { time: "18:15", label: { en: "Voice booking confirmed", ar: "تأكيد حجز صوتي" } },
    ],
  },
  {
    id: "multi",
    code: "08",
    name: { en: "Multi-Channel", ar: "متعدّد القنوات" },
    tier: "growth",
    role: "customer",
    monogram: "MC",
    pitch: { en: "One brain. Every channel.", ar: "عقل واحد. كل القنوات." },
    summary: {
      en: "WhatsApp, your website chat, Telegram, Instagram DM, and SMS — all powered by the same persona, the same memory, the same brain. A customer who DMs you on Instagram at noon and switches to WhatsApp at night gets one continuous conversation, not two strangers. The agent picks up where the last channel left off, even mid-booking.",
      ar: "واتساب، دردشة موقعك، تيليغرام، رسائل إنستغرام، و SMS — كلها مدعومة بنفس الشخصية ونفس الذاكرة ونفس العقل. العميل اللي يراسلك على إنستغرام الظهر وينتقل لواتساب الليل يحصل على محادثة وحدة متواصلة، مو غريبَين مختلفَين. الموظف يكمّل من النقطة اللي وقفت عندها القناة السابقة، حتى لو كنت في منتصف الحجز.",
    },
    bullets: [
      {
        en: "WhatsApp · website · Telegram · Instagram · SMS",
        ar: "واتساب · الموقع · تيليغرام · إنستغرام · SMS",
      },
      {
        en: "Shared customer memory across all channels",
        ar: "ذاكرة عملاء مشتركة عبر كل القنوات",
      },
      {
        en: "Voice on every channel that supports it",
        ar: "صوت على كل قناة تدعم الصوت",
      },
      { en: "Channel handoff mid-conversation", ar: "تسليم بين القنوات وسط المحادثة" },
    ],
    integrates: [
      { en: "WhatsApp", ar: "واتساب" },
      { en: "Web chat widget", ar: "ودجت دردشة الموقع" },
      { en: "Telegram", ar: "تيليغرام" },
      { en: "Instagram Graph", ar: "Instagram Graph" },
      { en: "SMS", ar: "SMS" },
    ],
    fires: [
      {
        time: "12:00",
        label: {
          en: "Instagram DM, continued on WhatsApp at 20:00",
          ar: "رسالة إنستغرام، تكمل على واتساب الساعة ٢٠:٠٠",
        },
      },
      { time: "20:00", label: { en: "Memory shared across channels", ar: "ذاكرة مشتركة بين القنوات" } },
    ],
  },
];

// English-only flattened views for legacy preview routes that don't speak
// the bilingual schema. Keep these as derivatives — single source of truth
// remains the bilingual AGENTS / ROLE_META above.
export interface AgentEn
  extends Omit<Agent, "name" | "pitch" | "summary" | "bullets" | "integrates" | "fires"> {
  name: string;
  pitch: string;
  summary: string;
  bullets: string[];
  integrates: string[];
  fires: { time: string; label: string }[];
}

export const AGENTS_EN: AgentEn[] = AGENTS.map((a) => ({
  ...a,
  name: a.name.en,
  pitch: a.pitch.en,
  summary: a.summary.en,
  bullets: a.bullets.map((b) => b.en),
  integrates: a.integrates.map((i) => i.en),
  fires: a.fires.map((f) => ({ time: f.time, label: f.label.en })),
}));

export const ROLE_META: Record<AgentRole, { label: BiString; sub: BiString; accent: string }> = {
  customer: {
    label: { en: "TALKS TO YOUR CUSTOMERS", ar: "يتحدّث مع عملائك" },
    sub: {
      en: "Every channel. Same personality. Persistent memory.",
      ar: "كل القنوات. نفس الشخصية. ذاكرة دائمة.",
    },
    accent: "var(--teal)",
  },
  growth: {
    label: { en: "GROWS THE BUSINESS", ar: "ينمّي الأعمال" },
    sub: {
      en: "Briefs you. Scores leads. Posts content. While you sleep.",
      ar: "يلخّص لك. يقيّم العملاء. ينشر المحتوى. وأنت نايم.",
    },
    accent: "var(--orange)",
  },
  ops: {
    label: { en: "RUNS THE BACK OFFICE", ar: "يدير العمليّات الخلفية" },
    sub: {
      en: "Hiring, finance, decisions — out of your inbox.",
      ar: "التوظيف والمالية والقرارات — بعيدة عن بريدك.",
    },
    accent: "var(--info)",
  },
};

export const ROLE_META_EN: Record<AgentRole, { label: string; sub: string; accent: string }> = {
  customer: {
    label: ROLE_META.customer.label.en,
    sub: ROLE_META.customer.sub.en,
    accent: ROLE_META.customer.accent,
  },
  growth: {
    label: ROLE_META.growth.label.en,
    sub: ROLE_META.growth.sub.en,
    accent: ROLE_META.growth.accent,
  },
  ops: {
    label: ROLE_META.ops.label.en,
    sub: ROLE_META.ops.sub.en,
    accent: ROLE_META.ops.accent,
  },
};

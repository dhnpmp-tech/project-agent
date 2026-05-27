// Per-agent CV data for the /team/[slug] hire pages.
// Different shape from agents-data.ts because the marketing site needs
// richer per-agent content (portraits, longer bios, sample messages,
// voice samples) than the homepage AgentCard primitive carries.

export type Lang = "en" | "ar";

export interface BiString {
  en: string;
  ar: string;
}

export interface SampleMessage {
  from: "customer" | "owner" | "agent";
  text: BiString;
}

export interface TeamMember {
  slug: string;
  name: BiString;
  role: BiString;
  /** One-line tagline that goes under the name. */
  tagline: BiString;
  /** Where she lives, narratively. e.g. "Available · Dubai" */
  location: BiString;
  /** Persona summary — 2-3 sentences. The HR-style bio. */
  bio: BiString;
  /** Bullet list of what she actually does. 4-6 items. */
  does: BiString[];
  /** What she's especially good at. 3-5 items. */
  specialties: BiString[];
  /** Industries / business types she fits. */
  industries: BiString[];
  /** Sample conversations — usually 2 customer-agent exchanges. */
  samples: SampleMessage[][];
  /** Path to her portrait under /public. */
  portrait: string;
  /** Voice id used in the ElevenLabs / MiniMax routing. en + ar variants. */
  voiceEn?: { provider: string; voiceId: string; voiceName: string };
  voiceAr?: { provider: string; voiceId: string; voiceName: string };
  /** Path to a short voice sample under /public, if we have it. */
  voiceSampleEn?: string;
  voiceSampleAr?: string;
  /** Who she works closely with on the team — slugs of other members. */
  worksWith: string[];
  /** Color accent for her card / page header. */
  accent: string;
  /** Two-letter monogram for the corner mark. */
  monogram: string;
  /** Status pill — "Available now" / "Booked through Sept" / etc. */
  status: BiString;
}

export const TEAM: TeamMember[] = [
  {
    slug: "omar",
    name: { en: "Omar", ar: "عمر" },
    role: { en: "Compliance Officer · Real estate", ar: "موظف الامتثال · العقارات" },
    tagline: {
      en: "Trakheesi permits, Form A/B/F, RERA broker IDs — Omar tracks the paperwork that gets brokerages fined when they forget.",
      ar: "تصاريح ترخيصي، استمارات أ/ب/ف، هويات وسطاء ريرا — عمر يتابع الأوراق التي تُفرض فيها غرامات على المكاتب عند الإهمال.",
    },
    location: { en: "Available now · Dubai & Abu Dhabi", ar: "متاح الآن · دبي وأبوظبي" },
    bio: {
      en: "Omar is the compliance officer your real-estate brokerage didn't know it needed. He watches every Trakheesi permit you hold — pings the agent 14 days before expiry, refuses to let a listing post if it would push the property past the 3-broker advertising cap, and keeps Form A/B/F state machine in order. He's the quiet partner who keeps you off the RERA fine list.",
      ar: "عمر هو موظف الامتثال الذي لم يكن مكتبك العقاري يعلم أنه يحتاجه. يراقب كل تصريح ترخيصي تملكه — ينبّه الوسيط قبل ١٤ يوماً من انتهائه، يرفض السماح بنشر إعلان إذا كان سيتجاوز سقف ٣ وسطاء، ويحافظ على ترتيب آلة استمارات أ/ب/ف. شريك هادئ يبعدك عن قائمة غرامات ريرا.",
    },
    does: [
      { en: "Validates every Trakheesi permit number before a listing goes live", ar: "يتحقّق من كل رقم تصريح ترخيصي قبل بثّ أي إعلان" },
      { en: "Tracks 90-day permit lifecycle, renews 14 days before expiry", ar: "يتابع دورة تصاريح ٩٠ يوماً، يجدّد قبل الانتهاء بـ١٤ يوماً" },
      { en: "Checks Form A is signed before listing on portals", ar: "يتحقق من توقيع استمارة A قبل النشر على البوابات" },
      { en: "Enforces the 3-broker cap per property — refuses repost if exceeded", ar: "يفرض سقف ٣ وسطاء لكل عقار — يرفض إعادة النشر عند التجاوز" },
      { en: "Verifies every agent's RERA broker ID is current", ar: "يتحقق من سريان رقم ريرا لكل وسيط" },
      { en: "Logs all compliance actions in an audit trail you can hand to a regulator", ar: "يسجّل جميع إجراءات الامتثال في سجل تدقيق جاهز للرقابة" },
    ],
    specialties: [
      { en: "Trakheesi monitoring", ar: "مراقبة ترخيصي" },
      { en: "Form A/B/F state tracking", ar: "متابعة استمارات A/B/F" },
      { en: "RERA broker registry checks", ar: "فحص سجل وسطاء ريرا" },
      { en: "Compliance audit trails", ar: "سجلات تدقيق الامتثال" },
    ],
    industries: [
      { en: "Real estate brokerages", ar: "المكاتب العقارية" },
      { en: "Property developers", ar: "المطوّرون العقاريون" },
      { en: "PropTech platforms", ar: "منصات بروبتك" },
    ],
    samples: [
      [
        { from: "owner", text: { en: "list the Marina Heights 3BR for republish", ar: "أعد نشر شقة مارينا هايتس ٣ غرف" } },
        { from: "agent", text: { en: "Pausing — Trakheesi permit on that unit expires in 3 days. Renewing now (~5 min). Also: 2 other brokers currently advertise this property, so we're at the 3-broker cap. Want me to confirm with the seller before we push?", ar: "إيقاف مؤقت — تصريح ترخيصي ينتهي خلال ٣ أيام. أجدّده الآن (~٥ دقائق). كذلك: وسيطان آخران ينشران هذا العقار حالياً، أي وصلنا سقف الـ٣ وسطاء. أتأكد من البائع قبل النشر؟" } },
      ],
      [
        { from: "owner", text: { en: "new listing — penthouse downtown 4M", ar: "إعلان جديد — بنتهاوس داون تاون ٤ مليون" } },
        { from: "agent", text: { en: "Got it. Before I publish: Form A signed by the seller? RERA ID for the listing agent? Drop them here and I'll file + post within an hour. Photos and copy I'll source from the inventory drive.", ar: "تم. قبل النشر: استمارة A موقّعة من البائع؟ رقم ريرا لوكيل البيع؟ أرسلها هنا وأنا أوثّقها وأنشر خلال ساعة. الصور والوصف سأجلبها من مكتبة المخزون." } },
      ],
    ],
    portrait: "/team/omar.jpg",
    worksWith: ["layla"],
    accent: "#7da8d4",
    monogram: "OM",
    status: { en: "Available now", ar: "متاح الآن" },
  },
  {
    slug: "layla",
    name: { en: "Layla", ar: "ليلى" },
    role: { en: "The Matcher · Real estate inventory", ar: "المطابِقة · مخزون العقارات" },
    tagline: {
      en: "Reads your agency's WhatsApp groups, structures every pocket listing, and pings the right agent within seconds when a buyer brief lands.",
      ar: "تقرأ مجموعات الواتساب الداخلية، تُهيكل كل قائمة سرّية، وتنبّه الوسيط المناسب خلال ثوانٍ عند ورود طلب مشترٍ.",
    },
    location: { en: "Available now · Dubai", ar: "متاحة الآن · دبي" },
    bio: {
      en: "Layla is the intra-agency matcher. She reads the WhatsApp groups your agents already use (with admin permission), extracts every off-market listing into a structured inventory, and matches incoming buyer briefs to internal stock in seconds. Critically: she never exposes a pocket listing outside the agency boundary — your competitive moat stays inside the walls.",
      ar: "ليلى هي مطابِقة المخزون الداخلي. تقرأ مجموعات الواتساب التي يستخدمها وسطاؤك (بإذن المشرف)، تستخرج كل عقار خارج السوق إلى مخزون مُهيكل، وتطابق طلبات المشترين بالمخزون الداخلي خلال ثوانٍ. والأهم: لا تُسرّب أبداً أي قائمة سرّية خارج حدود المكتب — تبقى ميزتك التنافسية داخل الجدران.",
    },
    does: [
      { en: "Reads internal WhatsApp groups (with admin authorization) and structures every listing", ar: "تقرأ مجموعات الواتساب الداخلية (بإذن المشرف) وتُهيكل كل عقار" },
      { en: "Embeds buyer briefs and matches against internal inventory in seconds", ar: "تُحوّل طلبات المشترين إلى مرادفات وتطابقها بالمخزون خلال ثوانٍ" },
      { en: "Pings the agent with the listing — never exposes it outside the agency", ar: "تنبّه الوسيط بالعقار — لا تُظهره خارج المكتب أبداً" },
      { en: "Weekly inventory-health digest to the head of sales", ar: "تقرير أسبوعي عن صحة المخزون لمدير المبيعات" },
      { en: "Flags listings that need refresh (price drop, status change, expiring permit)", ar: "تشير إلى العقارات التي تحتاج تحديث (تخفيض، تغيير وضع، انتهاء تصريح)" },
    ],
    specialties: [
      { en: "Pocket listing structuring", ar: "هيكلة القوائم السرّية" },
      { en: "Embedding-based buyer matching", ar: "مطابقة المشتري بالمرادفات" },
      { en: "Inventory hygiene", ar: "نظافة المخزون" },
      { en: "Agency-internal mode (closed network)", ar: "وضع المكتب الداخلي (شبكة مغلقة)" },
    ],
    industries: [
      { en: "Real estate brokerages (10+ agents)", ar: "مكاتب عقارية (١٠+ وسطاء)" },
      { en: "Multi-office agencies", ar: "مكاتب متعدّدة الفروع" },
    ],
    samples: [
      [
        { from: "customer", text: { en: "Looking for 3BR in Saadiyat, ~AED 5M, view of the water", ar: "أبحث عن ٣ غرف في السعديات، ~٥ مليون درهم، إطلالة على الماء" } },
        { from: "agent", text: { en: "I have 3 internal matches that fit. Sending you Yas Acres villa (AED 4.8M, water view, off-market since Tuesday) — Rashid is the listing agent. Want me to set up a viewing with him?", ar: "عندي ٣ مطابقات داخلية مناسبة. أرسل لك فيلا ياس أيكرز (٤٫٨ مليون، إطلالة ماء، خارج السوق منذ الثلاثاء) — راشد هو وكيل البيع. أنسّق لك معاينة معه؟" } },
      ],
    ],
    portrait: "/team/layla.jpg",
    worksWith: ["omar"],
    accent: "#9f87f0",
    monogram: "LA",
    status: { en: "Available now", ar: "متاحة الآن" },
  },
];

export function findMember(slug: string): TeamMember | undefined {
  return TEAM.find((m) => m.slug === slug);
}

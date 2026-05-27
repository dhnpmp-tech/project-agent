"use client";

// agents.dcp.sa — Homepage. Ported from /tmp/dcp-design/assets/home.jsx
// using the typed DCP design kit in src/components/dcp/.

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DcpProvider } from "@/components/dcp/provider";
import { StickyDemoCta } from "@/components/dcp/sticky-demo-cta";
import { useLang } from "@/components/dcp/lib";
import {
  Marquee,
  Nav,
  SectionMeta,
  TweaksPanel,
  type NavLink,
} from "@/components/dcp/chrome";
import { Reveal } from "@/components/dcp/motion";
import { Arrow } from "@/components/dcp/icons";
import type { Lang } from "@/components/dcp/i18n";
import { AgentCard } from "@/components/dcp/screens";
import { AGENTS } from "@/lib/agents-data";

/* ─── Content (lifted from /tmp/dcp-design/assets/data.js) ─── */

interface BiString {
  en: string;
  ar: string;
}

interface HeroStat {
  v: string;
  k: BiString;
}
interface PainItem {
  code: string;
  t: BiString;
  msg: BiString;
}
type AgentTier = "starter" | "growth" | "pro" | "enterprise";
interface IntelItem {
  t: BiString;
  msg: BiString;
}
interface IndustryItem {
  t: BiString;
  msg: BiString;
  bullets: BiString[];
}
interface HowStep {
  n: string;
  t: BiString;
  msg: BiString;
}
interface MemoryField {
  k: BiString;
  v: BiString;
}
interface MemoryCard {
  name: BiString;
  fields: MemoryField[];
}
interface PricingTier {
  id: string;
  name: BiString;
  sub: BiString;
  monthly_aed: number;
  setup_aed: number;
  popular: boolean;
  includes: BiString[];
}

const HERO_STATS: HeroStat[] = [
  { v: "10 min", k: { en: "to go live", ar: "للإطلاق" } },
  { v: "AR + EN", k: { en: "native, not translated", ar: "أصيل، مش مترجم" } },
  { v: "24/7", k: { en: "self-improving", ar: "يتطوّر ذاتياً" } },
];

const PAIN: PainItem[] = [
  {
    code: "01",
    t: { en: "3h/day", ar: "٣ س/يوم" },
    msg: {
      en: "Answering WhatsApp messages until midnight",
      ar: "الرد على رسائل واتساب لين منتصف الليل",
    },
  },
  {
    code: "02",
    t: { en: "1.5h/day", ar: "١٫٥ س/يوم" },
    msg: {
      en: "Posting on social media between customer calls",
      ar: "النشر على السوشيال بين مكالمات العملاء",
    },
  },
  {
    code: "03",
    t: { en: "2h/day", ar: "٢ س/يوم" },
    msg: {
      en: "Chasing leads that go cold because you were busy",
      ar: "ملاحقة عملاء محتملين يبردون لأنك مشغول",
    },
  },
  {
    code: "04",
    t: { en: "4h/week", ar: "٤ س/أسبوع" },
    msg: {
      en: "Tracking invoices on spreadsheets at 2am",
      ar: "تتبّع الفواتير على إكسل الساعة ٢ فجراً",
    },
  },
  {
    code: "05",
    t: { en: "6h/week", ar: "٦ س/أسبوع" },
    msg: {
      en: "Screening CVs when you should be closing deals",
      ar: "فرز السير الذاتية بدل ما تقفل صفقات",
    },
  },
  {
    code: "06",
    t: { en: "5h/week", ar: "٥ س/أسبوع" },
    msg: {
      en: "Rescheduling no-shows and chasing confirmations",
      ar: "إعادة جدولة الغيابات وملاحقة التأكيدات",
    },
  },
];

const INTELLIGENCE: IntelItem[] = [
  {
    t: { en: "Self-Improving AI", ar: "ذكاء يتطوّر ذاتياً" },
    msg: {
      en: "Analyzes every conversation overnight. Writes new rules, verifies them against past conversations, and A/B tests before applying. Conflicting rules get resolved automatically.",
      ar: "يحلّل كل محادثة في الليل. يكتب قواعد جديدة، يتحقّق منها على المحادثات السابقة، ويختبرها A/B قبل التطبيق. القواعد المتعارضة تُحسم تلقائياً.",
    },
  },
  {
    t: { en: "Proactive Follow-ups", ar: "متابعات استباقية" },
    msg: {
      en: "Reservation reminders before the visit. Feedback requests after. Re-engagement offers when a customer hasn't been back in 14 days. All via Meta-approved WhatsApp templates.",
      ar: "تذكير بالحجز قبل الزيارة. طلب رأي بعدها. عروض استرجاع للعميل اللي ما زار من ١٤ يوم. كل هذا عبر قوالب واتساب معتمدة من ميتا.",
    },
  },
  {
    t: { en: "Morning Briefs", ar: "موجز الصباح" },
    msg: {
      en: "Every morning at 9am local — Riyadh tenants get it at 9 Riyadh, Dubai tenants at 9 Dubai, idempotent so a re-run never double-sends. Situation, complication, question, action — the McKinsey framework. Variance detection flags what changed. Recommended actions, not just data.",
      ar: "كل صباح الساعة ٩ بتوقيتك المحلي — تنانير الرياض يوصلها ٩ الرياض، تنانير دبي ٩ دبي، بلا تكرار. وضع، إشكال، سؤال، إجراء — إطار ماكنزي. كشف الانحرافات يبيّن إيش تغيّر. توصيات بإجراءات، مو مجرّد أرقام.",
    },
  },
  {
    t: { en: "Daily Action Queue", ar: "قائمة المهام اليومية" },
    msg: {
      en: "Each night the agent drafts 5–7 actions for tomorrow — replies to drop-offs, an Instagram post in your voice, an outbound email to a real ICP-matched lead. Each action gets a letter A–G. You reply YES to do all, or 'A C E' to pick. The executor drafts the deliverable; you approve or skip from WhatsApp.",
      ar: "كل ليلة الذكاء يرسم ٥–٧ مهام لبكرة — ردود على عملاء تركوا، بوست إنستغرام بصوتك، إيميل خروج لعميل محتمل مطابق. كل مهمة بحرف A–G. ترد YES لكلها، أو 'A C E' لاختيار. المنفّذ يكتب المسوّدة؛ توافق أو تتجاوز من واتساب.",
    },
  },
  {
    t: { en: "Customer Memory", ar: "ذاكرة العملاء" },
    msg: {
      en: "A live dashboard of every customer that ever messaged your business. Avatar, sentiment bar, preferences, key events, last visit. Search by name, phone, or email. The agent reads from the same source — it never forgets a regular.",
      ar: "لوحة حيّة لكل عميل راسلك في أي وقت. صورة، شريط مشاعر، تفضيلات، أحداث رئيسية، آخر زيارة. ابحث بالاسم أو الجوال أو البريد. الذكاء يقرأ من نفس المصدر — ما ينسى زبون دائم.",
    },
  },
  {
    t: { en: "Tenant Isolation by Default", ar: "عزل البيانات افتراضياً" },
    msg: {
      en: "Every server query filters by your client_id from the JWT on the way in — not after the fact, not behind a row-level rule that needs auditing. A dedicated audit test suite runs the symmetric A/B + B/A case against every helper to prove no row leaks the other way.",
      ar: "كل استعلام يفلتر بمعرّف عميلك من الـJWT لحظة الدخول — مو بعد ما يجيب البيانات، ولا خلف قاعدة سطرية تحتاج تدقيق. مجموعة اختبارات مخصّصة تتحقق من كل استعلام في الاتجاهين لتثبت ما في تسرّب.",
    },
  },
  {
    t: { en: "Day-One Deliverables", ar: "نتائج اليوم الأول" },
    msg: {
      en: "Within minutes of signup: a Google Business Profile audit, an FAQ gap analyzer, ICP-matched prospects, a morning owner-brief preview, and a full WhatsApp demo transcript scripted around your actual business. Ten artifacts — not a 'getting started' email.",
      ar: "خلال دقائق من التسجيل: تدقيق ملف قوقل التجاري، تحليل ثغرات الأسئلة، عملاء محتملون مطابقون لمواصفاتك، معاينة موجز المالك الصباحي، ومحادثة واتساب تجريبية كاملة مكتوبة حول عملك تحديداً. عشر منتجات حقيقية — لا بريد ترحيبي.",
    },
  },
  {
    t: { en: "Multi-Outlet Brand View", ar: "عرض موحّد لكل الفروع" },
    msg: {
      en: "If you run a chain, the agent pulls every outlet on Google, weights reviews across every location, surfaces the laggard, and benchmarks each one against the rest. One brand, every address, one dashboard.",
      ar: "إن كنت تدير سلسلة، يسحب الذكاء كل فرع على قوقل، يزن المراجعات في كل موقع، يكشف الأضعف، ويقارن كل فرع بالبقية. علامة واحدة، كل العناوين، لوحة واحدة.",
    },
  },
  {
    t: { en: "Google Review Responder", ar: "ردود مراجعات قوقل" },
    msg: {
      en: "New review comes in — the AI drafts a thoughtful reply within minutes. You approve or edit from WhatsApp. One tap to publish.",
      ar: "يوصل تقييم جديد — الذكاء يصيغ رد محترم في دقائق. توافق أو تعدّل من واتساب. ضغطة وحدة وينشر.",
    },
  },
  {
    t: { en: "Guest Intelligence", ar: "ذكاء العملاء" },
    msg: {
      en: "Every customer auto-segmented: VIP, Loyal, At Risk, or Lapsed. The AI knows who deserves a personal touch and who's about to slip away.",
      ar: "كل عميل مُصنّف تلقائياً: VIP، وفي، معرّض للفقد، أو متسرّب. الذكاء يعرف مين يستحق لمسة شخصية ومين على وشك يبتعد.",
    },
  },
  {
    t: { en: "Risk Surfacing", ar: "كشف المخاطر" },
    msg: {
      en: "Surfaces what you're missing: declining repeat visits, unanswered complaints, booking patterns that signal trouble. Proactive alerts so nothing slips through.",
      ar: "يكشف اللي فاتك: تراجع الزيارات المتكرّرة، شكاوى بدون رد، أنماط حجز تنذر بمشكلة. تنبيهات استباقية ما يفوت شي.",
    },
  },
  {
    t: { en: "Native Gulf Arabic", ar: "عربية خليجية أصيلة" },
    msg: {
      en: "Arabic messages auto-route to a model that speaks native Gulf Arabic. English stays on the primary engine. Natural conversations, not broken translation.",
      ar: "الرسائل العربية تُحوَّل تلقائياً لنموذج يتكلّم خليجي أصلي. الإنجليزي يبقى على المحرّك الأساسي. محادثات طبيعية، مو ترجمة ركيكة.",
    },
  },
];

const INDUSTRIES: IndustryItem[] = [
  {
    t: { en: "Restaurants & Cafés", ar: "مطاعم ومقاهي" },
    msg: {
      en: "Table bookings with time and occasion. Menu knowledge with prices. Dietary tracking per guest. Owner takes a photo at the market — it becomes today's special across WhatsApp, Instagram, and the knowledge base.",
      ar: "حجوزات طاولات مع الوقت والمناسبة. معرفة كاملة بالقائمة والأسعار. تتبّع الحساسيات لكل ضيف. المالك يصوّر شي من السوق — يصير سبيشل اليوم على واتساب وإنستغرام وقاعدة المعرفة.",
    },
    bullets: [
      { en: "Calendar booking", ar: "حجوزات على التقويم" },
      { en: "Allergy memory per guest", ar: "حفظ الحساسيات لكل ضيف" },
      { en: "Photo-to-special pipeline", ar: "من صورة إلى عرض اليوم" },
    ],
  },
  {
    t: { en: "Coffee & Retail", ar: "قهوة وتجزئة" },
    msg: {
      en: "Bean subscriptions, order management, cupping session bookings. The AI knows each customer's roast preference and texts them when their favorite origin comes back in stock.",
      ar: "اشتراكات الحبوب، إدارة الطلبات، حجز جلسات التذوّق. الذكاء يعرف تفضيل التحميص لكل عميل ويرسل له لمّا يرجع منشأه المفضّل للمخزون.",
    },
    bullets: [
      { en: "Subscription management", ar: "إدارة الاشتراكات" },
      { en: "Taste preference memory", ar: "حفظ تفضيلات الذوق" },
      { en: "New arrival notifications", ar: "تنبيهات الوصول الجديد" },
    ],
  },
  {
    t: { en: "Spas, Salons & Clinics", ar: "سبا وصالونات وعيادات" },
    msg: {
      en: "Appointment booking with preferred therapist. Treatment history and pressure preferences remembered. Follow-up the morning after: 'How are you feeling?' Seasonal packages suggested automatically.",
      ar: "حجز موعد مع المعالج المفضّل. تاريخ الجلسات وتفضيلات الضغط محفوظة. متابعة صباح اليوم التالي: «كيف تشعر اليوم؟» وعروض موسمية تُقترح تلقائياً.",
    },
    bullets: [
      { en: "Therapist preference memory", ar: "حفظ تفضيل المعالج" },
      { en: "Post-treatment follow-up", ar: "متابعة بعد الجلسة" },
      { en: "Package upselling", ar: "عروض الباقات" },
    ],
  },
];

const HOW: HowStep[] = [
  {
    n: "1",
    t: { en: "We learn your business", ar: "نتعلّم عملك" },
    msg: {
      en: "We scan your website, interview you about your vibe, and study your industry. In 30 minutes we know your business better than a new hire would in a month.",
      ar: "نمسح موقعك، نقابلك ونفهم طابع علامتك، وندرس قطاعك. في ٣٠ دقيقة نعرف عملك أحسن من موظف جديد بشهر كامل.",
    },
  },
  {
    n: "2",
    t: { en: "We create your AI team", ar: "نصنع فريق الذكاء" },
    msg: {
      en: "Each agent gets a unique persona — a name, a backstory, a personality, even a profile photo. Your WhatsApp agent isn't a bot. It's someone your customers will remember.",
      ar: "كل موظف ذكاء له شخصية مستقلة — اسم، قصة، طبع، وحتى صورة شخصية. موظف واتساب عندك مو روبوت، شخص يتذكّره عملاؤك.",
    },
  },
  {
    n: "3",
    t: { en: "Pay, we build, you go live", ar: "ادفع، نبني، تشتغل" },
    msg: {
      en: "We build your website, activate your AI across WhatsApp, your website widget, Telegram, and Instagram DM — with voice note support on every channel. Your AI team starts handling customers on day one.",
      ar: "نبني موقعك، ونفعّل ذكاءك على واتساب، ودردشة موقعك، وتيليغرام، ورسائل إنستغرام — مع دعم الرسائل الصوتية على كل قناة. فريقك يبدأ يخدم العملاء من اليوم الأول.",
    },
  },
];

const MEMORY_BULLETS: BiString[] = [
  {
    en: "Names, phone numbers, and communication language",
    ar: "الأسماء وأرقام الهاتف ولغة التواصل",
  },
  {
    en: "Dietary restrictions — tracked per guest, not just per booking",
    ar: "الحساسيات الغذائية — لكل ضيف، مو لكل حجز فقط",
  },
  {
    en: "Favorite dishes, usual party size, preferred seating",
    ar: "الأطباق المفضّلة، عدد الأشخاص المعتاد، الجلسة المفضّلة",
  },
  {
    en: "Every past booking, complaint, and compliment",
    ar: "كل حجز سابق، شكوى، وثناء",
  },
  {
    en: "Sentiment tracking — knows if last visit was a bad experience",
    ar: "تتبّع المشاعر — يعرف إذا الزيارة الأخيرة كانت تجربة سيئة",
  },
];

const MEMORY_CARD: MemoryCard = {
  name: { en: "Layla Khoury", ar: "ليلى خوري" },
  fields: [
    {
      k: { en: "Preference", ar: "التفضيل" },
      v: { en: "Outdoor terrace, party of 4", ar: "تراس خارجي، طاولة لأربعة" },
    },
    {
      k: { en: "Allergy", ar: "الحساسية" },
      v: { en: "Nut allergy", ar: "حساسية مكسّرات" },
    },
    {
      k: { en: "Status", ar: "الحالة" },
      v: { en: "VIP — 8 visits", ar: "VIP · ٨ زيارات" },
    },
    {
      k: { en: "Last order", ar: "آخر طلب" },
      v: { en: "Truffle pasta, sparkling water", ar: "باستا بالكمأة، مياه فوّارة" },
    },
    {
      k: { en: "Sentiment", ar: "الانطباع" },
      v: { en: "Positive — last 3 visits", ar: "إيجابي · آخر ٣ زيارات" },
    },
  ],
};

// ONE offer. Mirrors apps/website/src/lib/pricing-data.ts::OFFER.
// Kept inline (rather than importing from the lib) because the
// homepage card uses BiString-shaped labels for AR/EN rendering and
// the lib's Tier shape uses plain strings — diverging just here is
// cleaner than threading lang through the lib.
const TIERS: PricingTier[] = [
  {
    id: "core",
    name: { en: "Najim", ar: "نجم" },
    sub: { en: "Your AI ops team — done for you", ar: "فريق الذكاء الكامل — جاهز عندك" },
    monthly_aed: 5000,
    setup_aed: 3500,
    popular: true,
    includes: [
      {
        en: "Unlimited customers, conversations, voice notes",
        ar: "عملاء بلا حدود، محادثات بلا حدود، رسائل صوتية بلا حدود",
      },
      {
        en: "All five agents — WhatsApp, Sales, Content, HR, Financial",
        ar: "الموظفون الخمسة — واتساب، مبيعات، محتوى، موارد بشرية، مالي",
      },
      {
        en: "Native WhatsApp on your own number — we handle Meta verification",
        ar: "واتساب أصلي على رقمك — نحن نتولى تفعيل ميتا",
      },
      {
        en: "Native Arabic + English with Gulf-dialect voice notes",
        ar: "عربية خليجية + إنجليزي، مع رسائل صوتية بصوت أصلي",
      },
      {
        en: "Daily 9am owner brief on WhatsApp — text and voice",
        ar: "موجز صباحي يومي على واتساب — نص ورسالة صوتية",
      },
      {
        en: "Customer memory dashboard with VIP, at-risk, and lapsed segmentation",
        ar: "لوحة ذاكرة العملاء — VIP، معرّض، مفقود",
      },
      {
        en: "Composio integrations — Foodics, Bayut, Tabby, Tamara, Google, Calendly",
        ar: "تكاملات Composio — فودكس، بيوت، تابي، تمارا، قوقل، Calendly",
      },
      {
        en: "Dedicated cloud computer per agent — true data isolation",
        ar: "حاسب سحابي مخصّص لكل موظف ذكاء — عزل بيانات حقيقي",
      },
      {
        en: "Infrastructure, monitoring, and security upgrades included",
        ar: "البنية التحتية والمراقبة وتحديثات الأمان مشمولة",
      },
      {
        en: "Weekly workflow tuning — we adjust the agent as your business changes",
        ar: "ضبط أسبوعي لسير العمل — نطوّر الذكاء مع تطوّر عملك",
      },
      {
        en: "Direct line to the founders on WhatsApp",
        ar: "تواصل مباشر مع المؤسّسين على واتساب",
      },
    ],
  },
];

/* ─── Helpers ─── */

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setSeen(true);
            io.disconnect();
          }
        });
      },
      { rootMargin: "-10% 0px -10% 0px", threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen] as const;
}

function CountUp({ to, suffix = "", duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
  const [v, setV] = useState(0);
  const [ref, seen] = useInView();
  useEffect(() => {
    if (!seen) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to, duration]);
  return (
    <span ref={ref}>
      {v.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ─── LiveThread (Hero centerpiece) ─── */

interface ThreadMsg {
  side: "cust" | "ai";
  t: BiString;
  msg: BiString;
  typing?: number;
}

function HireResumeCard() {
  const { lang } = useLang();
  return (
    <div
      style={{
        border: "1px solid var(--line, rgba(255,255,255,0.12))",
        borderRadius: 14,
        overflow: "hidden",
        background: "var(--card-bg, rgba(255,255,255,0.02))",
        backdropFilter: "blur(8px)",
        maxWidth: 420,
        marginLeft: "auto",
      }}
    >
      {/* Resume header — letterhead style */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--line, rgba(255,255,255,0.08))",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            opacity: 0.55,
          }}
        >
          {lang === "ar" ? "السيرة الذاتية · نادية" : "Resume · Nadia"}
        </div>
        <span
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--green, #5d8a4a)",
            padding: "3px 10px",
            border: "1px solid var(--green, #5d8a4a)",
            borderRadius: 999,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green, #5d8a4a)" }} />
          {lang === "ar" ? "متاحة الآن" : "Available now"}
        </span>
      </div>

      {/* Portrait + identity */}
      <div style={{ display: "grid", gridTemplateColumns: "112px 1fr", gap: 18, padding: 20, alignItems: "center" }}>
        <a href="/teardown" aria-label="See Nadia work on your business" style={{ display: "block" }}>
          <div
            style={{
              width: 112,
              height: 112,
              borderRadius: 12,
              overflow: "hidden",
              background: "linear-gradient(180deg, rgba(212,146,75,0.22), transparent)",
            }}
          >
            <img
              src="/team/nadia.jpg"
              alt="Nadia"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        </a>
        <div>
          <div
            style={{
              fontSize: 28,
              fontFamily: "var(--serif, Georgia, serif)",
              fontWeight: 400,
              lineHeight: 1.05,
              marginBottom: 4,
            }}
          >
            {lang === "ar" ? "نادية" : "Nadia"}
          </div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              opacity: 0.6,
              marginBottom: 10,
            }}
          >
            {lang === "ar" ? "موظفة استقبال · مضيفة عملاء" : "Front-of-house · Customer host"}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(lang === "ar"
              ? ["عربية خليجية", "إنجليزية", "٢٤/٧"]
              : ["Gulf Arabic", "English", "24/7"]
            ).map((b) => (
              <span
                key={b}
                className="mono"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  border: "1px solid var(--line, rgba(255,255,255,0.1))",
                  borderRadius: 4,
                  opacity: 0.7,
                }}
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Voice sample */}
      <div
        style={{
          padding: "0 20px 16px",
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.55,
            marginBottom: 8,
          }}
        >
          {lang === "ar" ? "صوتها (نموذج)" : "Her voice (sample)"}
        </div>
        <audio
          controls
          preload="none"
          src="/team/nadia-en.mp3"
          style={{ width: "100%", height: 36 }}
        />
      </div>

      {/* Bio + sample line */}
      <div style={{ padding: "0 20px 16px", borderTop: "1px solid var(--line, rgba(255,255,255,0.06))", paddingTop: 16 }}>
        <div
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.55,
            marginBottom: 8,
          }}
        >
          {lang === "ar" ? "نموذج رد" : "Sample reply"}
        </div>
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            margin: 0,
            opacity: 0.88,
            fontFamily: "var(--serif, Georgia, serif)",
            fontStyle: "italic",
          }}
        >
          {lang === "ar"
            ? '«مرحبا أحمد! تم — تراس، ٨ مساءً، ٤ أشخاص. ساحفظ لك الموقع وأرسله قبل ساعة. نشوفك الليلة 🌿»'
            : "\u201cHi Ahmad! Done — terrace, 8pm, party of 4. I'll send the location pin an hour before. See you tonight 🌿\u201d"}
        </p>
      </div>

      {/* CTA */}
      <a
        href="/teardown"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 20px",
          borderTop: "1px solid var(--line, rgba(255,255,255,0.06))",
          color: "inherit",
          textDecoration: "none",
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--green, #5d8a4a)",
          }}
        >
          {lang === "ar" ? "شاهدها تعمل على عملك" : "See her read your business"}
        </span>
        <span style={{ color: "var(--green, #5d8a4a)" }}>
          <Arrow size={14} />
        </span>
      </a>
    </div>
  );
}

function LiveThread() {
  const { lang } = useLang();
  const thread = useMemo<ThreadMsg[]>(
    () => [
      {
        side: "cust",
        t: { en: "1:14 PM", ar: "١:١٤ م" },
        msg: {
          en: "Ahlan! Do you have a table for 4 tonight at 9?",
          ar: "هلا! عندكم طاولة لأربعة الليلة الساعة ٩؟",
        },
      },
      {
        side: "ai",
        t: { en: "1:14 PM", ar: "١:١٤ م" },
        msg: {
          en: "Hey! 👋 Yes, 9pm is open. Under what name?",
          ar: "أهلاً 👋 أكيد، ٩ متاحة. باسم مين أحجز؟",
        },
        typing: 700,
      },
      {
        side: "cust",
        t: { en: "1:15 PM", ar: "١:١٥ م" },
        msg: {
          en: "Mohammed. Same window table as last time if possible?",
          ar: "محمد. وأبغى نفس الطاولة عند النافذة لو يصير",
        },
      },
      {
        side: "ai",
        t: { en: "1:15 PM", ar: "١:١٥ م" },
        msg: {
          en: "Welcome back, Mohammed Al-Qahtani 👋 — table 12 by the window, same as last time. Booked. Want me to set up your usual (kabsa + tamr hindi)?",
          ar: "حياك يا محمد القحطاني 👋 — طاولة ١٢ عند النافذة، نفس آخر مرة. تمّ الحجز. أرتّب لك نفس الطلب (كبسة + تمر هندي)؟",
        },
        typing: 1100,
      },
      {
        side: "cust",
        t: { en: "1:15 PM", ar: "١:١٥ م" },
        msg: { en: "Yes, shukran", ar: "إي، مشكور" },
      },
      {
        side: "ai",
        t: { en: "1:16 PM", ar: "١:١٦ م" },
        msg: {
          en: "Done ✓ I'll send a reminder at 8:30. Have a great evening 🌙",
          ar: "تمّ ✓ راح أبعث تذكير الساعة ٨:٣٠. مساك الله بالخير 🌙",
        },
        typing: 800,
      },
    ],
    [],
  );

  const [shown, setShown] = useState(1);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    // Play once and stop — no infinite restart loop.
    if (shown >= thread.length) return;
    const next = thread[shown];
    if (next?.typing) {
      setTyping(true);
      const a = setTimeout(() => setTyping(false), next.typing);
      const b = setTimeout(() => setShown((s) => s + 1), next.typing + 200);
      return () => {
        clearTimeout(a);
        clearTimeout(b);
      };
    }
    const c = setTimeout(() => setShown((s) => s + 1), 1500);
    return () => clearTimeout(c);
  }, [shown, thread]);

  return (
    <div className="livethread">
      <div className="lt-hd">
        <div className="lt-av">
          <span className="lt-av-init">{lang === "ar" ? "ل" : "L"}</span>
          <span className="lt-av-on" />
        </div>
        <div className="lt-meta">
          <div className="lt-name">
            {lang === "ar" ? "ليلى · مطعم زعفران" : "Layla · Saffron Kitchen"}
          </div>
          <div className="lt-status">
            <span className="d" />{" "}
            {lang === "ar" ? "ذكاء اصطناعي · متّصل" : "AI Agent · online"}
          </div>
        </div>
        <div className="lt-time">{lang === "ar" ? "٩:٤١" : "9:41"}</div>
      </div>
      <div className="lt-body">
        {thread.slice(0, shown).map((m, i) => (
          <div key={i} className={"lt-msg lt-" + m.side}>
            <div className="lt-bubble">{m.msg[lang]}</div>
            <div className="lt-t">
              {m.t[lang]}
              {m.side === "ai" && <span className="lt-tick">✓✓</span>}
            </div>
          </div>
        ))}
        {typing && (
          <div className="lt-msg lt-ai">
            <div className="lt-typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>
      <div className="lt-foot">
        <span className="mono">
          {lang === "ar" ? "∞ يتطوّر ذاتياً ليلاً" : "∞ Self-improving overnight"}
        </span>
        <span className="mono">·</span>
        <span className="mono">{lang === "ar" ? "ذاكرة دائمة" : "Persistent memory"}</span>
      </div>
    </div>
  );
}

/* ─── Sections ─── */

function Hero() {
  const { lang } = useLang();
  return (
    <section className="section hero-v2">
      <div className="container">
        <div className="hero-head">
          <span
            className="eyebrow"
            style={{ textDecoration: "none" }}
          >
            <span className="d" />
            {lang === "ar"
              ? "وكالة توظيف ذكاء · الإمارات والسعودية · إطلاق في ١٠ أيام"
              : "AI staffing · UAE & Saudi · 10-day hires"}
          </span>
        </div>
        <div className="hero-grid">
          <div className="hero-left">
            <Reveal as="h1" className="display tight">
              {lang === "ar" ? (
                <>
                  وظّف أول <em>موظفة ذكاء</em><br />
                  لعملك.
                </>
              ) : (
                <>
                  Hire your first<br />
                  <em>AI employee.</em>
                </>
              )}
            </Reveal>

            <Reveal as="p" className="lede-strong" delay={120}>
              {lang === "ar" ? (
                <>
                  موظفة مخصّصة لعملك — لها اسم، وجه، صوت، وسيرة ذاتية من صفحة واحدة. مدرّبة على عملك خلال <b>١٠ أيام عمل</b>. تحلّ محلّ موظف خدمة عملاء براتب <b>٧٬٠٠٠ درهم</b> — بسعر <b>٥٬٠٠٠ درهم/شهر</b>. لا تستقيل، لا تنام، تتقن العربية الخليجية والإنجليزية. نحن نوظّفها ونُعدّها — أنت تدير العمل.
                </>
              ) : (
                <>
                  A bespoke teammate for your business — her own name, face, voice, and one-page CV. Trained on your operations in <b>10 working days</b>. Replaces a <b>AED 7,000</b> customer-service hire — for <b>AED 5,000/month</b>. Never quits, never sleeps, fluent in Gulf Arabic and English. We do the hiring and training. You run the business.
                </>
              )}
            </Reveal>

            <Reveal as="div" className="cta-row tight" delay={200}>
              <a className="btn primary lg" href="/kickoff">
                {lang === "ar"
                  ? "احجز موعد التشغيل"
                  : "Schedule kickoff"}{" "}
                <Arrow size={14} />
              </a>
              <a className="btn ghost lg" href="/teardown">
                {lang === "ar"
                  ? "تشريح مجاني لعملك · ٦٠ ثانية"
                  : "Audit my business · 60s"}
              </a>
            </Reveal>

            <Reveal as="div" className="hero-stats v2" delay={300}>
              {HERO_STATS.map((s) => (
                <div className="hs" key={s.k.en}>
                  <div className="hs-v">
                    {s.v.includes("+") ? (
                      <>
                        <CountUp to={parseInt(s.v, 10)} />+
                      </>
                    ) : (
                      s.v
                    )}
                  </div>
                  <div className="hs-k">{s.k[lang]}</div>
                </div>
              ))}
            </Reveal>
          </div>
          <div className="hero-right">
            <Reveal delay={250}>
              <HireResumeCard />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Teardown (NEW — public viral wedge) ─── */

interface TeardownTile {
  num: string;
  t: BiString;
  msg: BiString;
}

const TEARDOWN_TILES: TeardownTile[] = [
  {
    num: "01",
    t: { en: "Agent score · A+ to F", ar: "تقييم الذكاء · A+ إلى F" },
    msg: {
      en: "We grade your digital presence the way a senior ops consultant would. One number, plus the breakdown so you know exactly what's bleeding.",
      ar: "نقيّم حضورك الرقمي كما يفعل مستشار عمليات. رقم واحد، مع التفصيل لتعرف بالضبط أين النزيف.",
    },
  },
  {
    num: "02",
    t: { en: "All outlets, not just one", ar: "كل الفروع، لا فرع واحد" },
    msg: {
      en: "Chains and franchises: we pull every Google location, weight the reviews, and surface the laggard. One brand view across all addresses.",
      ar: "السلاسل والامتيازات: نسحب كل موقع على قوقل، نزن المراجعات، ونكشف الأضعف. عرض موحّد لكل العناوين.",
    },
  },
  {
    num: "03",
    t: { en: "Reviews · sentiment + drafted replies", ar: "المراجعات · مشاعر + ردود جاهزة" },
    msg: {
      en: "We mine your last 90 days of reviews, classify the sentiment, surface the top complaints, and pre-draft owner responses you can copy and post right now.",
      ar: "نحلّل مراجعات آخر ٩٠ يوماً، نصنّف المشاعر، نُبرز أبرز الشكاوى، ونصيغ ردود مالك جاهزة للنسخ والنشر فوراً.",
    },
  },
  {
    num: "04",
    t: { en: "Schema audit · ready-to-paste JSON-LD", ar: "تدقيق Schema · JSON-LD جاهز للنسخ" },
    msg: {
      en: "We check what structured data is missing from your site — then generate the JSON-LD blocks (Restaurant, FAQPage, Menu) for you to paste directly into your <head>.",
      ar: "نفحص البيانات المنظّمة الناقصة من موقعك — ثم نولّد كتل JSON-LD (مطعم، أسئلة، قائمة) جاهزة للصق مباشرةً داخل وسم <head>.",
    },
  },
  {
    num: "05",
    t: { en: "Competitor radar", ar: "رادار المنافسين" },
    msg: {
      en: "Nearby competitors plotted on a 6-axis radar: rating, review velocity, photo count, social signal, schema coverage, response speed. See where you're losing.",
      ar: "المنافسون القريبون على رادار سداسي: التقييم، سرعة المراجعات، الصور، الإشارات الاجتماعية، تغطية Schema، سرعة الرد. ترى أين تخسر.",
    },
  },
  {
    num: "06",
    t: { en: "Social pulse · IG · TikTok · Reddit", ar: "نبض السوشيال · IG · TikTok · Reddit" },
    msg: {
      en: "How long since your last post? Are people tagging you on TikTok? Any Reddit threads mentioning the brand? We pull the freshness signals you can't see from your phone.",
      ar: "كم مضى على آخر منشور؟ هل يذكرونك على TikTok؟ هل في خيوط Reddit عن العلامة؟ نسحب إشارات الحضور التي لا تراها من جوالك.",
    },
  },
];

function Teardown() {
  const { lang } = useLang();
  return (
    <section className="section section-dark">
      <div className="container">
        <SectionMeta
          idx="01"
          label={lang === "ar" ? "تشريح مجاني · جديد" : "free teardown · new"}
          right={
            <span className="live mono">
              <span className="d" /> {lang === "ar" ? "بدون تسجيل · ٦٠ ثانية" : "NO SIGNUP · 60s"}
            </span>
          }
        />
        <div className="sec-title-row">
          <h2 className="display-2">
            {lang === "ar" ? (
              <>
                شاهد عملك <em>بعين الذكاء</em>.
              </>
            ) : (
              <>
                See your business through <em>the agent&apos;s eyes</em>.
              </>
            )}
          </h2>
          <p className="ss strong" style={{ maxWidth: "44ch" }}>
            {lang === "ar"
              ? "الصق رابط موقعك. تشغّل وكلاؤنا نفس التحليل الذي يقومون به عند استقبال أي منشأة جديدة — بدون تسجيل، بدون بريد إلكتروني، بدون مكالمة مبيعات. النتيجة رابط دائم قابل للمشاركة."
              : "Paste your URL. Our agents run the same analysis they perform when onboarding any new business — no signup, no email gate, no sales call. The result is a permanent, shareable link."}
          </p>
        </div>
        <div className="intel-grid">
          {TEARDOWN_TILES.map((it, i) => (
            <Reveal key={it.t.en} delay={i * 35}>
              <div className="intel-cell">
                <div className="intel-num mono">{it.num}</div>
                <h4 className="intel-t">{it.t[lang]}</h4>
                <p className="intel-msg">{it.msg[lang]}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="ctas" style={{ marginTop: 36, justifyContent: "center" }}>
          <a className="btn primary lg" href="/teardown">
            {lang === "ar" ? "شغّل التشريح المجاني" : "Run a free teardown"} <Arrow size={14} />
          </a>
          <span className="mono" style={{ alignSelf: "center", opacity: 0.55 }}>
            {lang === "ar"
              ? "آخر مثال · arabianteahouse.com · ٥ فروع · ٤٥٬٧٦١ مراجعة · ★ ٤٫٨١"
              : "Recent example · arabianteahouse.com · 5 outlets · 45,761 reviews · ★ 4.81"}
          </span>
        </div>
      </div>
    </section>
  );
}

function NajimBrain() {
  const { lang } = useLang();
  const layers = [
    {
      n: "01",
      t: lang === "ar" ? "ذاكرة العميل" : "Customer memory",
      s: lang === "ar"
        ? "كل عميل تكلّم مع موظفتك — اسمه، طلبه المعتاد، آخر زيارة، حساسياته، شكواه السابقة، تقديره كزبون مميّز أو معرّض للخسارة."
        : "Every customer she's ever spoken to — name, usual order, last visit, dietary notes, prior complaints, VIP / at-risk / lapsed scoring.",
    },
    {
      n: "02",
      t: lang === "ar" ? "معرفة العمل" : "Business knowledge",
      s: lang === "ar"
        ? "قائمة الطعام، الأسعار، ساعات العمل، السياسات، السوشيال، التقييمات. تتحدّث من نفسها كل ليلة حسب التغيير عليك."
        : "Menu, prices, hours, policies, social handles, reviews. Refreshed nightly against any updates you make.",
    },
    {
      n: "03",
      t: lang === "ar" ? "الخزانة" : "The vault",
      s: lang === "ar"
        ? "ملاحظات داخلية تكتبها لها — تفضيلات السلوك، الأسئلة المتكرّرة، قواعد الردّ. ثمانية تصنيفات، مفهرسة بـ pgvector."
        : "The internal notes you write to her — behavior preferences, recurring questions, response rules. Eight categories, pgvector-indexed.",
    },
    {
      n: "04",
      t: lang === "ar" ? "الرسم المعرفي" : "Knowledge graph",
      s: lang === "ar"
        ? "ربط متعدّد القفزات بين الأشخاص والشركات والمواعيد. Graphiti فوق Neo4j. تجيب على أسئلة لا يستطيعها البحث المتّجهي."
        : "Multi-hop links between people, businesses, bookings. Graphiti on Neo4j. Answers queries vector search alone cannot reach.",
    },
    {
      n: "05",
      t: lang === "ar" ? "دورة الحلم" : "Dream cycle",
      s: lang === "ar"
        ? "كل ليلة الساعة ٢ صباحاً: تنظيف، استخراج كيانات، كشف تناقضات، صياغة قواعد جديدة. تستيقظ موظفتك أكثر ذكاءً كل صباح."
        : "Every night at 2am: dedup, entity extraction, contradiction detection, rule drafting. She wakes up smarter every morning.",
    },
    {
      n: "06",
      t: lang === "ar" ? "بروتوكول MCP" : "MCP protocol",
      s: lang === "ar"
        ? "موظفتك متّصلة بالدماغ عبر MCP — يستعمله أيضاً Claude وCursor وOpenClaw. مفتوح، لا يحبسك بنا."
        : "She connects to the brain via MCP — the same protocol Claude, Cursor, and OpenClaw use. Open. We don't lock you in.",
    },
  ];
  return (
    <section className="section section-dark" style={{ paddingTop: 56, paddingBottom: 56 }}>
      <div className="container">
        <SectionMeta
          idx="BRAIN"
          label={lang === "ar" ? "دماغ نجم" : "the Najim Brain"}
          right={<span className="mono">{lang === "ar" ? "طبقة معرفة موحّدة" : "SHARED KNOWLEDGE LAYER"}</span>}
        />
        <div className="sec-title-row">
          <h2 className="display-2">
            {lang === "ar" ? (
              <>
                المعرفة الجماعية<br />
                التي لا تستقيل.
              </>
            ) : (
              <>
                Institutional knowledge<br />
                <em>that doesn&apos;t quit.</em>
              </>
            )}
          </h2>
          <p className="ss strong" style={{ maxWidth: "48ch" }}>
            {lang === "ar"
              ? "كل موظف بشري ترك عملك، أخذ معه ما يعرف. الدماغ لا. كل ما يصل لموظفتك — كل رسالة، حجز، شكوى، تعليق — يصبح معرفة دائمة لكل موظفة قادمة."
              : "Every human you've ever hired left with what they learned. The Brain doesn't. Every message, booking, complaint, comment that reaches your hire becomes permanent context — for her, and for every hire after her."}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          {layers.map((l, i) => (
            <Reveal key={l.n} delay={i * 40}>
              <div
                style={{
                  padding: "22px 24px",
                  border: "1px solid var(--line, rgba(255,255,255,0.08))",
                  borderRadius: 8,
                  background: "var(--card-bg, rgba(255,255,255,0.02))",
                  height: "100%",
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    color: "#d4924b",
                    marginBottom: 8,
                  }}
                >
                  §{l.n}
                </div>
                <h3
                  style={{
                    fontSize: 18,
                    fontFamily: "var(--serif, Georgia, serif)",
                    fontWeight: 400,
                    margin: "0 0 8px",
                  }}
                >
                  {l.t}
                </h3>
                <p style={{ fontSize: 13, lineHeight: 1.55, opacity: 0.78, margin: 0 }}>{l.s}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div
          style={{
            marginTop: 28,
            padding: "18px 24px",
            border: "1px solid rgba(212,146,75,0.25)",
            borderRadius: 8,
            background: "rgba(212,146,75,0.04)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.85, maxWidth: "62ch", lineHeight: 1.55 }}>
            {lang === "ar" ? (
              <>
                <b style={{ color: "#d4924b" }}>دماغ نجم</b> مبني على <code className="mono" style={{ background: "rgba(0,0,0,0.25)", padding: "1px 6px", borderRadius: 3, fontSize: 12 }}>gbrain</code> + <code className="mono" style={{ background: "rgba(0,0,0,0.25)", padding: "1px 6px", borderRadius: 3, fontSize: 12 }}>Graphiti</code> + <code className="mono" style={{ background: "rgba(0,0,0,0.25)", padding: "1px 6px", borderRadius: 3, fontSize: 12 }}>pgvector</code> · مفتوحة المصدر · يعمل خادمها على بنية تحتية نملكها في الإمارات والسعودية.
              </>
            ) : (
              <>
                <b style={{ color: "#d4924b" }}>The Najim Brain</b> runs on <code className="mono" style={{ background: "rgba(0,0,0,0.25)", padding: "1px 6px", borderRadius: 3, fontSize: 12 }}>gbrain</code> + <code className="mono" style={{ background: "rgba(0,0,0,0.25)", padding: "1px 6px", borderRadius: 3, fontSize: 12 }}>Graphiti</code> + <code className="mono" style={{ background: "rgba(0,0,0,0.25)", padding: "1px 6px", borderRadius: 3, fontSize: 12 }}>pgvector</code> · all open-source · hosted on infrastructure we own in the UAE and Saudi.
              </>
            )}
          </div>
          <a
            href="/brain"
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#d4924b",
              border: "1px solid rgba(212,146,75,0.4)",
              padding: "5px 12px",
              borderRadius: 999,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {lang === "ar" ? "شاهد دماغ يُبنى ←" : "Watch a brain build itself →"}
          </a>
        </div>
      </div>
    </section>
  );
}

function DeliveryModes() {
  const { lang } = useLang();
  return (
    <section className="section" style={{ paddingTop: 40, paddingBottom: 40 }}>
      <div className="container">
        <SectionMeta
          idx="HOW"
          label={lang === "ar" ? "طريقتان للتسليم" : "two ways we ship"}
          right={<span className="mono">{lang === "ar" ? "اختر ما يناسبك" : "PICK YOUR FIT"}</span>}
        />
        <div className="sec-title-row">
          <h2 className="display-2">
            {lang === "ar" ? (
              <>
                عن بُعد، <em>أو داخل عملك.</em>
              </>
            ) : (
              <>
                Remote, <em>or inside your business.</em>
              </>
            )}
          </h2>
          <p className="ss strong" style={{ maxWidth: "44ch" }}>
            {lang === "ar"
              ? "معظم الشركات تكفيها الطريقة عن بُعد — مكالمة كيكأوف، نبني عن بُعد، تستلم خلال ١٠ أيام. للمعقّدة منها: موظف نجم يحضر إليك ٣٠ يوم."
              : "Most businesses ship remote — kickoff call, we build off-site, you go live in 10 days. The complex ones: a Najim operator embeds inside your business for a 30-day sprint."}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 18,
          }}
        >
          {/* Remote */}
          <div
            style={{
              border: "1px solid var(--line, rgba(255,255,255,0.1))",
              borderRadius: 12,
              padding: "28px 30px",
              background: "var(--card-bg, rgba(255,255,255,0.02))",
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                opacity: 0.55,
                marginBottom: 10,
              }}
            >
              {lang === "ar" ? "الافتراضي · أغلب العملاء" : "Default · most customers"}
            </div>
            <h3 style={{ fontSize: 26, fontFamily: "var(--serif, Georgia, serif)", fontWeight: 400, margin: "0 0 10px" }}>
              {lang === "ar" ? "عن بُعد · ١٠ أيام" : "Remote · 10 days"}
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.82, marginBottom: 16 }}>
              {lang === "ar"
                ? "مكالمة كيكأوف ٢٠ دقيقة على واتساب. نبني الموظفة عندنا — وجه، صوت، سيرة، تدريب، تكاملات. تستلمها يوم العاشر على رقم واتساب جديد."
                : "20-minute kickoff call over WhatsApp. We build the hire off-site — face, voice, CV, training, integrations. She lands on your new WhatsApp number on Day 10."}
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", display: "grid", gap: 8 }}>
              {(lang === "ar"
                ? ["كيكأوف عن بُعد · ٢٠ دقيقة", "بناء وتدريب ٧–٨ أيام", "موافقتك على الصوت والوجه يوم ٩", "إطلاق يوم ١٠", "خط مباشر بعد الإطلاق"]
                : ["Remote kickoff · 20 minutes", "Build + training: 7–8 days", "You approve voice + face on Day 9", "Live on Day 10", "Direct line stays open post-launch"]
              ).map((it) => (
                <li key={it} style={{ display: "flex", gap: 10, fontSize: 13, opacity: 0.85 }}>
                  <span style={{ color: "#d4924b" }}>→</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                paddingTop: 14,
                borderTop: "1px solid var(--line, rgba(255,255,255,0.06))",
              }}
            >
              <span className="mono" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>
                {lang === "ar" ? "السعر" : "Price"}
              </span>
              <span style={{ fontSize: 18, fontFamily: "var(--serif, Georgia, serif)" }}>
                AED 5,000 / mo + 3,500 setup
              </span>
            </div>
          </div>

          {/* On-site sprint */}
          <div
            style={{
              border: "1px solid rgba(212,146,75,0.35)",
              borderRadius: 12,
              padding: "28px 30px",
              background: "linear-gradient(180deg, rgba(212,146,75,0.05) 0%, rgba(212,146,75,0.01) 100%)",
              position: "relative",
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#d4924b",
                marginBottom: 10,
              }}
            >
              {lang === "ar" ? "للحالات المعقّدة" : "When complexity demands it"}
            </div>
            <h3 style={{ fontSize: 26, fontFamily: "var(--serif, Georgia, serif)", fontWeight: 400, margin: "0 0 10px" }}>
              {lang === "ar" ? "سبرنت داخلي · ٣٠ يوم" : "On-site sprint · 30 days"}
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.86, marginBottom: 16 }}>
              {lang === "ar"
                ? "موظف نجم يحضر داخل عملك ٣٠ يوماً. يجلس مع فريقك، يرسم كل سير العمل، يدرّب الموظفة على محادثاتك الفعلية، ويسلّم الفريق على لوحة التحكّم. لمكاتب العقار، السلاسل، العيادات متعدّدة الفروع."
                : "A Najim operator embeds inside your business for 30 days. They sit with your team, map every workflow, train the hire against your actual conversation logs, and walk your team through the dashboard. Used by brokerages, multi-outlet restaurants, and clinics."}
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", display: "grid", gap: 8 }}>
              {(lang === "ar"
                ? ["موظف نجم داخل عملك · ٣٠ يوم", "رسم كل سير العمل (ليس واتساب فقط)", "تدريب الموظفة على سجلّاتك الفعلية", "نقل ملكية اللوحة لفريقك", "إعداد ميتا + تكاملات أعمق"]
                : ["Najim operator on-site · 30 days", "Map every workflow (not just WhatsApp)", "Train the hire against your real logs", "Hand over the dashboard to your team", "Meta verification + deeper integrations"]
              ).map((it) => (
                <li key={it} style={{ display: "flex", gap: 10, fontSize: 13, opacity: 0.88 }}>
                  <span style={{ color: "#d4924b" }}>→</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                paddingTop: 14,
                borderTop: "1px solid rgba(212,146,75,0.2)",
              }}
            >
              <span className="mono" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#d4924b" }}>
                {lang === "ar" ? "السعر" : "Price"}
              </span>
              <span style={{ fontSize: 18, fontFamily: "var(--serif, Georgia, serif)", color: "#d4924b" }}>
                {lang === "ar" ? "اتصل بنا · ~٣× عن بُعد" : "Talk to us · ~3× remote"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function NajimLaws() {
  const { lang } = useLang();
  const LAWS_EN = [
    "The unit is a hire, not a tool.",
    "If she doesn't sound like your business in 10 days, you don't pay.",
    "Voice notes ship in her own voice, or they don't ship.",
    "She doesn't say she's AI unless your customer asks.",
    "Arabic isn't a setting. It's the default.",
    "The Brain is the team that stays. Not the person you called.",
  ];
  const LAWS_AR = [
    "الوحدة موظفة، مو أداة.",
    "إذا ما طلعت بصوت عملك خلال ١٠ أيام، ما تدفع.",
    "الرسائل الصوتية تطلع بصوتها هي، أو ما تطلع.",
    "ما تقول إنها ذكاء اصطناعي إلا إذا سألها الزبون.",
    "العربية مو إعداد. هي الأصل.",
    "الدماغ هو الفريق الذي يبقى. مو الشخص الذي اتصلت به.",
  ];
  const laws = lang === "ar" ? LAWS_AR : LAWS_EN;
  return (
    <section className="section" style={{ paddingTop: 40, paddingBottom: 40 }}>
      <div className="container">
        <SectionMeta
          idx="LAW"
          label={lang === "ar" ? "قوانين نجم" : "the Najim laws"}
          right={
            <span className="mono">
              {lang === "ar" ? `${laws.length} التزامات` : `${laws.length} COMMITMENTS`}
            </span>
          }
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
            marginTop: 18,
          }}
        >
          {laws.map((law, i) => (
            <Reveal key={i} delay={i * 40}>
              <div
                style={{
                  padding: "20px 22px",
                  border: "1px solid var(--line, rgba(255,255,255,0.08))",
                  borderRadius: 8,
                  background: "var(--card-bg, rgba(255,255,255,0.02))",
                  display: "flex",
                  gap: 14,
                  alignItems: "baseline",
                  minHeight: 96,
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    color: "#d4924b",
                    flexShrink: 0,
                    paddingTop: 2,
                  }}
                >
                  §{String(i + 1).padStart(2, "0")}
                </span>
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.45,
                    margin: 0,
                    opacity: 0.92,
                    fontFamily: "var(--serif, Georgia, serif)",
                  }}
                >
                  {law}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function WithoutWith() {
  const { lang } = useLang();
  const rows = [
    {
      bad: lang === "ar" ? "٣ ساعات يومياً على واتساب" : "3 hours a day replying to WhatsApp",
      good: lang === "ar" ? "ردود في ٩٠ ثانية بالعربية والإنجليزية، ٢٤/٧" : "90-second replies in Arabic + English, 24/7",
    },
    {
      bad: lang === "ar" ? "تخسر الزبائن منتصف الليل لأن ما حد يردّ" : "Leads ghost at midnight because no one answers",
      good: lang === "ar" ? "كل رسالة لها ردّ خلال ٩٠ ثانية" : "Every message gets a reply within 90 seconds",
    },
    {
      bad: lang === "ar" ? "التوظيف ٦ أسابيع، يستقيل خلال ٦ أشهر" : "Hiring takes 6 weeks. They quit in 6 months",
      good: lang === "ar" ? "تباشر بعد ١٠ أيام عمل، ما تستقيل" : "Live in 10 working days, never quits",
    },
    {
      bad: lang === "ar" ? "الزبون العربي يحصل ترجمة إنجليزية رديئة" : "Arabic customers get awkward English replies",
      good: lang === "ar" ? "رسائل صوتية بعربية سعودية كأصل" : "Native Saudi-Arabic voice notes by default",
    },
    {
      bad: lang === "ar" ? "تنسى مين من الزبائن مميّز" : "You forget which customer is a VIP",
      good: lang === "ar" ? "تتذكّر كل زبون بالاسم وآخر زيارة" : "She remembers every customer by name and last visit",
    },
    {
      bad: lang === "ar" ? "تكتب كابشن وترد على DM بين مكالمات العملاء" : "You write captions + reply to DMs between real work",
      good: lang === "ar" ? "هي تتولّى الكل — أنت تشتغل على ما لا يستطيعه غيرك" : "She handles all of it — you handle the work only you can do",
    },
  ];
  return (
    <section className="section" style={{ paddingTop: 40, paddingBottom: 40 }}>
      <div className="container">
        <SectionMeta
          idx="02b"
          label={lang === "ar" ? "بدون نجم · مع نجم" : "without Najim · with Najim"}
          right={
            <span className="mono">
              {lang === "ar" ? `${rows.length} مقارنات` : `${rows.length} BEHAVIORS`}
            </span>
          }
        />
        <div className="sec-title-row">
          <h2 className="display-2">
            {lang === "ar" ? (
              <>
                ست عادات يومية،<br />
                <em>كلها تختفي.</em>
              </>
            ) : (
              <>
                Six daily habits,<br />
                <em>all gone.</em>
              </>
            )}
          </h2>
          <p className="ss strong" style={{ maxWidth: "44ch" }}>
            {lang === "ar"
              ? "كم منها يخصّك؟ كلها سلوكيات حقيقية لأصحاب أعمال في الإمارات والسعودية، ليست أرقام مالية."
              : "How many of these are you? Behavioral patterns from real UAE / Saudi SMB owners — not financial estimates."}
          </p>
        </div>

        <div
          style={{
            border: "1px solid var(--line, rgba(255,255,255,0.08))",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              fontFamily: "var(--mono, monospace)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              opacity: 0.55,
              padding: "12px 20px",
              borderBottom: "1px solid var(--line, rgba(255,255,255,0.08))",
            }}
          >
            <span>{lang === "ar" ? "بدون نجم" : "Without Najim"}</span>
            <span style={{ color: "#d4924b" }}>{lang === "ar" ? "مع نجم" : "With Najim"}</span>
          </div>
          {rows.map((r, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                padding: "16px 20px",
                borderBottom:
                  i < rows.length - 1
                    ? "1px solid var(--line, rgba(255,255,255,0.05))"
                    : "none",
                alignItems: "baseline",
                fontSize: 14,
                lineHeight: 1.5,
                gap: 16,
              }}
            >
              <span style={{ opacity: 0.6, textDecoration: "line-through", textDecorationColor: "rgba(255,255,255,0.25)" }}>
                {r.bad}
              </span>
              <span style={{ fontWeight: 500, opacity: 0.95 }}>
                <span style={{ color: "#d4924b", marginRight: 8 }}>→</span>
                {r.good}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NajimICP() {
  const { lang } = useLang();
  const FIT = lang === "ar"
    ? [
        "صاحب عمل في الإمارات أو السعودية (١–٥٠ موظف)",
        "واتساب ≈ ٦٠٪ من محادثات العملاء",
        "ساعتان يومياً على الأقل ترد فيها بنفسك على الرسائل",
        "تفضّل التوظيف على البناء التقني",
        "مرتاح بعلاقة مباشرة مع المؤسّسين على واتساب",
      ]
    : [
        "UAE or Saudi SMB owner (1–50 employees)",
        "WhatsApp is ~60% of customer conversations",
        "You spend 2+ hours/day replying yourself",
        "You'd rather hire than build",
        "You're comfortable with a founder-direct WhatsApp relationship",
      ];
  const NOT_FIT = lang === "ar"
    ? [
        "تبحث عن روبوت دردشة تضبطه بنفسك (جرّب Chatbase)",
        "تريد بناء وكيل الذكاء الخاص بك (المصدر المفتوح متاح)",
        "تعمل خارج منطقة الخليج (نحن في الإمارات والسعودية فقط لحد الآن)",
      ]
    : [
        "You want a self-serve chatbot you configure (use Chatbase)",
        "You want to build your own AI agent (the open-source stack is right there)",
        "You operate outside MENA (we don't ship beyond UAE & KSA yet)",
      ];
  return (
    <section className="section section-dark" style={{ paddingTop: 56, paddingBottom: 56 }}>
      <div className="container">
        <SectionMeta
          idx="ICP"
          label={lang === "ar" ? "هل أنت من نحن نخدمهم؟" : "is Najim for you?"}
          right={<span className="mono">{lang === "ar" ? "تأهّل ذاتي" : "SELF-QUALIFY"}</span>}
        />
        <div className="sec-title-row">
          <h2 className="display-2">
            {lang === "ar" ? (
              <>
                <em>نقول لا</em>،<br />
                إذا ما كنّا الحلّ.
              </>
            ) : (
              <>
                We&apos;ll <em>say no</em>,<br />
                if we&apos;re not the fit.
              </>
            )}
          </h2>
          <p className="ss strong" style={{ maxWidth: "44ch" }}>
            {lang === "ar"
              ? "نجم خدمة بشرية، مو منصة. ١٠ أيام من وقت المؤسّسين الفعلي على كل توظيف — لذلك ما نأخذ كل عميل. وفّر علينا الوقت."
              : "Najim is a hands-on service, not a SaaS. 10 days of real founder time per hire — so we don't take every customer. Save us both the call."}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
        >
          <div
            style={{
              padding: 28,
              border: "1px solid rgba(93,138,74,0.3)",
              borderRadius: 10,
              background: "rgba(93,138,74,0.04)",
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--green, #5d8a4a)",
                marginBottom: 14,
              }}
            >
              {lang === "ar" ? "نجم مناسب لك إذا" : "Najim is for you if"}
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {FIT.map((b, i) => (
                <li key={i} style={{ display: "flex", gap: 10, fontSize: 14, lineHeight: 1.55 }}>
                  <span style={{ color: "var(--green, #5d8a4a)", flexShrink: 0 }}>✓</span>
                  <span style={{ opacity: 0.92 }}>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div
            style={{
              padding: 28,
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              background: "rgba(255,255,255,0.015)",
              opacity: 0.78,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                opacity: 0.65,
                marginBottom: 14,
              }}
            >
              {lang === "ar" ? "نجم مو مناسب إذا" : "Najim is NOT for you if"}
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {NOT_FIT.map((b, i) => (
                <li key={i} style={{ display: "flex", gap: 10, fontSize: 14, lineHeight: 1.55 }}>
                  <span style={{ color: "#888", flexShrink: 0 }}>✗</span>
                  <span style={{ opacity: 0.75 }}>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function PositionLine() {
  const { lang } = useLang();
  return (
    <section style={{ padding: "0 0 16px" }}>
      <div className="container">
        <div
          style={{
            borderTop: "1px solid var(--line, rgba(255,255,255,0.06))",
            borderBottom: "1px solid var(--line, rgba(255,255,255,0.06))",
            padding: "28px 0",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <p
            style={{
              maxWidth: "44ch",
              margin: 0,
              fontSize: "clamp(20px, 2.6vw, 28px)",
              lineHeight: 1.3,
              fontFamily: "var(--serif, Georgia, serif)",
              fontStyle: "italic",
              textAlign: "center",
              opacity: 0.92,
            }}
          >
            {lang === "ar" ? (
              <>
                ما عندك مشكلة <em style={{ fontStyle: "normal", color: "#d4924b" }}>ذكاء اصطناعي</em>.
                <br />
                عندك مشكلة <em style={{ fontStyle: "normal", color: "#d4924b" }}>توظيف</em>.
                <br />
                نحن حللناها.
              </>
            ) : (
              <>
                You don&apos;t have an <em style={{ fontStyle: "normal", color: "#d4924b" }}>AI problem</em>.
                <br />
                You have a <em style={{ fontStyle: "normal", color: "#d4924b" }}>hiring problem</em>.
                <br />
                We solved hiring.
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

function TheMath() {
  const { lang } = useLang();

  const oldWay = [
    { role: lang === "ar" ? "موظف خدمة عملاء" : "Customer-service rep", cost: 7000, src: "GulfTalent 2026" },
    { role: lang === "ar" ? "منسّق تسويق" : "Marketing coordinator", cost: 14000, src: "GulfTalent 2026" },
    { role: lang === "ar" ? "موظف استقبال ثنائي اللغة" : "Bilingual receptionist", cost: 4500, src: "Indeed UAE" },
  ];
  const oldTotal = oldWay.reduce((acc, r) => acc + r.cost, 0);

  return (
    <section className="section">
      <div className="container">
        <SectionMeta
          idx="01"
          label={lang === "ar" ? "الحساب" : "the math"}
          right={<span className="mono">{lang === "ar" ? "د.إ · شهرياً" : "AED · MONTHLY"}</span>}
        />
        <div className="sec-title-row">
          <h2 className="display-2">
            {lang === "ar" ? (
              <>
                نفس الوظيفة. <em>ثُلث التكلفة.</em>
              </>
            ) : (
              <>
                Same job. <em>One-fifth the cost.</em>
              </>
            )}
          </h2>
          <p className="ss strong" style={{ maxWidth: "44ch" }}>
            {lang === "ar"
              ? "كم تكلّفك خدمة العملاء فعلياً اليوم — مقابل ما تدفعه معنا. أرقام رواتب فعلية من جلف تالنت وإنديد."
              : "What customer service actually costs you today, vs. what you pay us. Real salary medians from GulfTalent and Indeed."}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {/* Old way */}
          <div
            style={{
              border: "1px solid var(--line, rgba(255,255,255,0.08))",
              borderRadius: 10,
              padding: "28px 28px 24px",
              background: "var(--card-bg, rgba(255,255,255,0.015))",
              opacity: 0.78,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                opacity: 0.6,
                marginBottom: 14,
              }}
            >
              {lang === "ar" ? "الطريقة القديمة" : "The old way"}
            </div>
            <h3
              style={{
                fontSize: 24,
                margin: "0 0 18px",
                fontFamily: "var(--serif, Georgia, serif)",
                fontWeight: 400,
                lineHeight: 1.2,
              }}
            >
              {lang === "ar"
                ? "وظّف ثلاثة موظفين. ادفع ٢٥٬٥٠٠ د.إ."
                : "Hire three people. Pay AED 25,500."}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
              {oldWay.map((r) => (
                <div key={r.role} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 14, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div>
                    <div>{r.role}</div>
                    <div className="mono" style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{r.src}</div>
                  </div>
                  <span className="mono" style={{ opacity: 0.8 }}>AED {r.cost.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
              <span className="mono" style={{ fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {lang === "ar" ? "إجمالي شهري" : "Monthly total"}
              </span>
              <span style={{ fontSize: 28, fontFamily: "var(--serif, Georgia, serif)", fontWeight: 400 }}>
                AED {oldTotal.toLocaleString()}
              </span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.55, opacity: 0.55, margin: 0 }}>
              {lang === "ar"
                ? "+ تأشيرات + مكافأة نهاية الخدمة + ٦ أسابيع توظيف. أغلبهم يستقيل خلال ٦ أشهر، فتُكرّر الدورة."
                : "+ visas + EOS gratuities + 6-week recruiting cycle. Most quit within 6 months. You repeat the cycle."}
            </p>
          </div>

          {/* New way */}
          <div
            style={{
              border: "1px solid var(--green, #5d8a4a)",
              borderRadius: 10,
              padding: "28px 28px 24px",
              background: "linear-gradient(180deg, rgba(93,138,74,0.06) 0%, rgba(93,138,74,0.015) 100%)",
              position: "relative",
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--green, #5d8a4a)",
                marginBottom: 14,
              }}
            >
              {lang === "ar" ? "مع نجم" : "With Najim"}
            </div>
            <h3
              style={{
                fontSize: 24,
                margin: "0 0 18px",
                fontFamily: "var(--serif, Georgia, serif)",
                fontWeight: 400,
                lineHeight: 1.2,
              }}
            >
              {lang === "ar"
                ? "موظفة واحدة. ١٠ أيام. للأبد."
                : "One teammate. Ten days. Forever."}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 14, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div>
                  <div>{lang === "ar" ? "موظفة ذكاء مخصّصة لعملك" : "Bespoke AI teammate"}</div>
                  <div className="mono" style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>
                    {lang === "ar" ? "اسم · وجه · صوت · سيرة ذاتية" : "name · face · voice · CV"}
                  </div>
                </div>
                <span className="mono" style={{ opacity: 0.8 }}>AED 5,000</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 14, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div>
                  <div>{lang === "ar" ? "تركيب لمرة واحدة" : "One-time setup"}</div>
                  <div className="mono" style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>
                    {lang === "ar" ? "إعداد ميتا + تدريب + تكاملات" : "Meta verification + training + integrations"}
                  </div>
                </div>
                <span className="mono" style={{ opacity: 0.8 }}>AED 3,500</span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
              <span className="mono" style={{ fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {lang === "ar" ? "إجمالي شهري" : "Monthly total"}
              </span>
              <span style={{ fontSize: 28, fontFamily: "var(--serif, Georgia, serif)", fontWeight: 400, color: "var(--green, #5d8a4a)" }}>
                AED 5,000
              </span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.55, opacity: 0.7, margin: 0 }}>
              {lang === "ar"
                ? "بلا تأشيرات · بلا مكافأة نهاية خدمة · بلا توظيف · بلا استقالات · جاهزة على واتساب خلال ١٠ أيام."
                : "No visas · no EOS · no recruiting · never quits · live on WhatsApp in 10 working days."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pain() {
  const { lang } = useLang();
  return (
    <section className="section section-tight">
      <div className="container">
        <SectionMeta
          idx="02"
          label={lang === "ar" ? "المشكلة" : "the problem"}
          right={<span className="mono">{lang === "ar" ? "~٣٠ س/أسبوع" : "~30h/week"}</span>}
        />
        <div className="sec-title-row">
          <h2 className="display-2">
            {lang === "ar" ? (
              <>
                تقوم بعمل <em>ستة أشخاص</em>.
              </>
            ) : (
              <>
                You&apos;re doing the <em>work of 6 people</em>.
              </>
            )}
          </h2>
          <p className="ss strong" style={{ maxWidth: "44ch" }}>
            {lang === "ar"
              ? "التوظيف مكلف. التدريب يأخذ شهوراً. تحتاج مساعدة — ولكن ليست بكلفة ١٠٬٠٠٠ درهم شهرياً للموظف."
              : "Hiring is expensive. Training takes months. Turnover is constant. You need help — but not the kind that costs AED 10,000 a month per head."}
          </p>
        </div>
        <div className="pain-grid">
          {PAIN.map((p, i) => (
            <Reveal key={p.code} delay={i * 50}>
              <div className="pain-cell">
                <div className="pain-num">{p.code}</div>
                <div className="pain-time">{p.t[lang]}</div>
                <div className="pain-msg">{p.msg[lang]}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function AgentsSection() {
  const { lang } = useLang();
  return (
    <section id="team" className="section section-dark">
      <div className="container">
        <SectionMeta
          idx="02"
          label={lang === "ar" ? "تعرّف على الفريق" : "meet your team"}
          right={
            <span className="mono">
              {AGENTS.length} {lang === "ar" ? "متاحون للتوظيف" : "AVAILABLE FOR HIRE"}
            </span>
          }
        />
        <div className="sec-title-row">
          <h2 className="display-2">
            {lang === "ar" ? (
              <>
                <em>{AGENTS.length} موظفين</em> جاهزون<br />
                للالتحاق بعملك.
              </>
            ) : (
              <>
                <em>{AGENTS.length} hires</em> ready<br />
                to start Monday.
              </>
            )}
          </h2>
          <p className="ss strong" style={{ maxWidth: "44ch" }}>
            {lang === "ar"
              ? "كل واحد منهم سيرة ذاتية. اسم. وجه. صوت. تخصّص. لا روبوتات بنصوص جاهزة — شخصيّات حقيقية بذاكرة تمتدّ لأشهر، تتدرّب على عملك، وتتحسّن كل ليلة."
              : "Each one has a CV. A name. A face. A voice. A specialty. Not bots running scripts — real personalities with months-long memory, trained on your business, getting better every night."}
          </p>
        </div>
        <div className="agent-grid">
          {AGENTS.map((a, i) => (
            <Reveal key={a.id} delay={i * 40}>
              <AgentCard a={a} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function NeuralBar() {
  const { lang } = useLang();
  return (
    <div className="neural">
      <div className="neural-track">
        <div className="neural-fill" />
        <div className="neural-pulse" />
      </div>
      <div className="neural-labels mono">
        <span>{lang === "ar" ? "٢٢:٠٠ · إقفال المحادثات" : "22:00 · Conversations close"}</span>
        <span>{lang === "ar" ? "٠٢:٠٠ · صياغة القواعد" : "02:00 · Rules drafted"}</span>
        <span>{lang === "ar" ? "٠٤:٠٠ · تحقّق A/B" : "04:00 · A/B verified"}</span>
        <span>{lang === "ar" ? "٠٩:٠٠ · مباشر مع الموجز" : "09:00 · Live + briefed"}</span>
      </div>
    </div>
  );
}

function Intelligence() {
  const { lang } = useLang();
  return (
    <section className="section section-dark">
      <div className="container">
        <SectionMeta
          idx="04"
          label={lang === "ar" ? "محرّك الذكاء" : "the intelligence engine"}
          right={
            <span className="mono live">
              <span className="d" />{" "}
              {lang === "ar" ? "يتطوّر ذاتياً · ليلاً" : "SELF-IMPROVING · NIGHTLY"}
            </span>
          }
        />
        <div className="sec-title-row">
          <h2 className="display-2">
            {lang === "ar" ? (
              <>
                يصبح <em>أذكى</em> كل ليلة.
              </>
            ) : (
              <>
                Gets <em>smarter</em>
                <br />
                every single night.
              </>
            )}
          </h2>
          <p className="ss strong" style={{ maxWidth: "44ch" }}>
            {lang === "ar"
              ? "أغلب الأنظمة تتجمّد بعد التشغيل. نظامنا يحلّل أداءه، يكتب قواعد جديدة، ويتواصل مع العملاء استباقياً — بدون تدخّل منك."
              : "Most AI stays static after deployment. Ours analyzes its own performance, writes new rules, and proactively reaches out to customers — without you lifting a finger."}
          </p>
        </div>
        <div className="intel-grid">
          {INTELLIGENCE.map((it, i) => (
            <Reveal key={it.t.en} delay={i * 35}>
              <div className="intel-cell">
                <div className="intel-num mono">{String(i + 1).padStart(2, "0")}</div>
                <h4 className="intel-t">{it.t[lang]}</h4>
                <p className="intel-msg">{it.msg[lang]}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <NeuralBar />
      </div>
    </section>
  );
}

/* ─── Message Anatomy (Customer → Backend → Owner) ─── */

interface TraceEvent {
  lane: "in" | "be" | "out";
  t: string;
  k: string;
  v: string;
  tag: "edge" | "router" | "memory" | "kb" | "tool" | "llm" | "ledger" | "learn";
}

const TRACE_EVENTS: TraceEvent[] = [
  { lane: "in", t: "19:42:01.124", k: "INBOUND_MSG", v: "whatsapp · +966•••843", tag: "edge" },
  { lane: "be", t: "19:42:01.198", k: "INTENT_CLASSIFY", v: "booking · 0.94", tag: "router" },
  { lane: "be", t: "19:42:01.241", k: "LANG_DETECT", v: "ar-SA · gulf", tag: "router" },
  { lane: "be", t: "19:42:01.302", k: "MEMORY_LOOKUP", v: "cust_8843 · Mohammed · 9 visits", tag: "memory" },
  { lane: "be", t: "19:42:01.364", k: "PREF_RECALL", v: "table 12 · usual · vip_tier", tag: "memory" },
  { lane: "be", t: "19:42:01.421", k: "KNOWLEDGE_QUERY", v: "availability · 21:00 · party_4", tag: "kb" },
  { lane: "be", t: "19:42:01.498", k: "TOOL_CALL", v: "calendar.reserve(t12, 21:00)", tag: "tool" },
  { lane: "be", t: "19:42:01.612", k: "TOOL_OK", v: "200 · ref BK-44219", tag: "tool" },
  { lane: "be", t: "19:42:01.689", k: "RESPONSE_DRAFT", v: "gulf_arabic · personal", tag: "llm" },
  { lane: "out", t: "19:42:01.812", k: "OUTBOUND_MSG", v: "delivered · 1.2s e2e", tag: "edge" },
  { lane: "be", t: "19:42:01.834", k: "MEMORY_WRITE", v: "last_booking · party · table", tag: "memory" },
  { lane: "be", t: "19:42:01.871", k: "LEDGER_WRITE", v: "owner_brief.vip_tonight", tag: "ledger" },
  { lane: "be", t: "19:42:01.910", k: "LEARNING_QUEUE", v: "rule_candidate · q3", tag: "learn" },
];

function MessageAnatomy() {
  const { lang } = useLang();
  const [step, setStep] = useState(-1);
  const [seen, setSeen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const customer =
    lang === "ar"
      ? {
          in: "السلام عليكم، حابب أحجز لأربعة الليلة الساعة 9",
          out: "أهلاً أبو محمد 👋 محجوز لك. الطاولة 12، 9:00 مساءً، أربعة أشخاص.",
        }
      : {
          in: "Salaam, can I book for 4 tonight at 9?",
          out: "Welcome back, Abu Mohammed 👋 Booked. Table 12, 9:00 PM, party of 4. Same as last time.",
        };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setSeen(true);
            io.disconnect();
          }
        });
      },
      { rootMargin: "-10% 0px -10% 0px", threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);

  useEffect(() => {
    if (!seen) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = (i: number) => {
      setStep(i);
      if (i < TRACE_EVENTS.length - 1) {
        timer = setTimeout(() => tick(i + 1), 240 + (i === 9 ? 200 : 0));
      } else {
        timer = setTimeout(() => tick(-1), 2400);
      }
    };
    tick(0);
    return () => clearTimeout(timer);
  }, [seen]);

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(".trace-events");
    if (el) el.scrollTop = el.scrollHeight;
  }, [step]);

  const beEvents = TRACE_EVENTS.filter((e) => e.lane === "be");
  const beShown = TRACE_EVENTS.slice(0, step + 1).filter((e) => e.lane === "be");
  const inShown = step >= 0;
  const outShown = step >= 9;
  const ledgerWritten = step >= 11;
  const memoryWritten = step >= 10;
  const learningQueued = step >= 12;

  return (
    <section className="section">
      <div className="container">
        <SectionMeta
          idx="05"
          label={lang === "ar" ? "تشريح رسالة واحدة" : "anatomy of a single message"}
          right={
            <span className="live mono">
              <span className="d" /> {lang === "ar" ? "تتبّع مباشر" : "LIVE TRACE"}
            </span>
          }
        />
        <div className="sec-title-row">
          <h2 className="display tight">
            {lang === "ar" ? (
              <>
                من رسالة الزبون
                <br />
                إلى <em>قرار المالك</em>.
              </>
            ) : (
              <>
                From one customer DM
                <br />
                to your <em>morning brief</em>.
              </>
            )}
          </h2>
          <p className="ss strong">
            {lang === "ar" ? (
              <>
                كل رسالة تمر بسلسلة قرارات. هذا ما يحدث فعلاً <b>خلف الكواليس</b> في الثانية الأولى.
              </>
            ) : (
              <>
                Every WhatsApp message walks through a decision chain. Here&apos;s what actually
                happens <b>on the backend</b> in the first 1.2 seconds — and what lands on your
                phone in the morning.
              </>
            )}
          </p>
        </div>

        <div className="anatomy" ref={wrapRef}>
          {/* LANE 1 — CUSTOMER */}
          <div className="lane lane-customer">
            <div className="lane-hd">
              <div className="lane-num mono">01</div>
              <div className="lane-t">{lang === "ar" ? "الزبون" : "Customer"}</div>
              <div className="lane-tag mono">
                {lang === "ar" ? "واتساب · وارد" : "whatsapp · inbound"}
              </div>
            </div>
            <div className="lane-body lane-thread">
              <div className="lt-msg lt-cust" style={{ opacity: inShown ? 1 : 0 }}>
                <div className="lt-bubble">{customer.in}</div>
                <div className="lt-t mono">19:42</div>
              </div>
              {outShown && (
                <div className="lt-msg lt-ai" style={{ animation: "lt-pop .3s ease-out both" }}>
                  <div className="lt-bubble">{customer.out}</div>
                  <div className="lt-t mono">
                    19:42 <span className="lt-tick">✓✓</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LANE 2 — BACKEND */}
          <div className="lane lane-backend">
            <div className="lane-hd">
              <div className="lane-num mono">02</div>
              <div className="lane-t">{lang === "ar" ? "المعالجة" : "Backend"}</div>
              <div className="lane-tag mono">
                <span
                  className="d-pulse"
                  style={{ opacity: step >= 0 && step < TRACE_EVENTS.length - 1 ? 1 : 0.25 }}
                />
                {lang === "ar"
                  ? step < 9
                    ? "قيد المعالجة"
                    : step < TRACE_EVENTS.length - 1
                      ? "قيد الكتابة"
                      : "خامل"
                  : step < 9
                    ? "processing"
                    : step < TRACE_EVENTS.length - 1
                      ? "writing"
                      : "idle"}
              </div>
            </div>
            <div className="lane-body trace-events">
              {beEvents.map((e, i) => {
                const fired = beShown.includes(e);
                return (
                  <div key={i} className={`trace-row ${fired ? "fired" : ""} tag-${e.tag}`}>
                    <span className="trace-t mono">{e.t}</span>
                    <span className={`trace-tag tag-${e.tag} mono`}>{e.tag}</span>
                    <span className="trace-k mono">{e.k}</span>
                    <span className="trace-v mono">{e.v}</span>
                  </div>
                );
              })}
            </div>
            <div className="lane-foot mono">
              <span>{lang === "ar" ? "زمن الاستجابة p50: ١٫١٨ث" : "p50 latency 1.18s"}</span>
              <span>·</span>
              <span>
                {beShown.length}/{beEvents.length} {lang === "ar" ? "حدث" : "events"}
              </span>
              <span>·</span>
              <span>{lang === "ar" ? "الكلفة $٠٫٠٠٣٤" : "cost $0.0034"}</span>
            </div>
          </div>

          {/* LANE 3 — OWNER BRAIN */}
          <div className="lane lane-owner">
            <div className="lane-hd">
              <div className="lane-num mono">03</div>
              <div className="lane-t">{lang === "ar" ? "العقل المالك" : "Owner Brain"}</div>
              <div className="lane-tag mono">
                {lang === "ar" ? "موجز · ٠٩:٠٠ صباح الغد" : "brief · 09:00 next day"}
              </div>
            </div>
            <div className="lane-body owner-body">
              <div className="owner-greet">
                {lang === "ar" ? "صباح الخير، خالد ☀️" : "Good morning, Khaled ☀️"}
              </div>
              <div className="owner-blk">
                <div className="owner-blk-t mono">
                  {lang === "ar" ? "VIP الليلة" : "VIP TONIGHT"}
                </div>
                <div className={`owner-line ${ledgerWritten ? "written" : ""}`}>
                  <span className="owner-bullet" />
                  {lang === "ar"
                    ? "أبو محمد · حجز الطاولة ١٢ · ٩ زيارات · يحب الكبسة"
                    : "Abu Mohammed · Table 12 · 9th visit · loves kabsa"}
                  {ledgerWritten && (
                    <span className="owner-stamp mono">{lang === "ar" ? "+ سجلّ" : "+ ledger"}</span>
                  )}
                </div>
              </div>
              <div className="owner-blk">
                <div className="owner-blk-t mono">
                  {lang === "ar" ? "تحديث الذاكرة" : "MEMORY UPDATED"}
                </div>
                <div className={`owner-line owner-line-mem ${memoryWritten ? "written" : ""}`}>
                  <span className="owner-bullet" />
                  cust_8843.last_booking ← 2024-Q4
                  {memoryWritten && (
                    <span className="owner-stamp mono">{lang === "ar" ? "+ ذاكرة" : "+ memory"}</span>
                  )}
                </div>
              </div>
              <div className="owner-blk">
                <div className="owner-blk-t mono">
                  {lang === "ar" ? "التعلّم" : "LEARNING"}
                </div>
                <div className={`owner-line owner-line-learn ${learningQueued ? "written" : ""}`}>
                  <span className="owner-bullet" />
                  {lang === "ar"
                    ? "قاعدة مرشّحة: حجوزات الجمعة ٩م → اقترح الطاولة ١٢"
                    : "Rule candidate: Fri 9pm bookings → suggest table 12"}
                  {learningQueued && (
                    <span className="owner-stamp mono">{lang === "ar" ? "+ طابور" : "+ queue"}</span>
                  )}
                </div>
              </div>
              <div className="owner-foot mono">
                {lang === "ar" ? "يصلك صباحاً الساعة 9:00" : "Delivered to you 09:00 daily"}
              </div>
            </div>
          </div>

          {/* CONNECTORS */}
          <svg
            className="anatomy-arrow a1"
            viewBox="0 0 40 12"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 6 L36 6 M30 1 L36 6 L30 11"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
          <svg
            className="anatomy-arrow a2"
            viewBox="0 0 40 12"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 6 L36 6 M30 1 L36 6 L30 11"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}

function Industries() {
  const { lang } = useLang();
  return (
    <section className="section">
      <div className="container">
        <SectionMeta
          idx="06"
          label={lang === "ar" ? "حسب القطاع" : "built for your industry"}
          right={<span className="mono">{lang === "ar" ? "٣ قطاعات" : "3 verticals"}</span>}
        />
        <div className="sec-title-row">
          <h2 className="display-2">
            {lang === "ar" ? (
              <>
                مُهيّأ <em>لقطاعك</em>.
              </>
            ) : (
              <>
                Built for <em>your industry</em>.
              </>
            )}
          </h2>
          <p className="ss strong" style={{ maxWidth: "44ch" }}>
            {lang === "ar"
              ? "مُعدّ مسبقاً للأعمال التي تحتاجه أكثر."
              : "Pre-configured for the businesses that need it most."}
          </p>
        </div>
        <div className="ind-grid">
          {INDUSTRIES.map((ind, i) => (
            <Reveal key={ind.t.en} delay={i * 60}>
              <div className="ind-cell">
                <h3 className="ind-t">{ind.t[lang]}</h3>
                <p className="ind-msg">{ind.msg[lang]}</p>
                <ul className="ind-bullets">
                  {ind.bullets.map((b) => (
                    <li key={b.en}>
                      <span className="ac-tick">✓</span> {b[lang]}
                    </li>
                  ))}
                </ul>
                <a
                  className="ind-link mono"
                  href="https://wa.me/12058582516?text=Hi"
                  target="_blank"
                  rel="noreferrer"
                >
                  {lang === "ar" ? "شاهد العرض" : "See demo"} <Arrow size={11} />
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Memory() {
  const { lang } = useLang();
  const c = MEMORY_CARD;
  return (
    <section className="section section-tight">
      <div className="container">
        <SectionMeta
          idx="07"
          label={lang === "ar" ? "الذاكرة الدائمة" : "persistent memory"}
          right={<span className="mono">{lang === "ar" ? "تمتدّ لأشهر" : "SPANS MONTHS"}</span>}
        />
        <div className="mem-grid">
          <div className="mem-card">
            <div className="mem-card-hd">
              <div className="mem-av">{lang === "ar" ? "ل" : "L"}</div>
              <div className="mem-card-name">{c.name[lang]}</div>
              <div className="mem-card-vip mono">VIP</div>
            </div>
            <table className="mem-table">
              <tbody>
                {c.fields.map((f) => (
                  <tr key={f.k.en}>
                    <td className="mem-k mono">{f.k[lang]}</td>
                    <td className="mem-v">{f.v[lang]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mem-foot mono">
              {lang === "ar"
                ? "∞ تُحفظ عبر كل محادثة"
                : "∞ remembered across every conversation"}
            </div>
          </div>
          <div>
            <h2 className="display-2">
              {lang === "ar" ? (
                <>
                  ذكاؤك يتذكّر <em>كل عميل</em>.
                </>
              ) : (
                <>
                  Your AI remembers
                  <br />
                  <em>every customer</em>.
                </>
              )}
            </h2>
            <p className="ss strong" style={{ marginTop: 18 }}>
              {lang === "ar"
                ? "عميل راسلك في يناير، ويتم استقباله باسمه في ديسمبر. تفضيلاته، حساسياته، طلبه المعتاد، تاريخ حجوزاته، ومزاجه — كل شي يُسترجَع فوراً."
                : "A customer who texted in January gets greeted by name in December. Their preferences, allergies, favorite orders, booking history, and sentiment — all recalled instantly."}
            </p>
            <ul className="mem-list">
              {MEMORY_BULLETS.map((m) => (
                <li key={m.en}>
                  <span className="ac-tick">✓</span> {m[lang]}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { lang } = useLang();
  return (
    <section className="section" id="how">
      <div className="container">
        <SectionMeta
          idx="03"
          label={lang === "ar" ? "كيف يجري التوظيف" : "how the hire works"}
          right={
            <span className="mono">
              {lang === "ar" ? "١٠ أيام · لا ١٠ أسابيع" : "10 DAYS · NOT 10 WEEKS"}
            </span>
          }
        />
        <div className="sec-title-row">
          <h2 className="display-2">
            {lang === "ar" ? (
              <>
                موظفتك تباشر العمل <em>خلال ١٠ أيام</em>.
              </>
            ) : (
              <>
                Your hire starts in <em>10 working days.</em>
              </>
            )}
          </h2>
          <p className="ss strong" style={{ maxWidth: "44ch" }}>
            {lang === "ar"
              ? "بدون مطوّرين. بدون إعداد تقني. مكالمة كيكأوف يوم الأول، تعرف على موظفتك يوم الثالث، إطلاق فعلي يوم العاشر. كل شيء بين هذين الموعدين نتولّاه نحن."
              : "No developers. No technical setup. Kickoff call on Day 1, meet your hire on Day 3, live on Day 10. Everything between we handle for you."}
          </p>
        </div>
        <div className="how-grid">
          {HOW.map((s, i) => (
            <Reveal key={s.n} delay={i * 80}>
              <div className="how-cell">
                <div className="how-num">{s.n}</div>
                <div className="how-line" />
                <h3 className="how-t">{s.t[lang]}</h3>
                <p className="how-msg">{s.msg[lang]}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingCardV2({ tier, lang }: { tier: PricingTier; lang: Lang }) {
  return (
    <div className={"pv2-card" + (tier.popular ? " popular" : "")}>
      {tier.popular && (
        <div className="pv2-pop">{lang === "ar" ? "جاهز عندك" : "Done for you"}</div>
      )}
      <div className="pv2-name">{tier.name[lang]}</div>
      <div className="pv2-sub">{tier.sub[lang]}</div>
      <div className="pv2-price">
        <span className="pv2-cur">{lang === "ar" ? "د.إ" : "AED"}</span>
        <span className="pv2-num">{tier.monthly_aed.toLocaleString()}</span>
        <span className="pv2-per">{lang === "ar" ? "/شهر" : "/mo"}</span>
      </div>
      <div className="pv2-setup mono">
        {lang === "ar"
          ? `د.إ ${tier.setup_aed.toLocaleString()} رسوم إعداد لمرة واحدة`
          : `AED ${tier.setup_aed.toLocaleString()} ONE-TIME SETUP`}
      </div>
      <ul className="pv2-feats">
        {tier.includes.map((f) => (
          <li key={f.en}>
            <span className="pv2-tick">✓</span> {f[lang]}
          </li>
        ))}
      </ul>
      <a className="btn primary lg pv2-btn" href="/kickoff">
        {lang === "ar" ? "احجز موعد التشغيل" : "Schedule kickoff"} <Arrow size={13} />
      </a>
    </div>
  );
}

/* ─── HireVsAgent (comparison table) ─── */

interface CompareRow {
  k: BiString;
  hire: BiString;
  agent: BiString;
  ours: boolean;
}

const COMPARE: CompareRow[] = [
  {
    k: { en: "Monthly cost", ar: "التكلفة الشهرية" },
    hire: { en: "AED 4,500 + benefits", ar: "٤٬٥٠٠ د.إ + مزايا" },
    agent: { en: "AED 3,000 · all-in", ar: "٣٬٠٠٠ د.إ · شامل" },
    ours: true,
  },
  {
    k: { en: "Coverage", ar: "ساعات العمل" },
    hire: { en: "8h × 6 days · daylight only", ar: "٨ س × ٦ أيام · نهاراً فقط" },
    agent: { en: "24/7/365 · always on", ar: "٢٤/٧/٣٦٥ · دائماً" },
    ours: true,
  },
  {
    k: { en: "Languages", ar: "اللغات" },
    hire: { en: "Usually 1, sometimes 2", ar: "عادة واحدة، أحياناً اثنتان" },
    agent: { en: "Arabic + English · native fluency", ar: "عربي + إنجليزي · إتقان أصلي" },
    ours: true,
  },
  {
    k: { en: "Memory across visits", ar: "ذاكرة بين الزيارات" },
    hire: { en: "Forgets after 2 weeks", ar: "ينسى بعد أسبوعين" },
    agent: { en: "Permanent · spans months", ar: "دائمة · تمتدّ لأشهر" },
    ours: true,
  },
  {
    k: { en: "Ramp time", ar: "الجاهزية" },
    hire: { en: "4-6 weeks training", ar: "٤–٦ أسابيع تدريب" },
    agent: { en: "Live in 10 minutes", ar: "جاهز في ١٠ دقائق" },
    ours: true,
  },
  {
    k: { en: "Sick days · turnover", ar: "إجازات · دوران" },
    hire: { en: "21 days + 30-50% annual turnover", ar: "٢١ يوماً + دوران ٣٠–٥٠٪ سنوياً" },
    agent: { en: "Zero · same agent for years", ar: "صفر · نفس الموظف لسنوات" },
    ours: true,
  },
  {
    k: { en: "Self-improvement", ar: "التحسّن الذاتي" },
    hire: { en: "Manual coaching needed", ar: "يحتاج إشراف يدوي" },
    agent: { en: "Writes rules every night", ar: "يكتب قواعد كل ليلة" },
    ours: true,
  },
  {
    k: { en: "Reporting to you", ar: "التقارير لك" },
    hire: { en: "Weekly meeting if lucky", ar: "اجتماع أسبوعي إن أُتيح" },
    agent: { en: "Morning brief at 9am sharp", ar: "موجز صباحي ٩:٠٠ بدقّة" },
    ours: true,
  },
];

function HireVsAgent() {
  const { lang } = useLang();
  return (
    <section className="section">
      <div className="container">
        <SectionMeta
          idx="09"
          label={lang === "ar" ? "موظف بشري · مقابل · ذكاء" : "human hire · vs · agent"}
          right={<span className="mono">{lang === "ar" ? "٨ معايير" : "8 dimensions"}</span>}
        />
        <div className="sec-title-row">
          <h2 className="display-2">
            {lang === "ar" ? (
              <>
                لماذا <em>الذكاء يفوز</em>.
              </>
            ) : (
              <>
                Why the agent <em>wins on paper</em>.
              </>
            )}
          </h2>
          <p className="ss strong" style={{ maxWidth: "44ch" }}>
            {lang === "ar"
              ? "بدون مشاعر. مجرّد الأرقام. لا نقول إن البشر سيئون — نقول إن هذه الوظيفة بالذات يفعلها الذكاء أفضل، أسرع، وأرخص."
              : "No emotion. Just the math. We're not saying humans are bad — we're saying for this specific job, the agent does it better, faster, and cheaper."}
          </p>
        </div>
        <div
          style={{
            border: "1px solid var(--line, rgba(255,255,255,0.08))",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.4fr 1.4fr",
              fontFamily: "var(--mono, monospace)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              opacity: 0.55,
              padding: "12px 18px",
              borderBottom: "1px solid var(--line, rgba(255,255,255,0.08))",
            }}
          >
            <span>{lang === "ar" ? "المعيار" : "Dimension"}</span>
            <span>{lang === "ar" ? "موظف بشري" : "Human hire"}</span>
            <span style={{ color: "var(--green, #5d8a4a)" }}>
              {lang === "ar" ? "موظف نجم" : "Najim hire"}
            </span>
          </div>
          {COMPARE.map((row, i) => (
            <div
              key={row.k.en}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.4fr 1.4fr",
                padding: "14px 18px",
                borderBottom:
                  i < COMPARE.length - 1
                    ? "1px solid var(--line, rgba(255,255,255,0.05))"
                    : "none",
                alignItems: "baseline",
                fontSize: 14,
                gap: 12,
              }}
            >
              <span style={{ opacity: 0.7 }}>{row.k[lang]}</span>
              <span style={{ opacity: 0.55 }}>{row.hire[lang]}</span>
              <span style={{ fontWeight: 500 }}>
                <span style={{ color: "var(--green, #5d8a4a)", marginRight: 8 }}>✓</span>
                {row.agent[lang]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const { lang } = useLang();
  return (
    <section className="section">
      <div className="container">
        <SectionMeta
          idx="04"
          label={lang === "ar" ? "عرض التوظيف" : "the offer"}
          right={
            <span className="mono">
              {lang === "ar" ? "عرض واحد · بلا تَدرّجات" : "ONE OFFER · NO TIERS"}
            </span>
          }
        />
        <div className="sec-title-row">
          <h2 className="display-2">
            {lang === "ar" ? (
              <>
                سعر واحد. <em>كموظفة فعلية.</em>
              </>
            ) : (
              <>
                One price. <em>Like an actual hire.</em>
              </>
            )}
          </h2>
          <p className="ss strong" style={{ maxWidth: "44ch" }}>
            {lang === "ar"
              ? "بلا تَدرّجات. بلا حسابات حسب الرسائل. بلا مفاجآت في الفاتورة. نفس السعر الذي تدفعه شهر التشغيل الأول وشهر السنة الثالثة."
              : "No tiers. No message-credit math. No surprise bills. Same price month one as month thirty-six."}
          </p>
        </div>

        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            border: "1px solid var(--line, rgba(255,255,255,0.12))",
            borderRadius: 12,
            padding: 0,
            background: "var(--card-bg, rgba(255,255,255,0.02))",
            overflow: "hidden",
          }}
        >
          {/* Letter-header */}
          <div
            style={{
              padding: "20px 32px",
              borderBottom: "1px solid var(--line, rgba(255,255,255,0.08))",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  opacity: 0.55,
                  marginBottom: 4,
                }}
              >
                {lang === "ar" ? "عرض توظيف · نجم" : "Job offer · Najim"}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontFamily: "var(--serif, Georgia, serif)",
                }}
              >
                {lang === "ar" ? "موظفة ذكاء اصطناعي · مخصّصة لعملك" : "AI Employee · bespoke for your business"}
              </div>
            </div>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--green, #5d8a4a)",
                padding: "4px 10px",
                border: "1px solid var(--green, #5d8a4a)",
                borderRadius: 999,
              }}
            >
              ● {lang === "ar" ? "متاحة الآن" : "Available now"}
            </span>
          </div>

          {/* Price block */}
          <div style={{ padding: "32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.55, marginBottom: 6 }}>
                {lang === "ar" ? "راتب شهري" : "Monthly salary"}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span className="mono" style={{ fontSize: 14, opacity: 0.6 }}>AED</span>
                <span style={{ fontSize: 56, fontFamily: "var(--serif, Georgia, serif)", lineHeight: 1, fontWeight: 400 }}>5,000</span>
              </div>
              <div className="mono" style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
                {lang === "ar" ? "≈ ١٬٣٦٠ دولاراً · شامل التشغيل والذكاء والصيانة" : "≈ $1,360 · all inference, voice, hosting"}
              </div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.55, marginBottom: 6 }}>
                {lang === "ar" ? "تركيب لمرة واحدة" : "One-time setup"}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span className="mono" style={{ fontSize: 14, opacity: 0.6 }}>AED</span>
                <span style={{ fontSize: 56, fontFamily: "var(--serif, Georgia, serif)", lineHeight: 1, fontWeight: 400 }}>3,500</span>
              </div>
              <div className="mono" style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
                {lang === "ar" ? "إعداد ميتا · تدريب · تكاملات · ١٠ أيام عمل" : "Meta verification · training · integrations · 10 working days"}
              </div>
            </div>
          </div>

          {/* Inclusion list */}
          <div style={{ padding: "0 32px 8px" }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.55, marginBottom: 12 }}>
              {lang === "ar" ? "ما يشمله العرض" : "What's in the offer"}
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px 18px" }}>
              {(lang === "ar" ? [
                "اسم ووجه وصوت خاصّ بعملك",
                "سيرة ذاتية من صفحة واحدة (للطباعة)",
                "ردود على واتساب — نص + رسالة صوتية",
                "تكامل فودكس · سفنرومز · تابي · تمارا · فريشا",
                "موجز يومي على واتساب الساعة ٩ صباحاً",
                "ذاكرة عملاء — VIP / مخاطر / منقطعين",
                "تحسّن ذاتي ليلي",
                "إعداد ميتا (نتولّاه كاملاً)",
              ] : [
                "Bespoke name, face & voice for your brand",
                "Printable one-page CV",
                "WhatsApp replies — text + voice notes",
                "Foodics · SevenRooms · Tabby · Tamara · Fresha",
                "9am daily WhatsApp owner brief",
                "Customer memory — VIP / at-risk / lapsed",
                "Self-improving every night",
                "Meta verification (we handle it)",
              ]).map((item) => (
                <li key={item} style={{ fontSize: 14, opacity: 0.85, display: "flex", gap: 10 }}>
                  <span style={{ color: "var(--green, #5d8a4a)", flexShrink: 0 }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer / CTA */}
          <div
            style={{
              padding: "20px 32px 28px",
              marginTop: 18,
              borderTop: "1px solid var(--line, rgba(255,255,255,0.08))",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              {lang === "ar"
                ? "سعر العميل المؤسّس: ٢٬٥٠٠ د.إ/شهر للخمس شركات الأولى (مقابل دراسة حالة)."
                : "Founding-customer rate: AED 2,500/mo for the first 5 businesses (case-study trade)."}
            </div>
            <a className="btn primary" href="/kickoff">
              {lang === "ar" ? "احجز موعد التشغيل" : "Schedule kickoff"}{" "}
              <Arrow size={12} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── ShippingLog (built this week — proof of velocity) ─── */

interface Ship {
  date: string; // ISO-ish display: "May 13"
  t: BiString;
  msg: BiString;
}

const SHIPS: Ship[] = [
  {
    date: "May 13",
    t: { en: "Multi-outlet brand view", ar: "عرض موحّد لكل الفروع" },
    msg: {
      en: "Chains and franchises now show every Google location with weighted reviews. Arabian Tea House: 5 outlets, 45,761 reviews aggregated, ★ 4.81 weighted average.",
      ar: "السلاسل والامتيازات تعرض الآن كل موقع على قوقل مع مراجعات مرجَّحة. مطعم البيت العربي: ٥ فروع، ٤٥٬٧٦١ مراجعة مجمّعة، بمتوسط مرجَّح ★ ٤٫٨١.",
    },
  },
  {
    date: "May 13",
    t: { en: "Schema markup generator", ar: "مولّد Schema" },
    msg: {
      en: "The agent now writes ready-to-paste JSON-LD blocks (Restaurant, FAQPage, Menu) grounded in your verified Google Business Profile and crawl data. One-click copy.",
      ar: "الذكاء يكتب الآن كتل JSON-LD جاهزة للصق (مطعم، أسئلة، قائمة) مبنية على بيانات ملف قوقل التجاري الموثّقة وبيانات الزحف. نسخ بضغطة واحدة.",
    },
  },
  {
    date: "May 13",
    t: { en: "Free public teardown", ar: "تشريح مجاني علني" },
    msg: {
      en: "Public, zero-signup audit at agents.dcp.sa/teardown. Paste any UAE or Saudi SMB URL and you get a 60-second AI breakdown with a permanent, shareable link.",
      ar: "تدقيق علني بدون تسجيل على agents.dcp.sa/teardown. الصق أي رابط لمنشأة في الإمارات أو السعودية لتحصل على تحليل ذكاء في ٦٠ ثانية برابط دائم قابل للمشاركة.",
    },
  },
  {
    date: "May 13",
    t: { en: "Competitor radar · 6-axis", ar: "رادار المنافسين · سداسي" },
    msg: {
      en: "Plots nearby competitors on a 6-axis radar: rating, review velocity, photos, social signal, schema coverage, response speed.",
      ar: "يرسم المنافسين على رادار سداسي: التقييم، سرعة المراجعات، الصور، السوشيال، Schema، سرعة الرد.",
    },
  },
  {
    date: "May 13",
    t: { en: "Social pulse · Instagram · TikTok · Reddit", ar: "نبض السوشيال · إنستغرام · تيك توك · ريديت" },
    msg: {
      en: "Live freshness signals: post-drought detection on Instagram, UGC mentions on TikTok, and brand threads on Reddit — all pulled fresh every time you run a teardown.",
      ar: "إشارات حضور حيّة: كشف فجوات النشر على إنستغرام، إشارات المحتوى على تيك توك، وخيوط النقاش حول علامتك على ريديت — تُسحب كلها لحظياً مع كل تشريح.",
    },
  },
  {
    date: "May 12",
    t: { en: "Day-one deliverables · 10 artifacts", ar: "نتائج اليوم الأول · ١٠ منتجات" },
    msg: {
      en: "Signup now produces ten real artifacts: Google Business Profile audit, FAQ gap report, ICP-matched prospects, owner-brief preview, WhatsApp demo transcript, review mining — and more.",
      ar: "التسجيل يولّد الآن عشر منتجات حقيقية: تدقيق ملف قوقل التجاري، تقرير ثغرات الأسئلة، عملاء محتملون مطابقون، معاينة موجز المالك، محادثة واتساب تجريبية، تحليل المراجعات — والمزيد.",
    },
  },
  {
    date: "May 12",
    t: { en: "Central inference router", ar: "موجّه ذكاء اصطناعي مركزي" },
    msg: {
      en: "Every AI call now flows through a single router that picks the right model for each role. When one provider fails, traffic auto-fails over to the next — no dropped conversations.",
      ar: "كل استدعاء للذكاء يمرّ الآن عبر موجّه واحد يختار النموذج المناسب لكل دور. عند تعطّل أي مزوّد، يُحوَّل الطلب تلقائياً إلى البديل — دون انقطاع المحادثات.",
    },
  },
  {
    date: "May 11",
    t: { en: "Self-hosted data layer", ar: "بنية بيانات ذاتية الاستضافة" },
    msg: {
      en: "Moved off third-party Supabase onto self-hosted Postgres 17 + pgvector on our own VPS, with Resend OTP magic-link auth. Owner-controlled end-to-end — no vendor lock-in.",
      ar: "انتقلنا من Supabase الخارجية إلى Postgres 17 + pgvector على خادم خاص بنا، مع مصادقة Resend OTP عبر رابط سحري. تحكّم كامل من جهة المالك — دون ارتهان بمزوّد خارجي.",
    },
  },
];

function ShippingLog() {
  const { lang } = useLang();
  return (
    <section className="section section-dark">
      <div className="container">
        <SectionMeta
          idx="11"
          label={lang === "ar" ? "شُحن هذا الأسبوع" : "shipped this week"}
          right={
            <span className="live mono">
              <span className="d" /> {lang === "ar" ? "٦١ التزاماً · ٧ أيام" : "61 COMMITS · 7 DAYS"}
            </span>
          }
        />
        <div className="sec-title-row">
          <h2 className="display-2">
            {lang === "ar" ? (
              <>
                نبني <em>أمام الكل</em>.
              </>
            ) : (
              <>
                We build <em>in public</em>.
              </>
            )}
          </h2>
          <p className="ss strong" style={{ maxWidth: "44ch" }}>
            {lang === "ar"
              ? "هذه أبرز الميزات التي شُحنت في آخر سبعة أيام. نسجّل ساعة وتاريخ كل التزام لأن السرعة جزء من المنتج."
              : "These are the headline features that shipped in the last seven days. Every commit is timestamped because velocity is part of the product."}
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 18,
          }}
        >
          {SHIPS.map((s, i) => (
            <Reveal key={s.t.en + i} delay={i * 30}>
              <div
                style={{
                  padding: "18px 20px",
                  border: "1px solid var(--line, rgba(255,255,255,0.08))",
                  borderRadius: 8,
                  background: "var(--card-bg, rgba(255,255,255,0.02))",
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    opacity: 0.55,
                    marginBottom: 8,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{s.date}</span>
                  <span style={{ color: "var(--green, #5d8a4a)" }}>
                    {lang === "ar" ? "● مباشر" : "● shipped"}
                  </span>
                </div>
                <h4
                  style={{
                    fontSize: 18,
                    margin: "0 0 6px",
                    fontFamily: "var(--serif, Georgia, serif)",
                    fontWeight: 400,
                  }}
                >
                  {s.t[lang]}
                </h4>
                <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0, opacity: 0.75 }}>
                  {s.msg[lang]}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <div
          className="mono"
          style={{
            marginTop: 32,
            paddingTop: 18,
            borderTop: "1px solid var(--line, rgba(255,255,255,0.06))",
            opacity: 0.5,
            fontSize: 11,
            letterSpacing: "0.12em",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span>
            {lang === "ar"
              ? "أحدث التزام: 222086e · multi-outlet aggregation"
              : "latest commit: 222086e · multi-outlet aggregation"}
          </span>
          <span>
            {lang === "ar" ? "الأسبوع القادم: تصدير فيديو MP4 من Remotion" : "next week: Remotion MP4 export"}
          </span>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const { lang } = useLang();
  return (
    <section className="section">
      <div className="container">
        <div className="cta-box-v2">
          <h3>
            {lang === "ar" ? (
              <>
                جاهز توقف عن <em>عمل كل شي بنفسك؟</em>
              </>
            ) : (
              <>
                Ready to stop doing
                <br />
                <em>everything yourself</em>?
              </>
            )}
          </h3>
          <p className="ss strong">
            {lang === "ar"
              ? "احجز موعد التشغيل. موظفتك تبدأ خلال ١٠ أيام عمل."
              : "Schedule a kickoff call. Your hire starts in 10 working days."}
          </p>
          <div className="ctas">
            <a className="btn primary lg" href="/kickoff">
              {lang === "ar" ? "احجز موعد التشغيل" : "Schedule kickoff"} <Arrow size={14} />
            </a>
            <a
              className="btn ghost lg"
              href="https://wa.me/12058582516?text=Hi"
              target="_blank"
              rel="noreferrer"
            >
              {lang === "ar" ? "جرّب العرض" : "Try the demo"}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function AgentsFooter() {
  const { lang } = useLang();
  type FooterLink = { label: BiString; href: string };
  type FooterCol = { heading: BiString; links: FooterLink[] };
  const cols: FooterCol[] = [
    {
      heading: { en: "Najim", ar: "نجم" },
      links: [
        { label: { en: "Home", ar: "الرئيسية" }, href: "/" },
        { label: { en: "Free 60-second audit", ar: "تشريح مجاني" }, href: "/teardown" },
        { label: { en: "The offer", ar: "العرض" }, href: "/pricing" },
        { label: { en: "Changelog", ar: "السجل" }, href: "/changelog" },
      ],
    },
    {
      heading: { en: "Hire", ar: "وظّف" },
      links: [
        { label: { en: "Schedule kickoff", ar: "احجز موعد التشغيل" }, href: "/kickoff" },
        {
          label: { en: "Free 60-second audit", ar: "تشريح مجاني · ٦٠ ثانية" },
          href: "/teardown",
        },
        {
          label: { en: "Text us on WhatsApp", ar: "كلّمنا على واتساب" },
          href: "https://wa.me/12058582516?text=Hi",
        },
        { label: { en: "Dashboard login", ar: "دخول اللوحة" }, href: "/app" },
      ],
    },
    {
      heading: { en: "Company", ar: "الشركة" },
      links: [
        {
          label: { en: "About AI Agent Systems", ar: "عن AI Agent Systems" },
          href: "#",
        },
        { label: { en: "dcp.sa (parent)", ar: "dcp.sa (الأم)" }, href: "https://dcp.sa" },
        { label: { en: "Privacy", ar: "الخصوصية" }, href: "#" },
        { label: { en: "Terms", ar: "الشروط" }, href: "#" },
      ],
    },
  ];
  return (
    <footer className="agents-foot">
      <div className="container">
        <div className="af-top">
          <div className="af-brand">
            <div
              className="af-mark"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "linear-gradient(135deg, #d4924b 0%, #c47a37 100%)",
                color: "#0a0b0d",
                fontWeight: 600,
                fontSize: 22,
                lineHeight: 1,
              }}
            >
              ★
            </div>
            <div>
              <div className="af-name">{lang === "ar" ? "نجم" : "Najim"}</div>
              <div className="af-dom mono">{lang === "ar" ? "وكالة توظيف الذكاء" : "AI staffing for UAE & Saudi"}</div>
            </div>
          </div>
          <p className="af-tag">
            {lang === "ar"
              ? "نوظّف ونُدرّب موظفة ذكاء واحدة لكل عمل. تردّ على واتساب بالعربية والإنجليزية. تباشر العمل خلال ١٠ أيام."
              : "We hire and train one bespoke AI teammate per business. She answers WhatsApp in Arabic and English. Live in 10 working days."}
          </p>
          <div className="af-status mono">
            <span className="d" />{" "}
            {lang === "ar" ? "متاحون للتوظيف · الإمارات والسعودية" : "Hiring · UAE & Saudi"}
          </div>
        </div>
        <div className="af-grid">
          {cols.map((col) => (
            <div key={col.heading.en}>
              <h4 className="af-h mono">{col.heading[lang]}</h4>
              <ul>
                {col.links.map((l) => (
                  <li key={l.label.en}>
                    <a href={l.href}>{l.label[lang]}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h4 className="af-h mono">{lang === "ar" ? "كلّم الفريق" : "Talk to the team"}</h4>
            <ul>
              <li>
                <a href="https://wa.me/12058582516?text=Hi%20Najim">
                  {lang === "ar" ? "واتساب نجم" : "WhatsApp the team"}
                </a>
              </li>
              <li>
                <a href="mailto:hello@najim.ai">hello@najim.ai</a>
              </li>
              <li>
                <a href="/kickoff">{lang === "ar" ? "احجز موعد كيكأوف (عن بُعد)" : "Schedule kickoff · remote"}</a>
              </li>
              <li>
                <a href="/kickoff">{lang === "ar" ? "سبرنت داخلي · ٣٠ يوم" : "On-site sprint · 30 days"}</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="af-bottom mono">
          <span>
            {lang === "ar"
              ? "© ٢٠٢٦ نجم · مشغّلة من Project Agent FZ-LLC · دبي، الإمارات"
              : "© 2026 Najim · operated by Project Agent FZ-LLC · Dubai, UAE"}
          </span>
          <span>
            {lang === "ar"
              ? "صُنع في الرياض · الإمارات والسعودية أولاً · مدعومة من DCP"
              : "Built in Riyadh · UAE & Saudi-first · backed by DCP"}
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ─── App composition ─── */

function HomeApp() {
  const { lang } = useLang();
  const navLinks: NavLink[] = [
    { href: "/", label: lang === "ar" ? "الرئيسية" : "Home", key: "home" },
    { href: "/brain", label: lang === "ar" ? "الدماغ" : "The Brain", key: "brain" },
    { href: "/pricing", label: lang === "ar" ? "العرض" : "The offer", key: "pricing" },
    { href: "/teardown", label: lang === "ar" ? "تشريح مجاني" : "Free audit", key: "teardown" },
    { href: "/spec", label: lang === "ar" ? "المواصفات" : "Spec", key: "spec" },
    { href: "/changelog", label: lang === "ar" ? "السجل" : "Changelog", key: "changelog" },
  ];
  return (
    <div className="page">
      <Marquee />
      <Nav
        links={navLinks}
        active="home"
        status={{ label: lang === "ar" ? "متاحون للتوظيف · الإمارات والسعودية" : "HIRING · UAE & SAUDI" }}
        ctaLabel={lang === "ar" ? "احجز موعد التشغيل" : "Schedule kickoff"}
        ctaHref="/kickoff"
      />
      <Hero />
      <PositionLine />
      <NajimLaws />
      <TheMath />
      <WithoutWith />
      <NajimBrain />
      <DeliveryModes />
      <ShippingLog />
      <Pain />
      <Industries />
      <HireVsAgent />
      <NajimICP />
      <Pricing />
      <CTA />
      <AgentsFooter />
      <TweaksPanel />
    </div>
  );
}

export default function HomePage(): ReactNode {
  return (
    <DcpProvider initialLang="en">
      <HomeApp />
      <StickyDemoCta />
    </DcpProvider>
  );
}

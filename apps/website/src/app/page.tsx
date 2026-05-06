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
  id: AgentTier;
  name: BiString;
  sub: BiString;
  monthly_aed: number;
  setup_aed: number;
  popular: boolean;
  includes: BiString[];
}

const HERO_STATS: HeroStat[] = [
  { v: "380+", k: { en: "inquiries monthly", ar: "استفسار شهرياً" } },
  { v: "2 min", k: { en: "to go live", ar: "للإطلاق" } },
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
      en: "Every morning at 9am. Situation, complication, question, action — the McKinsey framework. Variance detection flags what changed. Recommended actions, not just data.",
      ar: "كل صباح الساعة ٩. وضع، إشكال، سؤال، إجراء — إطار ماكنزي. كشف الانحرافات يبيّن إيش تغيّر. توصيات بإجراءات، مو مجرّد أرقام.",
    },
  },
  {
    t: { en: "WhatsApp Onboarding", ar: "تسجيل عبر واتساب" },
    msg: {
      en: "No website needed. Text our setup number, answer 5 questions in 2 minutes, your AI agent is live. Works in Arabic and English.",
      ar: "بدون موقع. كلّم رقم الإعداد، جاوب على ٥ أسئلة في دقيقتين، وذكاؤك جاهز. يشتغل بالعربي والإنجليزي.",
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

const TIERS: PricingTier[] = [
  {
    id: "starter",
    name: { en: "Starter", ar: "البداية" },
    sub: { en: "For solopreneurs", ar: "للأعمال الفردية" },
    monthly_aed: 1500,
    setup_aed: 3000,
    popular: false,
    includes: [
      {
        en: "1 WhatsApp AI agent with custom persona",
        ar: "موظف ذكاء واتساب واحد بشخصية مخصّصة",
      },
      {
        en: "Owner Brain — morning briefs + commands",
        ar: "عقل المالك — موجز الصباح وأوامر",
      },
      {
        en: "Sales Rep — lead scoring + pipeline",
        ar: "مندوب المبيعات — تقييم العملاء وخط المبيعات",
      },
      {
        en: "Arabic + English auto-detection",
        ar: "كشف تلقائي عربي/إنجليزي",
      },
      {
        en: "Customer memory across conversations",
        ar: "ذاكرة عملاء عبر كل المحادثات",
      },
    ],
  },
  {
    id: "growth",
    name: { en: "Growth", ar: "النمو" },
    sub: { en: "Most popular", ar: "الأكثر طلباً" },
    monthly_aed: 3000,
    setup_aed: 3000,
    popular: true,
    includes: [
      { en: "Everything in Starter", ar: "كل ما في البداية" },
      {
        en: "Content Engine — social on autopilot",
        ar: "محرّك المحتوى — سوشيال على الطيّار الآلي",
      },
      { en: "Loyalty program management", ar: "إدارة برنامج الولاء" },
      {
        en: "Google Business Profile optimization",
        ar: "تحسين ملف قوقل بزنس",
      },
      { en: "Calendar and CRM integration", ar: "ربط التقويم والـ CRM" },
      { en: "Multi-channel content generation", ar: "محتوى لكل القنوات" },
    ],
  },
  {
    id: "pro",
    name: { en: "Pro", ar: "المحترف" },
    sub: { en: "For growing teams", ar: "للفرق المتنامية" },
    monthly_aed: 5000,
    setup_aed: 3000,
    popular: false,
    includes: [
      { en: "Everything in Growth", ar: "كل ما في النمو" },
      { en: "AI image prompt generator", ar: "مولّد بروميت الصور" },
      {
        en: "Conversion tracking and attribution",
        ar: "تتبّع التحويلات وعزو المصدر",
      },
      {
        en: "Priority support — under 2h response",
        ar: "دعم بالأولوية — ردّ خلال أقلّ من ساعتين",
      },
      { en: "Voice message AI responses", ar: "ردود ذكاء على الرسائل الصوتية" },
      { en: "Custom workflow automations", ar: "أتمتة خاصة لسير العمل" },
    ],
  },
  {
    id: "enterprise",
    name: { en: "Enterprise", ar: "المؤسسات" },
    sub: { en: "For scaling operations", ar: "للعمليات الموسّعة" },
    monthly_aed: 8000,
    setup_aed: 3000,
    popular: false,
    includes: [
      { en: "Everything, unlimited", ar: "كل شي بدون حدود" },
      {
        en: "Custom integrations and API access",
        ar: "ربط مخصّص وواجهات API",
      },
      { en: "UAE data residency option", ar: "خيار استضافة البيانات بالإمارات" },
      { en: "Dedicated account manager", ar: "مدير حساب مخصّص" },
      { en: "SLA guarantee", ar: "ضمان مستوى خدمة (SLA)" },
      { en: "White-label available", ar: "علامة بيضاء متاحة" },
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
          <span className="eyebrow">
            <span className="d" />
            {lang === "ar" ? "مباشر في الإمارات والسعودية" : "Live in UAE and Saudi Arabia"}
          </span>
        </div>
        <div className="hero-grid">
          <div className="hero-left">
            <Reveal as="h1" className="display tight">
              {lang === "ar" ? (
                <>
                  أدِر <em>عملك</em>،<br />
                  لا بريدك.
                </>
              ) : (
                <>
                  Run your business.<br />
                  Not your <em>inbox</em>.
                </>
              )}
            </Reveal>

            <Reveal as="p" className="lede-strong" delay={120}>
              {lang === "ar" ? (
                "ذكاؤك الاصطناعي يدير واتساب، الرسائل الصوتية، رسائل إنستغرام، ومحادثة موقعك — بالعربية والإنجليزية. يتذكّر كل عميل، يحسّن نفسه ليلاً، ويتابع تلقائياً حتى لا يضيع أي حجز. على مدار الساعة."
              ) : (
                <>
                  Your AI handles <b>WhatsApp</b>, <b>voice notes</b>, <b>Instagram DMs</b>, and your <b>website chat</b> — in Arabic and English. She <b>remembers every customer</b>, <b>improves herself nightly</b>, and proactively follows up so no booking is ever lost. Around the clock.
                </>
              )}
            </Reveal>

            <Reveal as="div" className="cta-row tight" delay={200}>
              <a
                className="btn primary lg"
                href="https://wa.me/12058582516?text=Hi"
                target="_blank"
                rel="noreferrer"
              >
                {lang === "ar" ? "جرّب العرض المباشر" : "Try the live demo"} <Arrow size={14} />
              </a>
              <a className="btn ghost lg" href="#how">
                {lang === "ar" ? "كيف يعمل" : "How it works"}
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
              <LiveThread />
            </Reveal>
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
          idx="01"
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
  // Re-ported from /tmp/dcp-design/assets/home.jsx (Agents) using the
  // designed AgentCard primitive from screens.jsx (lines 38-53), which now
  // lives in components/dcp/screens.tsx. Wrapped in section-dark per brief.
  return (
    <section className="section section-dark">
      <div className="container">
        <SectionMeta
          idx="02"
          label={lang === "ar" ? "الفريق" : "your AI team"}
          right={
            <span className="mono">
              {AGENTS.length}/{AGENTS.length}
            </span>
          }
        />
        <div className="sec-title-row">
          <h2 className="display-2">
            {lang === "ar" ? (
              <>
                <em>{AGENTS.length} موظفين</em> أذكياء. لكلٍ منهم اسم.
              </>
            ) : (
              <>
                <em>{AGENTS.length} AI employees.</em>
                <br />
                Each one has a name.
              </>
            )}
          </h2>
          <p className="ss strong" style={{ maxWidth: "44ch" }}>
            {lang === "ar"
              ? "ليسوا روبوتات بنصوص جاهزة. شخصيّات بقصص خلفيّة، وخبرة، وذاكرة تمتدّ لشهور. يعملون معاً، ويتشاركون الذكاء، ويتحسّنون من غير ما تلمس شي."
              : "Not bots with scripts. Personalities with backstories, expertise, and memory that spans months. They work together, share intelligence, and get better without you touching anything."}
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
          idx="03"
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
          idx="04"
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
          idx="05"
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
          idx="06"
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
          idx="07"
          label={lang === "ar" ? "كيف يعمل" : "how it works"}
          right={
            <span className="mono">
              {lang === "ar" ? "١٠ دقائق · ليس ١٠ أسابيع" : "10 MIN · NOT 10 WEEKS"}
            </span>
          }
        />
        <div className="sec-title-row">
          <h2 className="display-2">
            {lang === "ar" ? (
              <>
                جاهز في <em>عشر دقائق</em>.<br />
                وليس عشرة أسابيع.
              </>
            ) : (
              <>
                Live in <em>10 minutes</em>.<br />
                Not 10 weeks.
              </>
            )}
          </h2>
          <p className="ss strong" style={{ maxWidth: "44ch" }}>
            {lang === "ar"
              ? "بدون مطوّرين. بدون إعداد تقني. ذكاؤنا يبني قاعدة معرفتك من موقعك تلقائياً."
              : "No developers. No technical setup. Our AI builds your knowledge base from your website automatically."}
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
        <div className="pv2-pop">{lang === "ar" ? "الأكثر طلباً" : "Most popular"}</div>
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
      <a className="btn primary lg pv2-btn" href="/app/onboarding">
        {lang === "ar" ? "ابدأ الآن" : "Get started"} <Arrow size={13} />
      </a>
    </div>
  );
}

function Pricing() {
  const { lang } = useLang();
  return (
    <section className="section">
      <div className="container">
        <SectionMeta
          idx="08"
          label={lang === "ar" ? "الأسعار" : "pricing"}
          right={
            <span className="mono">
              {lang === "ar" ? "د.إ · بلا مفاجآت" : "AED · NO SURPRISES"}
            </span>
          }
        />
        <div className="sec-title-row">
          <h2 className="display-2">
            {lang === "ar" ? (
              <>
                أسعار <em>شفافة</em>.<br />
                بدون مفاجآت.
              </>
            ) : (
              <>
                Transparent <em>pricing</em>.<br />
                No surprises.
              </>
            )}
          </h2>
          <p className="ss strong" style={{ maxWidth: "44ch" }}>
            {lang === "ar"
              ? "أقلّ من راتب موظف واحد. ومخرجات فريق من ستّة."
              : "Less than the cost of one employee. More output than a team of six."}
          </p>
        </div>
        <div className="pricev2-grid">
          {TIERS.map((tier) => (
            <PricingCardV2 key={tier.id} tier={tier} lang={lang} />
          ))}
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
              ? "اشترك في دقيقتين. فريق الذكاء الاصطناعي يبدأ اليوم."
              : "Sign up in 2 minutes. Your AI team starts today."}
          </p>
          <div className="ctas">
            <a className="btn primary lg" href="/app/onboarding">
              {lang === "ar" ? "ابدأ مجاناً" : "Start free"} <Arrow size={14} />
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
      heading: { en: "Product", ar: "المنتج" },
      links: [
        { label: { en: "Services", ar: "الخدمات" }, href: "/" },
        { label: { en: "Pricing", ar: "الأسعار" }, href: "/pricing" },
        { label: { en: "Process", ar: "العملية" }, href: "/demo" },
        { label: { en: "Dashboard", ar: "اللوحة" }, href: "/app" },
      ],
    },
    {
      heading: { en: "Get started", ar: "ابدأ" },
      links: [
        { label: { en: "Sign up", ar: "تسجيل" }, href: "/app/onboarding" },
        { label: { en: "Login", ar: "دخول" }, href: "/app" },
        {
          label: { en: "Book free audit", ar: "احجز تدقيقاً مجانياً" },
          href: "/app/onboarding",
        },
        {
          label: { en: "Live WhatsApp demo", ar: "عرض واتساب مباشر" },
          href: "https://wa.me/12058582516?text=Hi",
        },
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
            <div className="af-mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/dcp-logo-square.jpeg" alt="" />
            </div>
            <div>
              <div className="af-name">
                {lang === "ar" ? "أنظمة الموظفين الذكيين" : "AI Agent Systems"}
              </div>
              <div className="af-dom mono">agents.dcp.sa</div>
            </div>
          </div>
          <p className="af-tag">
            {lang === "ar"
              ? "موظفو ذكاء اصطناعي يديرون عملك على واتساب — بالعربية والإنجليزية. الإمارات والسعودية."
              : "AI employees that run your business on WhatsApp — in Arabic and English. Live in the UAE and Saudi Arabia."}
          </p>
          <div className="af-status mono">
            <span className="d" />{" "}
            {lang === "ar" ? "جميع الأنظمة تعمل" : "All systems operational"} ·{" "}
            <span className="t">RUH 38ms · DXB 41ms</span>
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
        </div>
        <div className="af-bottom mono">
          <span>
            {lang === "ar"
              ? "© ٢٠٢٦ أنظمة الموظفين الذكيين · دبي، الإمارات · من إنتاج DC Power Solutions"
              : "© 2026 AI Agent Systems · Dubai, UAE · A product of DC Power Solutions"}
          </span>
          <span>
            {lang === "ar" ? "صُنع في الرياض · مستضاف قريباً منك" : "Built in Riyadh · Hosted close to home"}
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
    { href: "/", label: lang === "ar" ? "الخدمات" : "Services", key: "home" },
    { href: "/pricing", label: lang === "ar" ? "الأسعار" : "Pricing", key: "pricing" },
    { href: "/demo", label: lang === "ar" ? "العملية" : "Process", key: "process" },
    { href: "/app", label: lang === "ar" ? "اللوحة" : "Dashboard", key: "dash" },
  ];
  return (
    <div className="page">
      <Marquee />
      <Nav
        links={navLinks}
        active="home"
        status={{ label: lang === "ar" ? "مباشر · الإمارات والسعودية" : "LIVE · UAE & SAUDI" }}
        ctaLabel={lang === "ar" ? "احجز تدقيقاً مجانياً" : "Book free audit"}
        ctaHref="/app/onboarding"
      />
      <Hero />
      <Pain />
      <AgentsSection />
      <Intelligence />
      <MessageAnatomy />
      <Industries />
      <Memory />
      <HowItWorks />
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
    </DcpProvider>
  );
}

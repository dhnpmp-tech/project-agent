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

/* ─── Content (lifted from /tmp/dcp-design/assets/data.js) ─── */

interface HeroStat {
  v: string;
  k: string;
}
interface PainItem {
  code: string;
  t: string;
  msg: string;
}
type AgentTier = "starter" | "growth" | "pro" | "enterprise";
interface AgentItem {
  id: string;
  code: string;
  name: string;
  tier: AgentTier;
  pitch: string;
  summary: string;
  bullets: string[];
}
interface IntelItem {
  t: string;
  msg: string;
}
interface IndustryItem {
  t: string;
  msg: string;
  bullets: string[];
}
interface HowStep {
  n: string;
  t: string;
  msg: string;
}
interface MemoryField {
  k: string;
  v: string;
}
interface MemoryCard {
  name: string;
  fields: MemoryField[];
}
interface PricingTier {
  id: AgentTier;
  name: string;
  sub: string;
  monthly_aed: number;
  setup_aed: number;
  popular: boolean;
  includes: string[];
}

const HERO_STATS: HeroStat[] = [
  { v: "380+", k: "inquiries monthly" },
  { v: "2 min", k: "to go live" },
  { v: "24/7", k: "self-improving" },
];

const PAIN: PainItem[] = [
  { code: "01", t: "3h/day", msg: "Answering WhatsApp messages until midnight" },
  { code: "02", t: "1.5h/day", msg: "Posting on social media between customer calls" },
  { code: "03", t: "2h/day", msg: "Chasing leads that go cold because you were busy" },
  { code: "04", t: "4h/week", msg: "Tracking invoices on spreadsheets at 2am" },
  { code: "05", t: "6h/week", msg: "Screening CVs when you should be closing deals" },
  { code: "06", t: "5h/week", msg: "Rescheduling no-shows and chasing confirmations" },
];

const AGENTS: AgentItem[] = [
  {
    id: "whatsapp",
    code: "01",
    name: "WhatsApp Agent",
    tier: "starter",
    pitch: "Not a chatbot — a person.",
    summary:
      "We generate a unique AI employee with a real backstory, personality, and voice. She remembers every customer — their name, their usual order, their wife's birthday. She texts like a real person: short messages, natural timing, never a wall of text. She never says she's an AI.",
    bullets: ["Custom persona + voice", "Cross-conversation memory", "Birthday & sentiment aware"],
  },
  {
    id: "owner",
    code: "02",
    name: "Owner Brain",
    tier: "starter",
    pitch: "Your AI Chief of Staff.",
    summary:
      "Structured 9am brief with variance detection, VIP arrivals, and risk alerts. Drafts Google review replies for your approval, flags at-risk customers before they churn, and tells you what you're missing. Take a photo of today's special — it updates everything. All from WhatsApp.",
    bullets: ["9am morning brief", "Photo-to-knowledge", "Owner-only WhatsApp commands"],
  },
  {
    id: "sales",
    code: "03",
    name: "Sales Rep",
    tier: "starter",
    pitch: "Never lose a lead to slow follow-up.",
    summary:
      "Scores every lead 1–100 against your ideal customer profile. Hot leads get personalized outreach in minutes. Warm leads get nurtured. Cold leads get archived. You only see the ones worth your time.",
    bullets: ["Lead scoring 1–100", "Day-1 / Day-3 / Day-7 nurture", "Win/loss analysis"],
  },
  {
    id: "content",
    code: "04",
    name: "Content Engine",
    tier: "growth",
    pitch: "Content that posts itself.",
    summary:
      "Weekly content plan for Instagram, LinkedIn, and TikTok — bilingual, AI-generated from your brand voice. Owner takes a photo — it becomes a reel, a post, and a story. On schedule, on brand, zero effort.",
    bullets: [
      "3 caption variants per topic",
      "Ramadan/Eid/National Day aware",
      "Marketplace auto-posting (Haraj)",
    ],
  },
  {
    id: "hr",
    code: "05",
    name: "HR Screening",
    tier: "pro",
    pitch: "23 CVs in. 4 interviews out.",
    summary:
      "23 CVs arrive. Four minutes later, you see 4 candidates worth interviewing, with scores, strengths, and suggested questions. Decline emails already sent. Interviews already scheduled in your calendar.",
    bullets: ["CV → score in <4 min", "Auto decline emails", "Interview slot booking"],
  },
  {
    id: "finance",
    code: "06",
    name: "Financial Intelligence",
    tier: "enterprise",
    pitch: "Numbers that tell you what to do.",
    summary:
      "Sunday morning: a plain-language report lands on your WhatsApp. Revenue up 12%. Seafood costs spiked 18% — here's a cheaper supplier. Dessert orders dropped — time for a new menu item? Numbers that tell you what to do, not just what happened.",
    bullets: ["Weekly Sunday report", "Cost spike detection", "Menu/SKU suggestions"],
  },
  {
    id: "voice",
    code: "07",
    name: "Voice Notes",
    tier: "pro",
    pitch: "Talk like you talk to a friend.",
    summary:
      "Customers send voice notes — your AI transcribes, understands, and replies with its own voice in Arabic or English. No typing needed. Just talk to your business.",
    bullets: ["AR + EN voice in/out", "Native Gulf Arabic routing", "On every channel"],
  },
  {
    id: "multi",
    code: "08",
    name: "Multi-Channel",
    tier: "growth",
    pitch: "One brain. Every channel.",
    summary:
      "WhatsApp, your website, Telegram, Instagram DM. Same personality, same memory, every channel. A customer who messages on Instagram at noon and WhatsApp at night gets one continuous conversation — not two strangers.",
    bullets: [
      "WhatsApp · Web · Telegram · IG",
      "Shared customer memory",
      "Voice on every channel",
    ],
  },
];

const INTELLIGENCE: IntelItem[] = [
  {
    t: "Self-Improving AI",
    msg: "Analyzes every conversation overnight. Writes new rules, verifies them against past conversations, and A/B tests before applying. Conflicting rules get resolved automatically.",
  },
  {
    t: "Proactive Follow-ups",
    msg: "Reservation reminders before the visit. Feedback requests after. Re-engagement offers when a customer hasn't been back in 14 days. All via Meta-approved WhatsApp templates.",
  },
  {
    t: "Morning Briefs",
    msg: "Every morning at 9am. Situation, complication, question, action — the McKinsey framework. Variance detection flags what changed. Recommended actions, not just data.",
  },
  {
    t: "WhatsApp Onboarding",
    msg: "No website needed. Text our setup number, answer 5 questions in 2 minutes, your AI agent is live. Works in Arabic and English.",
  },
  {
    t: "Google Review Responder",
    msg: "New review comes in — the AI drafts a thoughtful reply within minutes. You approve or edit from WhatsApp. One tap to publish.",
  },
  {
    t: "Guest Intelligence",
    msg: "Every customer auto-segmented: VIP, Loyal, At Risk, or Lapsed. The AI knows who deserves a personal touch and who's about to slip away.",
  },
  {
    t: "Risk Surfacing",
    msg: "Surfaces what you're missing: declining repeat visits, unanswered complaints, booking patterns that signal trouble. Proactive alerts so nothing slips through.",
  },
  {
    t: "Native Gulf Arabic",
    msg: "Arabic messages auto-route to a model that speaks native Gulf Arabic. English stays on the primary engine. Natural conversations, not broken translation.",
  },
];

const INDUSTRIES: IndustryItem[] = [
  {
    t: "Restaurants & Cafés",
    msg: "Table bookings with time and occasion. Menu knowledge with prices. Dietary tracking per guest. Owner takes a photo at the market — it becomes today's special across WhatsApp, Instagram, and the knowledge base.",
    bullets: ["Calendar booking", "Allergy memory per guest", "Photo-to-special pipeline"],
  },
  {
    t: "Coffee & Retail",
    msg: "Bean subscriptions, order management, cupping session bookings. The AI knows each customer's roast preference and texts them when their favorite origin comes back in stock.",
    bullets: ["Subscription management", "Taste preference memory", "New arrival notifications"],
  },
  {
    t: "Spas, Salons & Clinics",
    msg: "Appointment booking with preferred therapist. Treatment history and pressure preferences remembered. Follow-up the morning after: 'How are you feeling?' Seasonal packages suggested automatically.",
    bullets: ["Therapist preference memory", "Post-treatment follow-up", "Package upselling"],
  },
];

const HOW: HowStep[] = [
  {
    n: "1",
    t: "We learn your business",
    msg: "We scan your website, interview you about your vibe, and study your industry. In 30 minutes we know your business better than a new hire would in a month.",
  },
  {
    n: "2",
    t: "We create your AI team",
    msg: "Each agent gets a unique persona — a name, a backstory, a personality, even a profile photo. Your WhatsApp agent isn't a bot. It's someone your customers will remember.",
  },
  {
    n: "3",
    t: "Pay, we build, you go live",
    msg: "We build your website, activate your AI across WhatsApp, your website widget, Telegram, and Instagram DM — with voice note support on every channel. Your AI team starts handling customers on day one.",
  },
];

const MEMORY_BULLETS: string[] = [
  "Names, phone numbers, and communication language",
  "Dietary restrictions — tracked per guest, not just per booking",
  "Favorite dishes, usual party size, preferred seating",
  "Every past booking, complaint, and compliment",
  "Sentiment tracking — knows if last visit was a bad experience",
];

const MEMORY_CARD: MemoryCard = {
  name: "Layla Khoury",
  fields: [
    { k: "Preference", v: "Outdoor terrace, party of 4" },
    { k: "Allergy", v: "Nut allergy" },
    { k: "Status", v: "VIP — 8 visits" },
    { k: "Last order", v: "Truffle pasta, sparkling water" },
    { k: "Sentiment", v: "Positive — last 3 visits" },
  ],
};

const TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    sub: "For solopreneurs",
    monthly_aed: 1500,
    setup_aed: 3000,
    popular: false,
    includes: [
      "1 WhatsApp AI agent with custom persona",
      "Owner Brain — morning briefs + commands",
      "Sales Rep — lead scoring + pipeline",
      "Arabic + English auto-detection",
      "Customer memory across conversations",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    sub: "Most popular",
    monthly_aed: 3000,
    setup_aed: 3000,
    popular: true,
    includes: [
      "Everything in Starter",
      "Content Engine — social on autopilot",
      "Loyalty program management",
      "Google Business Profile optimization",
      "Calendar and CRM integration",
      "Multi-channel content generation",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    sub: "For growing teams",
    monthly_aed: 5000,
    setup_aed: 3000,
    popular: false,
    includes: [
      "Everything in Growth",
      "AI image prompt generator",
      "Conversion tracking and attribution",
      "Priority support — under 2h response",
      "Voice message AI responses",
      "Custom workflow automations",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    sub: "For scaling operations",
    monthly_aed: 8000,
    setup_aed: 3000,
    popular: false,
    includes: [
      "Everything, unlimited",
      "Custom integrations and API access",
      "UAE data residency option",
      "Dedicated account manager",
      "SLA guarantee",
      "White-label available",
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
  t: string;
  msg: string;
  typing?: number;
}

function LiveThread() {
  const thread = useMemo<ThreadMsg[]>(
    () => [
      { side: "cust", t: "1:14 PM", msg: "Ahlan! Do you have a table for 4 tonight at 9?" },
      { side: "ai", t: "1:14 PM", msg: "Hey! 👋 Yes, 9pm is open. Under what name?", typing: 700 },
      { side: "cust", t: "1:15 PM", msg: "Mohammed. Same window table as last time if possible?" },
      {
        side: "ai",
        t: "1:15 PM",
        msg: "Welcome back, Mohammed Al-Qahtani 👋 — table 12 by the window, same as last time. Booked. Want me to set up your usual (kabsa + tamr hindi)?",
        typing: 1100,
      },
      { side: "cust", t: "1:15 PM", msg: "Yes, shukran" },
      {
        side: "ai",
        t: "1:16 PM",
        msg: "Done ✓ I'll send a reminder at 8:30. Have a great evening 🌙",
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
          <span className="lt-av-init">L</span>
          <span className="lt-av-on" />
        </div>
        <div className="lt-meta">
          <div className="lt-name">Layla · Saffron Kitchen</div>
          <div className="lt-status">
            <span className="d" /> AI Agent · online
          </div>
        </div>
        <div className="lt-time">9:41</div>
      </div>
      <div className="lt-body">
        {thread.slice(0, shown).map((m, i) => (
          <div key={i} className={"lt-msg lt-" + m.side}>
            <div className="lt-bubble">{m.msg}</div>
            <div className="lt-t">
              {m.t}
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
        <span className="mono">∞ Self-improving overnight</span>
        <span className="mono">·</span>
        <span className="mono">Persistent memory</span>
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
                <div className="hs" key={s.k}>
                  <div className="hs-v">
                    {s.v.includes("+") ? (
                      <>
                        <CountUp to={parseInt(s.v, 10)} />+
                      </>
                    ) : (
                      s.v
                    )}
                  </div>
                  <div className="hs-k">{s.k}</div>
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
          right={<span className="mono">~30h/week</span>}
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
                <div className="pain-time">{p.t}</div>
                <div className="pain-msg">{p.msg}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function AgentCardV2({ a, idx }: { a: AgentItem; idx: number }) {
  return (
    <Reveal as="div" className="agent-cell-v2" delay={idx * 40}>
      <div className="ac-num mono">{a.code}</div>
      <h3 className="ac-name">{a.name}</h3>
      <p className="ac-pitch">{a.pitch}</p>
      <p className="ac-sum">{a.summary}</p>
      <ul className="ac-bullets">
        {a.bullets.map((b) => (
          <li key={b}>
            <span className="ac-tick">✓</span> {b}
          </li>
        ))}
      </ul>
      <div className="ac-tier">
        <span className={"tier-dot tier-" + a.tier} /> {a.tier}
      </div>
    </Reveal>
  );
}

function AgentsSection() {
  const { lang } = useLang();
  return (
    <section className="section">
      <div className="container">
        <SectionMeta
          idx="02"
          label={lang === "ar" ? "الفريق" : "your AI team"}
          right={<span className="mono">{AGENTS.length}/{AGENTS.length}</span>}
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
        <div className="agent-grid v2">
          {AGENTS.map((a, i) => (
            <AgentCardV2 key={a.id} a={a} idx={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function NeuralBar() {
  return (
    <div className="neural">
      <div className="neural-track">
        <div className="neural-fill" />
        <div className="neural-pulse" />
      </div>
      <div className="neural-labels mono">
        <span>22:00 · Conversations close</span>
        <span>02:00 · Rules drafted</span>
        <span>04:00 · A/B verified</span>
        <span>09:00 · Live + briefed</span>
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
              <span className="d" /> SELF-IMPROVING · NIGHTLY
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
            <Reveal key={it.t} delay={i * 35}>
              <div className="intel-cell">
                <div className="intel-num mono">{String(i + 1).padStart(2, "0")}</div>
                <h4 className="intel-t">{it.t}</h4>
                <p className="intel-msg">{it.msg}</p>
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
              <span className="d" /> LIVE TRACE
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
              <div className="lane-tag mono">whatsapp · inbound</div>
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
                {step < 9 ? "processing" : step < TRACE_EVENTS.length - 1 ? "writing" : "idle"}
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
              <span>p50 latency 1.18s</span>
              <span>·</span>
              <span>
                {beShown.length}/{beEvents.length} events
              </span>
              <span>·</span>
              <span>cost $0.0034</span>
            </div>
          </div>

          {/* LANE 3 — OWNER BRAIN */}
          <div className="lane lane-owner">
            <div className="lane-hd">
              <div className="lane-num mono">03</div>
              <div className="lane-t">{lang === "ar" ? "العقل المالك" : "Owner Brain"}</div>
              <div className="lane-tag mono">brief · 09:00 next day</div>
            </div>
            <div className="lane-body owner-body">
              <div className="owner-greet">
                {lang === "ar" ? "صباح الخير، خالد ☀️" : "Good morning, Khaled ☀️"}
              </div>
              <div className="owner-blk">
                <div className="owner-blk-t mono">VIP TONIGHT</div>
                <div className={`owner-line ${ledgerWritten ? "written" : ""}`}>
                  <span className="owner-bullet" />
                  {lang === "ar"
                    ? "أبو محمد · حجز الطاولة 12 · 9 زيارات · يحب الكبسة"
                    : "Abu Mohammed · Table 12 · 9th visit · loves kabsa"}
                  {ledgerWritten && <span className="owner-stamp mono">+ ledger</span>}
                </div>
              </div>
              <div className="owner-blk">
                <div className="owner-blk-t mono">MEMORY UPDATED</div>
                <div className={`owner-line owner-line-mem ${memoryWritten ? "written" : ""}`}>
                  <span className="owner-bullet" />
                  cust_8843.last_booking ← 2024-Q4
                  {memoryWritten && <span className="owner-stamp mono">+ memory</span>}
                </div>
              </div>
              <div className="owner-blk">
                <div className="owner-blk-t mono">LEARNING</div>
                <div className={`owner-line owner-line-learn ${learningQueued ? "written" : ""}`}>
                  <span className="owner-bullet" />
                  {lang === "ar"
                    ? "قاعدة مرشّحة: حجوزات الجمعة 9م → اقترح الطاولة 12"
                    : "Rule candidate: Fri 9pm bookings → suggest table 12"}
                  {learningQueued && <span className="owner-stamp mono">+ queue</span>}
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
          right={<span className="mono">3 verticals</span>}
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
            <Reveal key={ind.t} delay={i * 60}>
              <div className="ind-cell">
                <h3 className="ind-t">{ind.t}</h3>
                <p className="ind-msg">{ind.msg}</p>
                <ul className="ind-bullets">
                  {ind.bullets.map((b) => (
                    <li key={b}>
                      <span className="ac-tick">✓</span> {b}
                    </li>
                  ))}
                </ul>
                <a
                  className="ind-link mono"
                  href="https://wa.me/12058582516?text=Hi"
                  target="_blank"
                  rel="noreferrer"
                >
                  See demo <Arrow size={11} />
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
          right={<span className="mono">SPANS MONTHS</span>}
        />
        <div className="mem-grid">
          <div className="mem-card">
            <div className="mem-card-hd">
              <div className="mem-av">L</div>
              <div className="mem-card-name">{c.name}</div>
              <div className="mem-card-vip mono">VIP</div>
            </div>
            <table className="mem-table">
              <tbody>
                {c.fields.map((f) => (
                  <tr key={f.k}>
                    <td className="mem-k mono">{f.k}</td>
                    <td className="mem-v">{f.v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mem-foot mono">∞ remembered across every conversation</div>
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
                <li key={m}>
                  <span className="ac-tick">✓</span> {m}
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
          right={<span className="mono">10 MIN · NOT 10 WEEKS</span>}
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
                <h3 className="how-t">{s.t}</h3>
                <p className="how-msg">{s.msg}</p>
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
      <div className="pv2-name">{tier.name}</div>
      <div className="pv2-sub">{tier.sub}</div>
      <div className="pv2-price">
        <span className="pv2-cur">AED</span>
        <span className="pv2-num">{tier.monthly_aed.toLocaleString()}</span>
        <span className="pv2-per">/mo</span>
      </div>
      <div className="pv2-setup mono">AED {tier.setup_aed.toLocaleString()} ONE-TIME SETUP</div>
      <ul className="pv2-feats">
        {tier.includes.map((f) => (
          <li key={f}>
            <span className="pv2-tick">✓</span> {f}
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
          right={<span className="mono">AED · NO SURPRISES</span>}
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
  type FooterLink = [string, string];
  type FooterCol = [string, FooterLink[]];
  const cols: FooterCol[] = [
    [
      lang === "ar" ? "المنتج" : "Product",
      [
        ["Services", "/"],
        ["Pricing", "#pricing"],
        ["Process", "#how"],
        ["Case study", "#"],
        ["Integrations", "#"],
      ],
    ],
    [
      lang === "ar" ? "بدء" : "Get started",
      [
        ["Sign up", "/app/onboarding"],
        ["Login", "/app"],
        ["Book free audit", "/app/onboarding"],
        ["Live WhatsApp demo", "https://wa.me/12058582516?text=Hi"],
      ],
    ],
    [
      lang === "ar" ? "الشركة" : "Company",
      [
        ["About AI Agent Systems", "#"],
        ["dcp.sa (parent)", "https://dcp.sa"],
        ["Privacy", "#"],
        ["Terms", "#"],
      ],
    ],
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
              <div className="af-name">AI Agent Systems</div>
              <div className="af-dom mono">agents.dcp.sa</div>
            </div>
          </div>
          <p className="af-tag">
            {lang === "ar"
              ? "موظفو ذكاء اصطناعي يديرون عملك على واتساب — بالعربية والإنجليزية. الإمارات والسعودية."
              : "AI employees that run your business on WhatsApp — in Arabic and English. Live in the UAE and Saudi Arabia."}
          </p>
          <div className="af-status mono">
            <span className="d" /> All systems operational ·{" "}
            <span className="t">RUH 38ms · DXB 41ms</span>
          </div>
        </div>
        <div className="af-grid">
          {cols.map(([h, ls]) => (
            <div key={h}>
              <h4 className="af-h mono">{h}</h4>
              <ul>
                {ls.map(([l, href]) => (
                  <li key={l}>
                    <a href={href}>{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="af-bottom mono">
          <span>© 2026 AI Agent Systems · Dubai, UAE · A product of DC Power Solutions</span>
          <span>Built in Riyadh · Hosted close to home</span>
        </div>
      </div>
    </footer>
  );
}

/* ─── App composition ─── */

function HomeApp() {
  const { lang } = useLang();
  const navLinks: NavLink[] = [
    { href: "/services", label: lang === "ar" ? "الخدمات" : "Services", key: "services" },
    { href: "/pricing", label: lang === "ar" ? "الأسعار" : "Pricing", key: "pricing" },
    { href: "/process", label: lang === "ar" ? "العملية" : "Process", key: "process" },
    { href: "/case-study", label: lang === "ar" ? "حالة" : "Case study", key: "case-study" },
    { href: "/integrations", label: lang === "ar" ? "تكاملات" : "Integrations", key: "integrations" },
    { href: "/app", label: lang === "ar" ? "اللوحة" : "Dashboard", key: "dash" },
  ];
  return (
    <div className="page">
      <Marquee />
      <Nav
        links={navLinks}
        active="services"
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

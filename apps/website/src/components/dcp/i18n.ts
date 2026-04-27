// DCP Agents — i18n dictionary
// Ported from /tmp/dcp-design/assets/i18n.js. Top-level keys: nav, marquee,
// hero, agents, pricing, dashboard, demo, footer, common.

export type Lang = "en" | "ar";

export interface Dict {
  nav: {
    agents: string;
    platform: string;
    pricing: string;
    integrations: string;
    docs: string;
    signin: string;
    start: string;
  };
  marquee: string;
  hero: {
    eyebrow: string;
    title_a: string;
    title_em: string;
    title_b: string;
    sub: string;
    cta_primary: string;
    cta_secondary: string;
    trusted: string;
    stat_uptime: string;
    stat_replies: string;
    stat_cost: string;
    stat_clients: string;
  };
  agents: {
    eyebrow: string;
    title_a: string;
    title_em: string;
    title_b: string;
    sub: string;
  };
  pricing: {
    eyebrow: string;
    title_a: string;
    title_em: string;
    title_b: string;
    sub: string;
    most: string;
    tiers: { starter: string; growth: string; pro: string; enterprise: string };
    setup: string;
    mo: string;
    cta_starter: string;
    cta_growth: string;
    cta_pro: string;
    cta_enterprise: string;
  };
  dashboard: {
    hello: string;
    brief: string;
    jobs: string;
    health: string;
    mem: string;
    logs: string;
  };
  demo: {
    eyebrow: string;
    title_a: string;
    title_em: string;
    title_b: string;
    sub: string;
    customer: string;
    owner: string;
  };
  footer: {
    tag: string;
    status: string;
    product: string;
    dev: string;
    company: string;
    legal: string;
  };
  common: {
    live: string;
    bilingual: string;
    see_more: string;
    back: string;
    next: string;
    copy: string;
    copied: string;
  };
}

export const DCP_I18N: Record<Lang, Dict> = {
  en: {
    nav: {
      agents: "Agents",
      platform: "Platform",
      pricing: "Pricing",
      integrations: "Integrations",
      docs: "Docs",
      signin: "Sign in",
      start: "Start free",
    },
    marquee:
      "Saudi-first AI employees — runs on WhatsApp — bilingual Arabic + English — ~SAR 0.004 per conversation — RUH · JED · DMM — 9 agents · one platform — Owner Brain texts you back — built in Riyadh",
    hero: {
      eyebrow: "§ 01 · DCP AGENTS · v3",
      title_a: "AI employees that work",
      title_em: "around the clock",
      title_b: ", on WhatsApp.",
      sub: "Hire a full team of AI agents — customer service, sales, content, finance, HR — that text your customers and report back to you. Bilingual Arabic + English. Live in 90 minutes.",
      cta_primary: "Start free trial",
      cta_secondary: "See live demo",
      trusted: "TRUSTED BY OPERATORS ACROSS RIYADH · JEDDAH · DAMMAM",
      stat_uptime: "uptime",
      stat_replies: "avg first reply",
      stat_cost: "per conversation",
      stat_clients: "active clients",
    },
    agents: {
      eyebrow: "§ 02 · THE TEAM",
      title_a: "Nine AI employees,",
      title_em: "one platform",
      title_b: ".",
      sub: "Each agent has a name, a personality, and a job. They share a single brain — your business knowledge, your customers, your numbers — so a booking made on WhatsApp shows up in the owner brief by morning.",
    },
    pricing: {
      eyebrow: "§ 03 · PRICING",
      title_a: "Pay monthly,",
      title_em: "scale with confidence",
      title_b: ".",
      sub: "Per-conversation cost is around 0.004 SAR. The plan covers your AI team, persistent memory, all integrations, and your two WhatsApp numbers — customer-facing and private owner brain.",
      most: "Most popular",
      tiers: {
        starter: "Starter",
        growth: "Growth",
        pro: "Pro",
        enterprise: "Enterprise",
      },
      setup: "one-time setup",
      mo: "/month",
      cta_starter: "Start with Starter",
      cta_growth: "Start with Growth",
      cta_pro: "Start with Pro",
      cta_enterprise: "Talk to sales",
    },
    dashboard: {
      hello: "Good morning",
      brief: "Owner brief",
      jobs: "Today",
      health: "Agent health",
      mem: "Customer memory",
      logs: "Activity",
    },
    demo: {
      eyebrow: "§ 04 · LIVE DEMO",
      title_a: "Watch the agent",
      title_em: "earn its keep",
      title_b: ".",
      sub: "A real Riyadh restaurant scenario, replayed at 1× speed. Customer thread on the left, owner brain on the right, knowledge graph beneath.",
      customer: "Customer · WhatsApp",
      owner: "Owner brain · private",
    },
    footer: {
      tag: "DCP runs autonomous AI employees for SMBs across Saudi Arabia and the UAE. Built in Riyadh, hosted close to home.",
      status: "All systems operational",
      product: "Platform",
      dev: "Resources",
      company: "Support",
      legal: "Legal",
    },
    common: {
      live: "LIVE",
      bilingual: "Bilingual AR · EN",
      see_more: "See more",
      back: "Back",
      next: "Next",
      copy: "Copy",
      copied: "Copied",
    },
  },
  ar: {
    nav: {
      agents: "الوكلاء",
      platform: "المنصّة",
      pricing: "الأسعار",
      integrations: "التكاملات",
      docs: "الوثائق",
      signin: "تسجيل الدخول",
      start: "ابدأ مجاناً",
    },
    marquee:
      "موظفون رقميون يعملون على واتساب — عربي وإنجليزي — تكلفة المحادثة ٠٫٠٠٤ ريال — الرياض · جدة · الدمام — تسعة وكلاء على منصّة واحدة — العقل المالك يرسل لك — صُنع في الرياض",
    hero: {
      eyebrow: "§ ٠١ · وكلاء دي‌سي‌بي · ٣",
      title_a: "موظفون ذكاء اصطناعي يعملون",
      title_em: "على مدار الساعة",
      title_b: "، على واتساب.",
      sub: "وظّف فريقاً متكاملاً من الوكلاء الأذكياء — خدمة العملاء، المبيعات، المحتوى، المالية، الموارد البشرية — يراسلون عملاءك ويرسلون لك التقارير. ثنائيّو اللغة. جاهز في ٩٠ دقيقة.",
      cta_primary: "ابدأ تجربة مجانية",
      cta_secondary: "شاهد العرض الحي",
      trusted: "موثوق به في الرياض · جدة · الدمام",
      stat_uptime: "وقت التشغيل",
      stat_replies: "أول رد",
      stat_cost: "للمحادثة",
      stat_clients: "عميل نشط",
    },
    agents: {
      eyebrow: "§ ٠٢ · الفريق",
      title_a: "تسعة وكلاء أذكياء،",
      title_em: "منصّة واحدة",
      title_b: ".",
      sub: "كل وكيل له اسم وشخصيّة ومهمّة. يتشاركون عقلاً واحداً — معرفة عملك، عملاؤك، أرقامك — فالحجز الذي يتم على واتساب يصل في الموجز الصباحي.",
    },
    pricing: {
      eyebrow: "§ ٠٣ · الأسعار",
      title_a: "اشترك شهريّاً،",
      title_em: "ومتى ما توسّعت",
      title_b: ".",
      sub: "تكلفة المحادثة الواحدة قرابة ٠٫٠٠٤ ريال. تشمل الباقة فريقك الكامل من الوكلاء، الذاكرة الدائمة، كل التكاملات، ورقمَي واتساب — رقم للعملاء، ورقم خاص بالعقل المالك.",
      most: "الأكثر طلباً",
      tiers: {
        starter: "البداية",
        growth: "النموّ",
        pro: "الاحتراف",
        enterprise: "المؤسّسات",
      },
      setup: "تكلفة إعداد لمرّة واحدة",
      mo: "/شهر",
      cta_starter: "ابدأ بـ البداية",
      cta_growth: "ابدأ بـ النموّ",
      cta_pro: "ابدأ بـ الاحتراف",
      cta_enterprise: "تحدّث مع المبيعات",
    },
    dashboard: {
      hello: "صباح الخير",
      brief: "الموجز اليومي",
      jobs: "اليوم",
      health: "صحّة الوكلاء",
      mem: "ذاكرة العملاء",
      logs: "السجلّ",
    },
    demo: {
      eyebrow: "§ ٠٤ · عرض حي",
      title_a: "شاهد الوكيل",
      title_em: "يستحق راتبه",
      title_b: ".",
      sub: "سيناريو حقيقي من مطعم في الرياض، يُعاد بسرعة طبيعية. محادثة العميل على اليسار، العقل المالك على اليمين، والرسم المعرفي أسفل.",
      customer: "العميل · واتساب",
      owner: "العقل المالك · خاص",
    },
    footer: {
      tag: "تُشغّل دي‌سي‌بي موظفين رقميّين مستقلّين للشركات الصغيرة والمتوسطة في السعودية والإمارات. صُنعت في الرياض.",
      status: "كل الأنظمة تعمل",
      product: "المنصّة",
      dev: "موارد",
      company: "الدعم",
      legal: "قانوني",
    },
    common: {
      live: "مباشر",
      bilingual: "ثنائي اللغة",
      see_more: "المزيد",
      back: "رجوع",
      next: "التالي",
      copy: "نسخ",
      copied: "تم النسخ",
    },
  },
};

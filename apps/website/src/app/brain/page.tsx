"use client";

// /brain — live, ingestible visualization of a Najim Brain.
// Shows Saffron Kitchen's synthetic dataset growing in real time.
// The narrative scaffolding around the canvas is what sells it; the
// SVG is the proof-of-life.

import Link from "next/link";
import { DcpProvider } from "@/components/dcp/provider";
import { StickyDemoCta } from "@/components/dcp/sticky-demo-cta";
import { useLang } from "@/components/dcp/lib";
import { Nav, type NavLink } from "@/components/dcp/chrome";
import { Reveal } from "@/components/dcp/motion";
import { Arrow } from "@/components/dcp/icons";
import { BrainCanvas } from "@/components/brain-canvas";

function buildNavLinks(lang: "en" | "ar"): NavLink[] {
  return [
    { href: "/", label: lang === "ar" ? "الرئيسية" : "Home", key: "home" },
    { href: "/pricing", label: lang === "ar" ? "العرض" : "The offer", key: "pricing" },
    { href: "/teardown", label: lang === "ar" ? "تشريح مجاني" : "Free audit", key: "teardown" },
    { href: "/changelog", label: lang === "ar" ? "السجل" : "Changelog", key: "changelog" },
  ];
}

function BrainHero() {
  const { lang } = useLang();
  return (
    <section className="section" style={{ paddingTop: 56, paddingBottom: 24 }}>
      <div className="container">
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            opacity: 0.55,
            marginBottom: 12,
          }}
        >
          {lang === "ar" ? "دماغ نجم · مباشر" : "Najim Brain · live"}
        </div>
        <Reveal as="h1" className="display tight" style={{ marginBottom: 16, maxWidth: "20ch" }}>
          {lang === "ar" ? (
            <>
              شاهد دماغ <em>يُبنى</em>.
            </>
          ) : (
            <>
              Watch a brain <em>build itself.</em>
            </>
          )}
        </Reveal>
        <p
          className="lede-strong"
          style={{ maxWidth: "62ch", opacity: 0.85, fontSize: 17 }}
        >
          {lang === "ar"
            ? "هذا ما يحصل وراء الكواليس عند موظفة نجم. كل دائرة حقيقة — زبون، حجز، تفضيل، تنبيه، ملاحظة سرّية كتبتها للمالك. كل خط علاقة. الدماغ نفسه يكبر مع كل رسالة، ٢٤/٧."
            : "This is what runs behind a Najim hire. Every dot is one fact — a customer, a booking, a preference, a flag, a private note the owner wrote. Every line is a relationship. The brain grows with every message, 24/7."}
        </p>
      </div>
    </section>
  );
}

function BrainBody() {
  return (
    <section className="section" style={{ paddingTop: 8, paddingBottom: 40 }}>
      <div className="container">
        <BrainCanvas />
      </div>
    </section>
  );
}

function BrainContext() {
  const { lang } = useLang();
  const items = [
    {
      n: "01",
      t: lang === "ar" ? "كل ما يصل، يبقى" : "Everything that arrives, stays",
      s: lang === "ar"
        ? "رسالة، حجز، شكوى، صورة، تعليق — كل شيء يدخل عبر الموظفة يصبح ذاكرة دائمة. ما من شيء يضيع لأن أحد الموظفين استقال."
        : "Message, booking, complaint, photo, comment — anything that enters via the agent becomes permanent memory. Nothing leaves with a staff turnover.",
    },
    {
      n: "02",
      t: lang === "ar" ? "الدماغ يفكّر ليلاً" : "The brain thinks at night",
      s: lang === "ar"
        ? "كل يوم الساعة ٢ صباحاً تشتغل دورة الحلم: تنظيف التكرارات، استخراج الكيانات، رصد التناقضات، صياغة قواعد جديدة. تستيقظ موظفتك أذكى."
        : "Every night at 2am, the Dream Cycle runs: dedup, entity extraction, contradiction detection, rule drafting. She wakes up smarter.",
    },
    {
      n: "03",
      t: lang === "ar" ? "ملكية البيانات لك" : "Your data, your servers",
      s: lang === "ar"
        ? "الدماغ يعمل على بنية تحتية نملكها في الإمارات والسعودية. لا نبيع البيانات. لا نشاركها. عقد المعالجة موقّع قبل اليوم الأول."
        : "The brain runs on infrastructure we own in UAE & Saudi. We don't sell data, we don't share it. The DPA is signed before Day 1.",
    },
    {
      n: "04",
      t: lang === "ar" ? "بروتوكول MCP · لا حبس" : "MCP protocol · no lock-in",
      s: lang === "ar"
        ? "نفس البروتوكول المفتوح الذي يستعمله Claude وCursor وOpenClaw. لو قرّرت تخرج من نجم، الدماغ يخرج معك."
        : "The same open protocol Claude, Cursor, and OpenClaw use. If you decide to leave Najim, the brain leaves with you.",
    },
  ];
  return (
    <section className="section section-dark" style={{ paddingTop: 56, paddingBottom: 56 }}>
      <div className="container">
        <div className="sec-title-row">
          <h2 className="display-2">
            {lang === "ar" ? (
              <>
                ما الذي شاهدته <em>للتو؟</em>
              </>
            ) : (
              <>
                What you <em>just watched.</em>
              </>
            )}
          </h2>
          <p className="ss strong" style={{ maxWidth: "44ch" }}>
            {lang === "ar"
              ? "ليست رسوم متحرّكة. ليس نموذجاً. هذه هي البنية المعمارية الفعلية التي يعمل عليها كل موظف نجم في الإنتاج."
              : "Not an animation. Not a mockup. This is the actual architecture every Najim hire runs against in production."}
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          {items.map((it) => (
            <div
              key={it.n}
              style={{
                padding: "24px 26px",
                border: "1px solid var(--line, rgba(255,255,255,0.08))",
                borderRadius: 10,
                background: "var(--card-bg, rgba(255,255,255,0.02))",
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
                §{it.n}
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontFamily: "var(--serif, Georgia, serif)",
                  fontWeight: 400,
                  margin: "0 0 10px",
                }}
              >
                {it.t}
              </h3>
              <p style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.82, margin: 0 }}>{it.s}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BrainCta() {
  const { lang } = useLang();
  return (
    <section className="section" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <div className="container">
        <div
          style={{
            border: "1px solid rgba(212,146,75,0.4)",
            borderRadius: 14,
            padding: "40px 32px",
            background: "linear-gradient(180deg, rgba(212,146,75,0.06) 0%, rgba(212,146,75,0.01) 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 16,
          }}
        >
          <h2
            className="display-2"
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            {lang === "ar" ? (
              <>
                ابني <em style={{ color: "#d4924b" }}>دماغك</em><br />
                لعملك أنت.
              </>
            ) : (
              <>
                Build a brain <em style={{ color: "#d4924b" }}>for your business.</em>
              </>
            )}
          </h2>
          <p style={{ fontSize: 16, opacity: 0.82, maxWidth: "52ch", margin: 0 }}>
            {lang === "ar"
              ? "نزرع الدماغ من اليوم الأول بمعرفتك أنت — قائمتك، عملاؤك، ساعاتك، تفضيلاتك. خلال ١٠ أيام، يكون جاهز على واتساب."
              : "We seed the brain on Day 1 with your knowledge — your menu, your customers, your hours, your tone. In 10 working days, it's live on WhatsApp."}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <a
              className="btn primary lg"
              href="/kickoff"
              style={{ background: "#d4924b", borderColor: "#d4924b", color: "#0a0b0d" }}
            >
              {lang === "ar" ? "احجز موعد التشغيل" : "Schedule kickoff"} <Arrow size={14} />
            </a>
            <Link className="btn ghost lg" href="/teardown">
              {lang === "ar" ? "← شاهدها على عملك أولاً" : "← Run a preview on your site"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function BrainApp() {
  const { lang } = useLang();
  return (
    <div className="page">
      <Nav
        links={buildNavLinks(lang)}
        active="home"
        status={{
          label: lang === "ar" ? "متاحون للتوظيف · الإمارات والسعودية" : "HIRING · UAE & SAUDI",
        }}
        ctaLabel={lang === "ar" ? "احجز موعد التشغيل" : "Schedule kickoff"}
        ctaHref="/kickoff"
      />
      <BrainHero />
      <BrainBody />
      <BrainContext />
      <BrainCta />
    </div>
  );
}

export default function BrainPage() {
  return (
    <DcpProvider initialLang="en">
      <BrainApp />
      <StickyDemoCta />
    </DcpProvider>
  );
}

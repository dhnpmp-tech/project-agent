"use client";

// /kickoff — single-form intake page that closes the loop from every
// hero/pricing/team CTA. Three fields. One button. WhatsApps the
// founders directly with the captured info so we can schedule the
// real kickoff call manually until we wire Cal.com.

import { useState } from "react";
import Link from "next/link";
import { DcpProvider } from "@/components/dcp/provider";
import { StickyDemoCta } from "@/components/dcp/sticky-demo-cta";
import { useLang } from "@/components/dcp/lib";
import { Nav, type NavLink } from "@/components/dcp/chrome";
import { Reveal } from "@/components/dcp/motion";
import { Arrow } from "@/components/dcp/icons";

const FOUNDER_WA = "12058582516"; // same number as the StickyDemoCta target

function buildNavLinks(lang: "en" | "ar"): NavLink[] {
  return [
    { href: "/", label: lang === "ar" ? "الرئيسية" : "Home", key: "home" },
    { href: "/team", label: lang === "ar" ? "الفريق" : "Team", key: "team" },
    { href: "/pricing", label: lang === "ar" ? "الأسعار" : "Pricing", key: "pricing" },
    { href: "/teardown", label: lang === "ar" ? "التشريح" : "Teardown", key: "teardown" },
    { href: "/changelog", label: lang === "ar" ? "السجل" : "Changelog", key: "changelog" },
  ];
}

const INDUSTRIES = [
  { key: "restaurant", en: "Restaurant / café", ar: "مطعم / مقهى" },
  { key: "beauty", en: "Beauty / salon", ar: "تجميل / صالون" },
  { key: "realestate", en: "Real estate", ar: "عقارات" },
  { key: "healthcare", en: "Healthcare / clinic", ar: "رعاية صحية / عيادة" },
  { key: "retail", en: "Retail / e-commerce", ar: "تجزئة / متجر إلكتروني" },
  { key: "services", en: "Services / agency", ar: "خدمات / وكالة" },
  { key: "other", en: "Something else", ar: "شيء آخر" },
];

function KickoffForm() {
  const { lang } = useLang();
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0].key);
  const [whatsapp, setWhatsapp] = useState("");

  const industryLabel =
    INDUSTRIES.find((i) => i.key === industry)?.[lang] || INDUSTRIES[0][lang];

  const message =
    lang === "ar"
      ? `مرحبا فريق نجم،\n\nأنا ${name || "[اسمك]"} من ${business || "[اسم العمل]"} — ${industryLabel}.\nرقم واتساب: ${whatsapp || "[رقمك]"}.\n\nأبغى أحجز موعد كيكأوف لتوظيف أول موظفة ذكاء.`
      : `Hi Najim team,\n\nI'm ${name || "[your name]"} from ${business || "[business name]"} — ${industryLabel}.\nWhatsApp: ${whatsapp || "[your number]"}.\n\nReady to schedule a kickoff call to hire my first AI employee.`;

  const ready = name.trim().length > 0 && business.trim().length > 0;
  const waHref = `https://wa.me/${FOUNDER_WA}?text=${encodeURIComponent(message)}`;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
        gap: 40,
        alignItems: "start",
      }}
      className="kickoff-grid"
    >
      {/* Left — form */}
      <Reveal>
        <div
          style={{
            border: "1px solid var(--line, rgba(255,255,255,0.12))",
            borderRadius: 14,
            overflow: "hidden",
            background: "var(--card-bg, rgba(255,255,255,0.02))",
          }}
        >
          <div
            style={{
              padding: "22px 28px 18px",
              borderBottom: "1px solid var(--line, rgba(255,255,255,0.08))",
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                opacity: 0.55,
                marginBottom: 6,
              }}
            >
              {lang === "ar" ? "نموذج التشغيل · ٣ حقول" : "Kickoff intake · 3 fields"}
            </div>
            <div
              style={{
                fontSize: 24,
                fontFamily: "var(--serif, Georgia, serif)",
                fontWeight: 400,
                lineHeight: 1.15,
              }}
            >
              {lang === "ar" ? "حدّثنا عن عملك في ٣٠ ثانية" : "Tell us about your business in 30 seconds."}
            </div>
          </div>

          <div style={{ padding: "24px 28px", display: "grid", gap: 16 }}>
            <Field
              label={lang === "ar" ? "اسمك" : "Your name"}
              placeholder={lang === "ar" ? "أحمد المنصوري" : "Ahmad Al Mansoori"}
              value={name}
              onChange={setName}
            />
            <Field
              label={lang === "ar" ? "اسم العمل" : "Business name"}
              placeholder={lang === "ar" ? "مطعم زعفران" : "Saffron Kitchen"}
              value={business}
              onChange={setBusiness}
            />
            <SelectField
              label={lang === "ar" ? "القطاع" : "Industry"}
              value={industry}
              onChange={setIndustry}
              options={INDUSTRIES.map((i) => ({ value: i.key, label: i[lang] }))}
            />
            <Field
              label={lang === "ar" ? "واتساب (اختياري)" : "WhatsApp (optional)"}
              placeholder="+971 50 123 4567"
              value={whatsapp}
              onChange={setWhatsapp}
              type="tel"
            />

            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!ready}
              onClick={(e) => {
                if (!ready) e.preventDefault();
              }}
              style={{
                marginTop: 8,
                padding: "14px 20px",
                borderRadius: 10,
                background: ready ? "#d4924b" : "rgba(212,146,75,0.25)",
                color: ready ? "#0a0b0d" : "rgba(255,255,255,0.5)",
                fontFamily: "var(--mono, monospace)",
                fontSize: 13,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                fontWeight: 600,
                textAlign: "center",
                textDecoration: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: ready ? "pointer" : "not-allowed",
                transition: "background 200ms ease",
              }}
            >
              <span>
                {lang === "ar" ? "كلّمنا على واتساب الآن" : "Text us on WhatsApp now"}
              </span>
              <Arrow size={14} />
            </a>
            <div className="mono" style={{ fontSize: 10, opacity: 0.5, lineHeight: 1.5, marginTop: 4 }}>
              {lang === "ar"
                ? "تفتح واتساب مع رسالة جاهزة. لا نخزّن بياناتك ما لم ترسل الرسالة."
                : "Opens WhatsApp with a pre-filled message. We don't store anything until you press send."}
            </div>
          </div>
        </div>
      </Reveal>

      {/* Right — what happens next + reassurance */}
      <Reveal delay={120}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                opacity: 0.55,
                marginBottom: 10,
              }}
            >
              {lang === "ar" ? "ما يحدث بعدها" : "What happens next"}
            </div>
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 14 }}>
              {[
                {
                  n: "01",
                  t: lang === "ar" ? "نرد خلال ساعة" : "We reply within the hour",
                  s: lang === "ar"
                    ? "تصلك رسالة من أحد المؤسّسين — مو روبوت — لتحديد موعد المكالمة."
                    : "You hear from a founder — not a bot — to lock in a kickoff call.",
                },
                {
                  n: "02",
                  t: lang === "ar" ? "مكالمة ٢٠ دقيقة" : "20-minute kickoff call",
                  s: lang === "ar"
                    ? "نفهم عملك، نتعرّف على طريقتك بالتعامل مع الزبائن، ونصمّم موظفتك معاً."
                    : "We learn your business, your tone, your customer rhythm — and we co-design your hire.",
                },
                {
                  n: "03",
                  t: lang === "ar" ? "اليوم العاشر · إطلاق" : "Day 10 · she goes live",
                  s: lang === "ar"
                    ? "موظفتك ترد على أول رسالة واتساب من زبون. أنت تنام. هي تعمل."
                    : "Your hire takes her first WhatsApp message from a real customer. You sleep. She works.",
                },
              ].map((step) => (
                <li
                  key={step.n}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 1fr",
                    gap: 14,
                    alignItems: "start",
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: 12,
                      color: "#d4924b",
                      letterSpacing: "0.04em",
                      fontWeight: 600,
                      paddingTop: 2,
                    }}
                  >
                    {step.n}
                  </span>
                  <div>
                    <div style={{ fontSize: 16, fontFamily: "var(--serif, Georgia, serif)", marginBottom: 4 }}>
                      {step.t}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.55, opacity: 0.7 }}>{step.s}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* What we'll ask on the call */}
          <div>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                opacity: 0.55,
                marginBottom: 10,
              }}
            >
              {lang === "ar" ? "ما نسأله في المكالمة" : "What we'll ask on the call"}
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {(lang === "ar"
                ? [
                    "ما الذي يستهلك أكثر وقتك على واتساب؟",
                    "كم رسالة تردّ عليها في اليوم؟ ولأي ساعة؟",
                    "ما الأدوات التي تستخدمها (POS، حجوزات، دفع)؟",
                    "ما الذي يجعل عملك مختلف — لو رأيتها زبون لأول مرة؟",
                    "كيف تتكلّم — رسمي أم ودود؟ تفضّل عربي أو إنجليزي؟",
                  ]
                : [
                    "What eats most of your WhatsApp time today?",
                    "How many messages per day and until what hour?",
                    "What tools do you run (POS, bookings, payments)?",
                    "What makes your business different — first-impression-version?",
                    "Tone you prefer — formal or warm? Arabic-first or English-first?",
                  ]
              ).map((q, i) => (
                <li key={i} style={{ display: "flex", gap: 10, fontSize: 13, lineHeight: 1.55, opacity: 0.85 }}>
                  <span style={{ color: "#d4924b", flexShrink: 0, fontFamily: "var(--mono, monospace)", fontSize: 11, paddingTop: 1 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            style={{
              padding: "18px 22px",
              border: "1px solid rgba(93,138,74,0.3)",
              borderRadius: 10,
              background: "rgba(93,138,74,0.05)",
              fontSize: 13,
              lineHeight: 1.55,
              opacity: 0.92,
            }}
          >
            {lang === "ar" ? (
              <>
                <b style={{ color: "#5d8a4a" }}>عرض العميل المؤسّس:</b> أوّل ٥ شركات تحصل على
                ٢٬٥٠٠ درهم/شهر بدلاً من ٥٬٠٠٠ — مقابل دراسة حالة عند الإطلاق.
              </>
            ) : (
              <>
                <b style={{ color: "#5d8a4a" }}>Founding-customer rate:</b> the first 5 businesses
                pay AED 2,500/month instead of 5,000 — in trade for a launch case study.
              </>
            )}
          </div>

          <div
            style={{
              fontSize: 11,
              lineHeight: 1.6,
              opacity: 0.5,
              fontFamily: "var(--mono, monospace)",
              letterSpacing: "0.02em",
            }}
          >
            {lang === "ar" ? (
              <>
                نخزّن فقط ما يُرسل عبر واتساب. لا توجد مدفوعات حتى توقّع عرض التوظيف. إلغاء بنقرة في الشهر التالي.
              </>
            ) : (
              <>
                We only store what you actually send via WhatsApp. No payment until you accept the offer letter. Cancel any month with one click.
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/team"
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#d4924b",
                textDecoration: "none",
              }}
            >
              {lang === "ar" ? "← أو شاهد الفريق" : "← Meet the team first"}
            </Link>
            <Link
              href="/pricing"
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#d4924b",
                textDecoration: "none",
              }}
            >
              {lang === "ar" ? "اقرأ العرض الكامل" : "Read the full offer"}
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          opacity: 0.55,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "11px 14px",
          fontSize: 14,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--line, rgba(255,255,255,0.12))",
          borderRadius: 8,
          color: "inherit",
          outline: "none",
          fontFamily: "inherit",
        }}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label style={{ display: "block" }}>
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          opacity: 0.55,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "11px 14px",
          fontSize: 14,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--line, rgba(255,255,255,0.12))",
          borderRadius: 8,
          color: "inherit",
          outline: "none",
          fontFamily: "inherit",
          cursor: "pointer",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ background: "#0a0b0d" }}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function KickoffApp() {
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
      <section className="section" style={{ paddingTop: 56, paddingBottom: 32 }}>
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
            {lang === "ar" ? "احجز موعد التشغيل" : "Schedule your kickoff"}
          </div>
          <Reveal as="h1" className="display tight" style={{ marginBottom: 16, maxWidth: "20ch" }}>
            {lang === "ar" ? (
              <>
                <em>عشرة أيام</em> من الآن،<br />
                موظفتك تعمل.
              </>
            ) : (
              <>
                Ten days from now,<br />
                <em>your hire is working.</em>
              </>
            )}
          </Reveal>
          <p
            className="lede-strong"
            style={{ maxWidth: "58ch", marginBottom: 8, opacity: 0.85, fontSize: 17 }}
          >
            {lang === "ar"
              ? "نأخذ التفاصيل في ٣٠ ثانية. نتولّى كل شيء بعدها — التحقّق من ميتا، التدريب، التكاملات، الصوت، الوجه، والسيرة الذاتية."
              : "We take 30 seconds of details now. We handle everything after — Meta verification, training, integrations, voice, face, CV."}
          </p>

          {/* Trust strip */}
          <div
            style={{
              marginTop: 28,
              display: "flex",
              gap: 28,
              flexWrap: "wrap",
              alignItems: "center",
              opacity: 0.78,
              fontFamily: "var(--mono, monospace)",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5d8a4a" }} />
              {lang === "ar" ? "نرد خلال ساعة · أيام العمل" : "Reply within 1 hour · business hours"}
            </span>
            <span>
              {lang === "ar" ? "مقرّنا الرياض ودبي" : "Based in Riyadh + Dubai"}
            </span>
            <span>
              {lang === "ar" ? "إلغاء بنقرة · بدون عقد" : "Cancel anytime · no contract"}
            </span>
          </div>

          {/* Fast-track */}
          <div style={{ marginTop: 18, fontSize: 13, opacity: 0.65 }}>
            {lang === "ar" ? (
              <>
                مستعجل؟{" "}
                <a
                  href={`https://wa.me/${FOUNDER_WA}?text=${encodeURIComponent("Hi Najim — ready to talk now.")}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#d4924b", textDecoration: "underline" }}
                >
                  كلّمنا مباشرة على واتساب
                </a>{" "}
                بدون نموذج.
              </>
            ) : (
              <>
                In a hurry?{" "}
                <a
                  href={`https://wa.me/${FOUNDER_WA}?text=${encodeURIComponent("Hi Najim — ready to talk now.")}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#d4924b", textDecoration: "underline" }}
                >
                  Skip the form and WhatsApp us directly
                </a>
                .
              </>
            )}
          </div>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0, paddingBottom: 100 }}>
        <div className="container">
          <KickoffForm />
        </div>
      </section>
    </div>
  );
}

export default function KickoffPage() {
  return (
    <DcpProvider initialLang="en">
      <KickoffApp />
      <StickyDemoCta />
    </DcpProvider>
  );
}

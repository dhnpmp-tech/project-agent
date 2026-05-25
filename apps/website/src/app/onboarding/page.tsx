"use client";

// /onboarding — public-facing marketing mockup of the 4-step onboarding flow.
// Ported from /tmp/dcp-design/assets/onboarding.jsx (157 LOC).
// The real onboarding wizard lives in apps/client-dashboard/src/components/onboarding/
// and is OUT OF SCOPE for this page.

import { useState, type ReactNode } from "react";
import { SubShell } from "@/components/dcp/sub-shell";
import { Reveal } from "@/components/dcp/motion";
import { Arrow } from "@/components/dcp/icons";
import { useLang } from "@/components/dcp/lib";
import { TIERS, type TierId } from "@/lib/pricing-data";

const RATE_AED_TO_SAR = 1.02;

type RegionCode = "RUH" | "JED" | "DMM" | "AUH" | "DXB";
type Kind = "restaurant" | "salon" | "clinic" | "retail";

interface OnbData {
  name: string;
  region: RegionCode;
  kind: Kind;
  tier: TierId;
}

const TIER_LABEL_EN: Record<TierId, string> = {
  core: "Najim",
};
const TIER_LABEL_AR: Record<TierId, string> = {
  core: "نجم",
};

/* ─── PAGE ────────────────────────────────────────────────────── */

export default function OnboardingPage() {
  return (
    <SubShell active="home">
      <OnboardingShell />
    </SubShell>
  );
}

function OnboardingShell() {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [data, setData] = useState<OnbData>({
    kind: "restaurant",
    region: "RUH",
    tier: "core",
    name: "Saffron Riyadh",
  });

  return (
    <div className="onb-shell">
      <div className="onb-top">
        <span />
        <div className="onb-steps">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={"onb-step " + (i === step ? "on" : i < step ? "done" : "")}
            />
          ))}
        </div>
        <span />
      </div>
      <div className="onb-body">
        {step === 0 && (
          <StepBusiness data={data} setData={setData} next={() => setStep(1)} />
        )}
        {step === 1 && (
          <StepKind
            data={data}
            setData={setData}
            next={() => setStep(2)}
            back={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <StepTier
            data={data}
            setData={setData}
            next={() => setStep(3)}
            back={() => setStep(1)}
          />
        )}
        {step === 3 && <StepConfirm data={data} back={() => setStep(2)} />}
      </div>
    </div>
  );
}

/* ─── STEPS ───────────────────────────────────────────────────── */

interface StepProps {
  data: OnbData;
  setData: (d: OnbData) => void;
  next: () => void;
  back?: () => void;
}

function StepBusiness({ data, setData, next }: StepProps) {
  const { lang } = useLang();
  const ar = lang === "ar";
  return (
    <Reveal>
      <span className="eyebrow">§ 01 · {ar ? "البداية" : "start"}</span>
      <h1 className="onb-title">
        {ar ? (
          <>
            عرّفنا على <em>عملك</em>.
          </>
        ) : (
          <>
            Tell us about <em>your business</em>.
          </>
        )}
      </h1>
      <p className="onb-sub">
        {ar
          ? "اسم بسيط — كيف يجب أن يردّ الوكيل عند سؤال العميل عنك."
          : "A simple name — how the agent should refer to you when a customer asks."}
      </p>
      <div className="onb-form">
        <label className="field">
          <span>{ar ? "الاسم التجاري" : "Business name"}</span>
          <input
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
          />
        </label>
        <label className="field">
          <span>{ar ? "المنطقة" : "Region"}</span>
          <select
            value={data.region}
            onChange={(e) =>
              setData({ ...data, region: e.target.value as RegionCode })
            }
          >
            <option value="RUH">{ar ? "الرياض" : "Riyadh"}</option>
            <option value="JED">{ar ? "جدة" : "Jeddah"}</option>
            <option value="DMM">{ar ? "الدمام" : "Dammam"}</option>
            <option value="AUH">{ar ? "أبوظبي" : "Abu Dhabi"}</option>
            <option value="DXB">{ar ? "دبي" : "Dubai"}</option>
          </select>
        </label>
      </div>
      <div className="onb-actions">
        <a href="/" className="btn ghost">
          {ar ? "إلغاء" : "Cancel"}
        </a>
        <button type="button" className="btn primary" onClick={next}>
          {ar ? "التالي" : "Continue"} <Arrow size={12} />
        </button>
      </div>
    </Reveal>
  );
}

function StepKind({ data, setData, next, back }: StepProps) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const kinds: Array<[Kind, string, string]> = ar
    ? [
        ["restaurant", "مطعم", "حجوزات، طلبات، شكاوى"],
        ["salon", "صالون", "حجز مواعيد، تذكيرات، ولاء"],
        ["clinic", "عيادة", "مواعيد، أسئلة، متابعة"],
        ["retail", "متجر", "استفسارات منتجات، طلبات، تتبّع"],
      ]
    : [
        ["restaurant", "Restaurant", "Bookings, orders, complaints"],
        ["salon", "Salon", "Appointments, reminders, loyalty"],
        ["clinic", "Clinic", "Appointments, questions, follow-up"],
        ["retail", "Retail", "Product Q&A, orders, tracking"],
      ];
  return (
    <Reveal>
      <span className="eyebrow">§ 02 · {ar ? "النوع" : "kind"}</span>
      <h1 className="onb-title">
        {ar ? (
          <>
            أيّ نوع <em>يصفك</em>؟
          </>
        ) : (
          <>
            What <em>kind</em> are you?
          </>
        )}
      </h1>
      <p className="onb-sub">
        {ar
          ? "يستخدم وكلاؤك قوالب جاهزة لنوع عملك. تقدر تعدّلها لاحقاً."
          : "Your agents start with templates tuned for your industry. You can adjust them later."}
      </p>
      <div className="onb-pick">
        {kinds.map(([k, name, sub]) => (
          <label key={k}>
            <input
              type="radio"
              name="kind"
              checked={data.kind === k}
              onChange={() => setData({ ...data, kind: k })}
            />
            <div className="pick-body">
              <div className="pick-name">{name}</div>
              <div className="pick-sub">{sub}</div>
            </div>
          </label>
        ))}
      </div>
      <div className="onb-actions">
        <button type="button" className="btn ghost" onClick={back}>
          {ar ? "رجوع" : "Back"}
        </button>
        <button type="button" className="btn primary" onClick={next}>
          {ar ? "التالي" : "Continue"} <Arrow size={12} />
        </button>
      </div>
    </Reveal>
  );
}

function StepTier({ data, setData, next, back }: StepProps) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const labels = ar ? TIER_LABEL_AR : TIER_LABEL_EN;
  return (
    <Reveal>
      <span className="eyebrow">§ 03 · {ar ? "الباقة" : "plan"}</span>
      <h1 className="onb-title">
        {ar ? (
          <>
            اختر <em>باقتك</em>.
          </>
        ) : (
          <>
            Pick a <em>plan</em>.
          </>
        )}
      </h1>
      <p className="onb-sub">
        {ar
          ? "كل الباقات قابلة للترقية في أي وقت. ١٤ يوماً مجاناً."
          : "All plans are upgradeable any time. 14-day free trial included."}
      </p>
      <div className="onb-pick">
        {TIERS.map((tier) => {
          const monthlySar = Math.round(tier.monthly_aed * RATE_AED_TO_SAR);
          const sub = tier.includes[1] || tier.includes[0];
          return (
            <label key={tier.id}>
              <input
                type="radio"
                name="tier"
                checked={data.tier === tier.id}
                onChange={() => setData({ ...data, tier: tier.id })}
              />
              <div className="pick-body">
                <div className="pick-name">{labels[tier.id]}</div>
                <div className="pick-sub">
                  SAR {monthlySar.toLocaleString()}/mo · {sub}
                </div>
              </div>
            </label>
          );
        })}
      </div>
      <div className="onb-actions">
        <button type="button" className="btn ghost" onClick={back}>
          {ar ? "رجوع" : "Back"}
        </button>
        <button type="button" className="btn primary" onClick={next}>
          {ar ? "التالي" : "Continue"} <Arrow size={12} />
        </button>
      </div>
    </Reveal>
  );
}

function StepConfirm({ data, back }: { data: OnbData; back: () => void }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const labels = ar ? TIER_LABEL_AR : TIER_LABEL_EN;
  const rows: Array<[string, ReactNode]> = [
    [ar ? "الاسم" : "Name", data.name],
    [ar ? "المنطقة" : "Region", data.region],
    [ar ? "النوع" : "Kind", data.kind],
    [ar ? "الباقة" : "Plan", labels[data.tier]],
  ];
  return (
    <Reveal>
      <span className="eyebrow">§ 04 · {ar ? "التأكيد" : "confirm"}</span>
      <h1 className="onb-title">
        {ar ? (
          <>
            <em>جاهزون</em> للانطلاق.
          </>
        ) : (
          <>
            Almost <em>live</em>.
          </>
        )}
      </h1>
      <p className="onb-sub">
        {ar
          ? "بعد تأكيدك، نتّصل بـ واتساب الأعمال ونجهّز فريقك خلال ٩٠ دقيقة. سنرسل لك رسالة على رقم العقل المالك حال الجاهزيّة."
          : "Once you confirm, we connect WhatsApp Business and provision your team in ~90 minutes. We'll text you on your owner-brain number when it's ready."}
      </p>
      <div className="onb-summary">
        {rows.map(([k, v]) => (
          <div key={k} className="row">
            <span className="k">{k}</span>
            <span className="v">{v}</span>
          </div>
        ))}
      </div>
      <div className="onb-actions">
        <button type="button" className="btn ghost" onClick={back}>
          {ar ? "رجوع" : "Back"}
        </button>
        <a href="/app" className="btn primary">
          {ar ? "تأكيد · شغّل فريقي" : "Confirm · provision team"}{" "}
          <Arrow size={12} />
        </a>
      </div>
    </Reveal>
  );
}

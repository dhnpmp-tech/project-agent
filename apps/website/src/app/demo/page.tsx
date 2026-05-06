"use client";

// /demo — replayable customer chat + owner brain side-by-side.
// Ported from /tmp/dcp-design/demo.html + assets/demo.jsx.

import { useEffect, useRef, useState } from "react";
import { SectionMeta } from "@/components/dcp/chrome";
import { Reveal } from "@/components/dcp/motion";
import { Dot, Play, Stop } from "@/components/dcp/icons";
import { useLang } from "@/components/dcp/lib";
import { SubShell } from "@/components/dcp/sub-shell";
import { WhatsAppThread, OwnerBriefCard } from "@/components/dcp/screens";
import { getDemoThread, getDemoOwner } from "@/lib/demo-data";

export default function DemoPage() {
  return (
    <SubShell active="process">
      <Hero />
      <DemoLab />
      <Knowledge />
    </SubShell>
  );
}

function Hero() {
  const { lang, t } = useLang();
  return (
    <section className="section hero">
      <div className="container">
        <SectionMeta
          idx="04"
          label={lang === "ar" ? "العرض الحي" : "live demo"}
          right={<span className="mono">19:42 · {lang === "ar" ? "الرياض" : "Riyadh"}</span>}
        />
        <Reveal as="h1" className="display">
          {t.demo.title_a} <em className="grad">{t.demo.title_em}</em>
          {t.demo.title_b}
        </Reveal>
        <Reveal as="p" className="lede" delay={120}>
          {t.demo.sub}
        </Reveal>
      </div>
    </section>
  );
}

function DemoLab() {
  const { lang, t } = useLang();
  const thread = getDemoThread(lang);
  const owner = getDemoOwner(lang);
  const [step, setStep] = useState(thread.length);
  const [playing, setPlaying] = useState(false);
  const tick = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!playing) return;
    if (step >= thread.length) {
      setPlaying(false);
      return;
    }
    tick.current = setTimeout(() => setStep((s) => s + 1), 1100);
    return () => {
      if (tick.current) clearTimeout(tick.current);
    };
  }, [playing, step, thread.length]);

  function replay() {
    setStep(0);
    setPlaying(true);
  }

  function showAll() {
    setPlaying(false);
    setStep(thread.length);
  }

  const visible = thread.slice(0, step);
  const ownerCount = Math.min(Math.max(step - 2, 0), owner.length);
  const ownerVisible = owner.slice(0, ownerCount);
  const ownerItems = ownerVisible.length ? ownerVisible : owner.slice(0, 1);

  return (
    <section className="section section-dark">
      <div className="container">
        <div className="lab-controls">
          <button type="button" className="btn primary" onClick={replay}>
            <Play size={11} /> {lang === "ar" ? "إعادة" : "Replay"}
          </button>
          <button type="button" className="btn ghost" onClick={showAll}>
            <Stop size={10} /> {lang === "ar" ? "اظهر الكل" : "Show all"}
          </button>
          <span className="mono lab-step">
            {lang === "ar" ? "خطوة" : "STEP"} {step}/{thread.length}
          </span>
          <span className="mono lab-state">
            <Dot color={playing ? "var(--teal)" : "var(--mut)"} />{" "}
            {playing
              ? lang === "ar"
                ? "يعمل"
                : "playing"
              : lang === "ar"
                ? "متوقف"
                : "idle"}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            marginTop: 16,
          }}
        >
          <WhatsAppThread
            thread={visible}
            side="cust"
            label={t.demo.customer}
            sublabel={lang === "ar" ? "محمد · عميل عائد" : "Mohammed · returning"}
            lang={lang}
          />
          <OwnerBriefCard items={ownerItems} lang={lang} />
        </div>
      </div>
    </section>
  );
}

function Knowledge() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const facts: Array<[string, string]> = ar
    ? [
        ["الاسم", "محمد"],
        ["الطاولة المفضّلة", "١٢ — عند النافذة"],
        ["الوجبة الأخيرة", "كبسة لحم + تمر هندي"],
        ["تاريخ الزيارات", "٣ زيارات في ٤٥ يوماً"],
        ["متوسّط الإنفاق", "SAR ٢١٠"],
        ["تنبيهات", "لا فلفل · حساسيّة من المكسّرات"],
      ]
    : [
        ["Name", "Mohammed"],
        ["Preferred table", "12 — by the window"],
        ["Last order", "Lamb kabsa + tamr-hindi"],
        ["Visit history", "3 visits in 45 days"],
        ["Avg spend", "SAR 210"],
        ["Notes", "No chili · nut allergy"],
      ];
  return (
    <section className="section">
      <div className="container">
        <SectionMeta
          idx="05"
          label={ar ? "الذاكرة" : "memory"}
          right={<span className="mono">{ar ? "للعميل" : "PER-CUSTOMER"}</span>}
        />
        <h2 className="display-2" style={{ marginBottom: 24 }}>
          {ar ? (
            "ما تعرفه"
          ) : (
            <>
              What it <em className="grad">remembers</em>
            </>
          )}
          .
        </h2>
        <p className="ss" style={{ maxWidth: "60ch", marginBottom: 28 }}>
          {ar
            ? "ذاكرة دائمة لكل عميل. الوكيل يتعلّم من كل محادثة ويربط النقاط — بدون نموذج بيانات تفصيلي منك."
            : "Persistent memory per customer. The agent learns from every conversation and connects the dots — no schema design required."}
        </p>
        <div className="memory-grid">
          {facts.map(([k, v], i) => (
            <div key={i} className="mem-cell">
              <div className="mem-k mono">{k}</div>
              <div className="mem-v">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

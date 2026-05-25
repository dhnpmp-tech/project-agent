"use client";

// Pricing page — ported from /tmp/dcp-design/assets/pricing.jsx (633 LOC reference).
// Sections: Hero + cost-comparison panel · Tiers + currency switcher · Breakdown
// (pay vs get) · ROI calculator · 8×4 Compare matrix · FAQ · CTA. Styles live in
// apps/website/src/styles/pricing.css (identical to the designed pricing.css).

import { useState } from "react";
import { SubShell } from "@/components/dcp/sub-shell";
import { Reveal } from "@/components/dcp/motion";
import { SectionMeta } from "@/components/dcp/chrome";
import { Arrow, Check } from "@/components/dcp/icons";
import { useTweaks } from "@/components/dcp/lib";
import {
  type Currency,
  CURRENCY_SYMBOL,
  rateFor,
} from "@/lib/pricing-data";

/* ─── HERO ─────────────────────────────────────────────────────── */

function PricingHero() {
  return (
    <section className="section hero-v2">
      <div className="container">
        <div className="hero-head">
          <span className="eyebrow">
            <span className="d" />
            the offer · one price · no tiers
          </span>
        </div>
        <div className="pricing-hero-grid">
          <div>
            <Reveal as="h1" className="display tight">
              Like an actual <em>hire</em>.<br />
              Not a SaaS pricing page.
            </Reveal>
            <Reveal as="p" className="lede-strong" delay={120}>
              We do not sell tokens, credits, or feature menus. We sell a <b>job offer</b> — a bespoke AI teammate trained on your business, with a name, face, voice, and CV, ready to work WhatsApp in 10 working days. <b>AED 5,000/month. AED 3,500 one-time setup.</b> No surprise bills. No tiers to compare. No quotas.
            </Reveal>
          </div>
          <PricingHeroPanel />
        </div>
      </div>
    </section>
  );
}

function PricingHeroPanel() {
  // Cost comparison against the human equivalents an SMB would otherwise
  // need to hire to cover the same surface area. Numbers are anchored at
  // mid-market UAE salary bands (LinkedIn data, 2026).
  // UAE SMB salary medians, conservative end of the band so the
  // claim survives a 30-second prospect fact-check on Bayt/GulfTalent.
  // Sources: GulfTalent, Indeed UAE, PayScale UAE, Glassdoor Dubai (2026).
  const rows = [
    { k: "Marketing manager", v: "AED 14,000", d: "monthly · one person · 8h/day", n: "human" },
    { k: "Sales coordinator", v: "AED 7,000", d: "+ commission · CRM-only", n: "human" },
    { k: "Customer-service rep", v: "AED 4,500", d: "single channel · no nights", n: "human" },
    { k: "Generic AI chatbot", v: "AED 1,200", d: "1 channel · no memory", n: "tool" },
    { k: "Najim hire", v: "AED 5,000", d: "named teammate · all channels · 24/7", n: "us" },
  ];
  return (
    <div className="ph-panel">
      <div className="ph-hd">
        <div className="ph-t mono">COST COMPARISON</div>
        <div className="ph-r mono">PER MONTH</div>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.k}
          className={`ph-row ph-row-${r.n}`}
          style={{ animationDelay: `${i * 0.18}s` }}
        >
          <div className="ph-row-l">
            <div className="ph-k">{r.k}</div>
            <div className="ph-d mono">{r.d}</div>
          </div>
          <div className="ph-v">{r.v}</div>
          {r.n === "us" && <div className="ph-pick mono">↓ YOUR CHOICE</div>}
        </div>
      ))}
      <div className="ph-foot mono">
        One-third a marketing manager. The work of three. Around the clock.
      </div>
    </div>
  );
}

/* ─── THE OFFER LETTER ─────────────────────────────────────────── */

function Tiers() {
  const { state } = useTweaks();
  const cur = ((state.currency as Currency | undefined) || "AED");
  const rate = rateFor(cur);
  const sym = CURRENCY_SYMBOL[cur];

  const monthly = Math.round(5000 * rate);
  const setup = Math.round(3500 * rate);
  const founding = Math.round(2500 * rate);
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  const benefits: { title: string; sub: string }[] = [
    { title: "Bespoke name, face, voice, CV", sub: "Recraft portrait + ElevenLabs voice + one-page printable resume" },
    { title: "WhatsApp text + voice replies", sub: "Customer agents reply in Gulf Arabic or English, with voice notes in her own voice" },
    { title: "Foodics · SevenRooms · Tabby · Tamara · Fresha", sub: "Direct integrations into the booking + payment + POS layer" },
    { title: "9am daily WhatsApp owner brief", sub: "Text + voice note. VIP / at-risk / lapsed customer segmentation included" },
    { title: "Customer memory dashboard", sub: "Every customer carries tags, sentiment, last visit, preferences — refreshed every message" },
    { title: "Self-improving every night", sub: "GEPA prompt evolution + Karpathy rule generation. The agent gets better while you sleep" },
    { title: "Meta verification handled", sub: "We do the green-tick application, the business manager setup, and the BSP plumbing" },
    { title: "Direct line to the founders", sub: "WhatsApp the founder directly to tune tone, retire a phrase, or add an integration" },
  ];

  return (
    <section className="section section-tight">
      <div className="container">
        <SectionMeta
          idx="01"
          label="the offer"
          right={
            <div className="ph-cur-toggle">
              <CurrencyTog />
            </div>
          }
        />

        <div
          style={{
            maxWidth: 880,
            margin: "0 auto",
            border: "1px solid var(--line, rgba(255,255,255,0.12))",
            borderRadius: 14,
            overflow: "hidden",
            background: "var(--card-bg, rgba(255,255,255,0.02))",
          }}
        >
          {/* Letterhead */}
          <div
            style={{
              padding: "28px 36px 22px",
              borderBottom: "1px solid var(--line, rgba(255,255,255,0.08))",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 18,
            }}
          >
            <div>
              <div
                className="mono"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  opacity: 0.5,
                  marginBottom: 6,
                }}
              >
                Job offer · Najim · the AI staffing agency
              </div>
              <div
                style={{
                  fontSize: 30,
                  fontFamily: "var(--serif, Georgia, serif)",
                  fontWeight: 400,
                  lineHeight: 1.1,
                }}
              >
                AI Employee · bespoke for your business
              </div>
              <div className="mono" style={{ fontSize: 11, opacity: 0.5, marginTop: 6 }}>
                Issued {today} · Valid until accepted
              </div>
            </div>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--green, #5d8a4a)",
                padding: "5px 12px",
                border: "1px solid var(--green, #5d8a4a)",
                borderRadius: 999,
              }}
            >
              ● Available now
            </span>
          </div>

          {/* Compensation panel */}
          <div
            style={{
              padding: "30px 36px",
              borderBottom: "1px solid var(--line, rgba(255,255,255,0.06))",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 28,
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
                  marginBottom: 6,
                }}
              >
                Monthly salary
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span className="mono" style={{ fontSize: 14, opacity: 0.6 }}>{sym}</span>
                <span style={{ fontSize: 56, fontFamily: "var(--serif, Georgia, serif)", lineHeight: 1, fontWeight: 400 }}>
                  {monthly.toLocaleString()}
                </span>
              </div>
              <div className="mono" style={{ fontSize: 11, opacity: 0.5, marginTop: 6 }}>
                Includes inference, voice, hosting, owner brief
              </div>
            </div>
            <div>
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
                Setup (one-time)
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span className="mono" style={{ fontSize: 14, opacity: 0.6 }}>{sym}</span>
                <span style={{ fontSize: 56, fontFamily: "var(--serif, Georgia, serif)", lineHeight: 1, fontWeight: 400 }}>
                  {setup.toLocaleString()}
                </span>
              </div>
              <div className="mono" style={{ fontSize: 11, opacity: 0.5, marginTop: 6 }}>
                Meta verification · training · integrations · 10 working days
              </div>
            </div>
            <div>
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
                Start date
              </div>
              <div style={{ fontSize: 28, fontFamily: "var(--serif, Georgia, serif)", lineHeight: 1.2 }}>
                Day 10
              </div>
              <div className="mono" style={{ fontSize: 11, opacity: 0.5, marginTop: 6 }}>
                On WhatsApp · live in 10 working days from kickoff
              </div>
            </div>
          </div>

          {/* Job description */}
          <div style={{ padding: "30px 36px", borderBottom: "1px solid var(--line, rgba(255,255,255,0.06))" }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                opacity: 0.55,
                marginBottom: 16,
              }}
            >
              Job description
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.65, opacity: 0.88, maxWidth: "62ch", margin: 0 }}>
              Your hire reports to <b>you</b> on WhatsApp. She handles the customer-facing channel of your business — bookings, FAQ, complaints, lead qualification, voice notes, follow-ups — in <b>Arabic and English</b>, around the clock, with months of memory per customer. She never quits, never sleeps, never asks for a raise. We hire, train, and supervise her. You text the founder when you want her tone adjusted.
            </p>
          </div>

          {/* Benefits */}
          <div style={{ padding: "30px 36px", borderBottom: "1px solid var(--line, rgba(255,255,255,0.06))" }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                opacity: 0.55,
                marginBottom: 18,
              }}
            >
              Benefits package
            </div>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
              }}
            >
              {benefits.map((b) => (
                <li key={b.title} style={{ display: "flex", gap: 12 }}>
                  <span
                    style={{
                      flexShrink: 0,
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      background: "rgba(93,138,74,0.16)",
                      color: "var(--green, #5d8a4a)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 2,
                    }}
                  >
                    <Check size={11} />
                  </span>
                  <div>
                    <div style={{ fontSize: 14, lineHeight: 1.4, marginBottom: 3 }}>{b.title}</div>
                    <div className="mono" style={{ fontSize: 11, opacity: 0.55, lineHeight: 1.45 }}>{b.sub}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Terms / founding-customer note */}
          <div style={{ padding: "24px 36px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <div className="mono" style={{ fontSize: 11, opacity: 0.55, maxWidth: "44ch", lineHeight: 1.5 }}>
              Founding-customer rate: {sym} {founding.toLocaleString()}/month for the first 5 businesses, in trade for a case study. No long-term lock-in. Cancel any month.
            </div>
            <a className="btn primary lg" href="/kickoff">
              Accept &amp; schedule kickoff <Arrow size={14} />
            </a>
          </div>

          {/* Signature footer */}
          <div
            style={{
              padding: "20px 36px 28px",
              borderTop: "1px solid var(--line, rgba(255,255,255,0.06))",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 16,
              opacity: 0.65,
            }}
          >
            <div>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.6, marginBottom: 6 }}>
                Issued by
              </div>
              <div style={{ fontSize: 15, fontFamily: "var(--serif, Georgia, serif)", fontStyle: "italic" }}>
                Najim · the founders' line
              </div>
              <div className="mono" style={{ fontSize: 10, opacity: 0.55, marginTop: 4 }}>
                +1 (205) 858-2516 · agents.dcp.sa
              </div>
            </div>
            <div className="mono" style={{ fontSize: 10, opacity: 0.5, textAlign: "right" }}>
              Project Agent FZ-LLC<br />
              Dubai · Riyadh
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CurrencyTog() {
  const { state, setKey } = useTweaks();
  const cur = ((state.currency as Currency | undefined) || "AED");
  const opts: Currency[] = ["AED", "SAR", "USD"];
  return (
    <div className="cur-tog">
      {opts.map((c) => (
        <button
          key={c}
          className={"cur-opt " + (cur === c ? "on" : "")}
          onClick={() => setKey("currency", c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

/* ─── BREAKDOWN ANATOMY (pay vs get) ──────────────────────────── */

function BreakdownAnatomy() {
  const pay = [
    { k: "01", n: "Monthly subscription", v: "AED 3,000", d: "All tier agents, running 24/7" },
    { k: "02", n: "One-time setup", v: "AED 3,000", d: "Persona + ingest + channels + training" },
  ];
  const get = [
    { k: "01", n: "8 AI agents", d: "instead of 8 hires" },
    { k: "02", n: "24/7, no sleep", d: "no holidays, no quit" },
    { k: "03", n: "Persistent customer memory", d: "every guest, every detail" },
    { k: "04", n: "Bilingual AR + EN", d: "auto dialect detection" },
    { k: "05", n: "Nightly self-tuning", d: "smarter every morning" },
    { k: "06", n: "Regional infrastructure", d: "RUH < 50ms · DXB < 50ms" },
  ];
  return (
    <section className="section section-dark">
      <div className="container">
        <SectionMeta
          idx="02"
          label="the breakdown"
          right={<span className="mono">what you pay · what you get</span>}
        />
        <div className="sec-title-row">
          <h2 className="display tight">
            Two lines on the invoice.
            <br />
            An <em>army&apos;s worth</em> of output.
          </h2>
          <p className="ss strong">
            Everything you pay ↗︎. Everything you get ↘︎. <b>No hidden fees</b> —
            no API, no message, no storage.
          </p>
        </div>

        <div className="brk-grid">
          <div className="brk-side brk-pay">
            <div className="brk-side-hd">
              <div className="brk-num mono">↗︎ A</div>
              <div className="brk-side-t">What you pay</div>
            </div>
            {pay.map((p) => (
              <div key={p.k} className="brk-row">
                <div className="brk-k mono">{p.k}</div>
                <div className="brk-row-body">
                  <div className="brk-n">{p.n}</div>
                  <div className="brk-d mono">{p.d}</div>
                </div>
                <div className="brk-v">{p.v}</div>
              </div>
            ))}
            <div className="brk-side-foot mono">Year 1 total · AED 39,000</div>
          </div>

          <div className="brk-conn" aria-hidden>
            <div className="brk-conn-l mono">PRODUCES</div>
            <div className="brk-conn-arr">
              <svg viewBox="0 0 60 12" preserveAspectRatio="none">
                <path
                  d="M0 6 L52 6 M46 1 L52 6 L46 11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
              </svg>
            </div>
          </div>

          <div className="brk-side brk-get">
            <div className="brk-side-hd">
              <div className="brk-num mono">↘︎ B</div>
              <div className="brk-side-t">What you get</div>
            </div>
            <div className="brk-get-grid">
              {get.map((g) => (
                <div key={g.k} className="brk-get-cell">
                  <div className="brk-k mono">{g.k}</div>
                  <div className="brk-n">{g.n}</div>
                  <div className="brk-d mono">{g.d}</div>
                </div>
              ))}
            </div>
            <div className="brk-side-foot mono">
              Equivalent payroll · AED 144,000+
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── ROI CALCULATOR ──────────────────────────────────────────── */

function ROICalculator() {
  const [msgs, setMsgs] = useState(120);
  const [mins, setMins] = useState(3);
  const [rate, setRate] = useState(60);

  const hoursPerDay = (msgs * mins) / 60;
  const hoursPerMonth = Math.round(hoursPerDay * 30);
  const aedSavedMonth = Math.round(hoursPerMonth * rate);
  const cost = 3000;
  const netSave = aedSavedMonth - cost;
  const roiPct = Math.round((netSave / cost) * 100);

  return (
    <section className="section">
      <div className="container">
        <SectionMeta
          idx="03"
          label="the math"
          right={<span className="mono">calculate yourself</span>}
        />
        <div className="sec-title-row">
          <h2 className="display tight">
            The math <em>settles</em> it.
            <br />
            Plug in your numbers.
          </h2>
          <p className="ss strong">
            Not marketing claims — straight arithmetic. Drag the sliders to see
            your savings.
          </p>
        </div>

        <div className="roi-grid">
          <div className="roi-inputs">
            <RoiSlider
              label="Messages per day"
              val={msgs}
              setVal={setMsgs}
              min={20}
              max={500}
              step={10}
              suffix="msgs"
            />
            <RoiSlider
              label="Minutes per reply"
              val={mins}
              setVal={setMins}
              min={1}
              max={10}
              step={1}
              suffix="min"
            />
            <RoiSlider
              label="Cost per hour (AED)"
              val={rate}
              setVal={setRate}
              min={20}
              max={150}
              step={5}
              suffix="AED"
            />
            <div className="roi-formula mono">
              ({msgs} × {mins} / 60) × 30 days × {rate} AED − 3,000 cost
            </div>
          </div>

          <div className="roi-output">
            <div className="ro-hd">
              <div className="ro-t mono">YOUR RESULT</div>
              <div className="ro-r mono">PER MONTH</div>
            </div>
            <div className="ro-big">
              <div className="ro-big-v">AED {netSave.toLocaleString()}</div>
              <div className="ro-big-l mono">net savings</div>
            </div>
            <div className="ro-stats">
              <div className="ro-stat">
                <div className="ro-stat-v">{hoursPerMonth.toLocaleString()}h</div>
                <div className="ro-stat-l mono">hours reclaimed</div>
              </div>
              <div className="ro-stat">
                <div className="ro-stat-v">AED {aedSavedMonth.toLocaleString()}</div>
                <div className="ro-stat-l mono">value of time</div>
              </div>
              <div className="ro-stat">
                <div className="ro-stat-v">{roiPct}%</div>
                <div className="ro-stat-l mono">ROI</div>
              </div>
            </div>
            <div className="ro-bar">
              <div className="ro-bar-cost" style={{ flex: cost }}>
                <span className="mono">−AED {cost.toLocaleString()}</span>
              </div>
              <div className="ro-bar-save" style={{ flex: Math.max(netSave, 0) }}>
                <span className="mono">+AED {netSave.toLocaleString()}</span>
              </div>
            </div>
            <div className="ro-foot mono">
              based on the single Project Agent plan — AED 5,000/month all in (+ AED 3,500 one-time setup)
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoiSlider({
  label,
  val,
  setVal,
  min,
  max,
  step,
  suffix,
}: {
  label: string;
  val: number;
  setVal: (n: number) => void;
  min: number;
  max: number;
  step: number;
  suffix: string;
}) {
  const pct = ((val - min) / (max - min)) * 100;
  return (
    <div className="roi-slider">
      <div className="rs-row">
        <span className="rs-label">{label}</span>
        <span className="rs-val mono">
          {val.toLocaleString()} <span className="rs-suf">{suffix}</span>
        </span>
      </div>
      <div className="rs-rail">
        <div className="rs-fill" style={{ width: pct + "%" }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={val}
          onChange={(e) => setVal(parseInt(e.target.value, 10))}
        />
      </div>
      <div className="rs-bounds mono">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}


/* ─── FAQ ─────────────────────────────────────────────────────── */

function FAQv2() {
  const items: [string, string][] = [
    [
      "How fast is launch?",
      "10 days on average — from contract to live. All communication on WhatsApp. No Zoom calls, no questionnaires.",
    ],
    [
      "Are messages billed separately?",
      "No. One plan, all-inclusive — unlimited customers, unlimited messages, unlimited storage, unlimited API usage. No credits, no tokens, no surprise overages.",
    ],
    [
      "What if my volume spikes?",
      "Infrastructure auto-scales. No overage charges, no rate caps, no 'surprise bill' at month-end.",
    ],
    [
      "Do I need a technical team?",
      "No. We handle everything — WhatsApp Business, integrations, training. You talk, we build.",
    ],
    [
      "Can I cancel?",
      "Yes — anytime, with 30 days' notice. The setup fee is non-refundable once we go live.",
    ],
    [
      "Where is my data stored?",
      "Default: regional (RUH/DXB) infrastructure on a dedicated cloud computer per agent. KSA-resident data option available on request.",
    ],
    [
      "Can I try first?",
      "Yes — free 30-min audit on WhatsApp. We map your business and show where agents save you time.",
    ],
  ];

  return (
    <section className="section section-dark">
      <div className="container">
        <SectionMeta
          idx="04"
          label="questions"
          right={<span className="mono">or text us · WhatsApp</span>}
        />
        <div className="sec-title-row">
          <h2 className="display tight">
            Frequently <em>asked</em>.
          </h2>
        </div>
        <div className="faq-v2">
          {items.map(([q, a], i) => (
            <details key={i} className="faq-v2-item" open={i === 0}>
              <summary>
                <span className="faq-v2-num mono">§ 0{i + 1}</span>
                <span className="faq-v2-q">{q}</span>
                <span className="faq-v2-icon">+</span>
              </summary>
              <p className="faq-v2-a">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ─────────────────────────────────────────────────────── */

function PricingCTA() {
  return (
    <section className="section">
      <div className="container">
        <div className="cta-box-v2">
          <h3>
            The audit is <em>free</em>.
            <br />
            Launch in ten days.
          </h3>
          <p className="ss">
            We map your business and show where you&apos;re bleeding time. No
            pitch deck, no pressure.
          </p>
          <div className="ctas">
            <a className="btn primary lg" href="/app/onboarding">
              Book the audit <Arrow size={14} />
            </a>
            <a
              className="btn ghost lg"
              href="https://wa.me/12058582516?text=Hi"
              target="_blank"
              rel="noreferrer"
            >
              Or text us now
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── PAGE ────────────────────────────────────────────────────── */

export default function PricingPage() {
  return (
    <SubShell active="pricing">
      <PricingHero />
      <Tiers />
      <BreakdownAnatomy />
      <ROICalculator />
      <FAQv2 />
      <PricingCTA />
    </SubShell>
  );
}

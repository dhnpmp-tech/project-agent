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
  TIERS,
  type Tier,
  type TierId,
  type Currency,
  CURRENCY_SYMBOL,
  rateFor,
} from "@/lib/pricing-data";
import { AGENTS } from "@/lib/agents-data";

/* ─── HERO ─────────────────────────────────────────────────────── */

function PricingHero() {
  return (
    <section className="section hero-v2">
      <div className="container">
        <div className="hero-head">
          <span className="eyebrow">
            <span className="d" />
            pricing · in AED &amp; SAR
          </span>
        </div>
        <div className="pricing-hero-grid">
          <div>
            <Reveal as="h1" className="display tight">
              The cost of <em>one employee</em>.
              <br />
              The output of eight.
            </Reveal>
            <Reveal as="p" className="lede-strong" delay={120}>
              One monthly subscription. Every agent in your tier running 24/7.{" "}
              <b>One-time setup</b> covers all training on your business. No API
              fees, no per-message charges, no surprises.
            </Reveal>
          </div>
          <PricingHeroPanel />
        </div>
      </div>
    </section>
  );
}

function PricingHeroPanel() {
  const rows = [
    { k: "Human employee", v: "AED 12,000", d: "monthly · 8h/day", n: "human" },
    { k: "Generic AI tool", v: "AED 1,200", d: "1 tool · no memory", n: "tool" },
    { k: "DCP Agents", v: "AED 3,000", d: "8 agents · 24/7 · memory", n: "us" },
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
        ≈ 4× cheaper than one human, ≈ 8× the output
      </div>
    </div>
  );
}

/* ─── TIERS ────────────────────────────────────────────────────── */

function Tiers() {
  const { state } = useTweaks();
  const cur = ((state.currency as Currency | undefined) || "AED");
  const rate = rateFor(cur);
  const sym = CURRENCY_SYMBOL[cur];

  return (
    <section className="section section-tight">
      <div className="container">
        <SectionMeta
          idx="01"
          label="the tiers"
          right={
            <div className="ph-cur-toggle">
              <CurrencyTog />
            </div>
          }
        />
        <div className="tiers-grid">
          {TIERS.map((tier, i) => (
            <Reveal key={tier.id} delay={i * 80}>
              <TierCard tier={tier} sym={sym} rate={rate} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function TierCard({ tier, sym, rate }: { tier: Tier; sym: string; rate: number }) {
  const monthly = Math.round(tier.monthly_aed * rate);
  const setup = Math.round(tier.setup_aed * rate);
  return (
    <div className={`tier-card ${tier.popular ? "tier-pop" : ""}`}>
      {tier.popular && <div className="tier-badge mono">MOST CHOSEN</div>}
      <div className="tier-hd">
        <div className="tier-name">{tier.name}</div>
        <div className="tier-sub mono">{tier.sub}</div>
      </div>
      <div className="tier-price">
        <span className="tier-cur mono">{sym}</span>
        <span className="tier-num">{monthly.toLocaleString()}</span>
        <span className="tier-per mono">/ month</span>
      </div>
      <div className="tier-setup mono">
        + {sym} {setup.toLocaleString()} one-time setup
      </div>
      <a
        className={`btn ${tier.popular ? "primary" : "ghost"} lg tier-cta`}
        href="/app/onboarding"
      >
        Get started <Arrow size={13} />
      </a>
      <div className="tier-divider" />
      <div className="tier-incl-t mono">Includes</div>
      <ul className="tier-incl">
        {tier.includes.map((it, i) => (
          <li key={i}>
            <span className="tier-check">
              <Check size={11} />
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
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
              based on Growth tier — AED 3,000/month
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

/* ─── COMPARE MATRIX (8 agents × 4 tiers) ────────────────────── */

const TIER_ORDER: TierId[] = ["starter", "growth", "pro", "enterprise"];

function CompareMatrix() {
  return (
    <section className="section">
      <div className="container">
        <SectionMeta
          idx="04"
          label="full matrix"
          right={<span className="mono">8 agents × 4 tiers</span>}
        />
        <div className="sec-title-row">
          <h2 className="display tight">
            Every agent,
            <br />
            every <em>tier</em>.
          </h2>
        </div>

        <div className="cmp-v2">
          <div className="cmp-head">
            <div className="cmp-h-empty" />
            <div className="cmp-h-cell">
              <span className="mono">STARTER</span>
              <span className="cmp-h-p mono">1,500</span>
            </div>
            <div className="cmp-h-cell cmp-h-pop">
              <span className="mono">GROWTH</span>
              <span className="cmp-h-p mono">3,000</span>
            </div>
            <div className="cmp-h-cell">
              <span className="mono">PRO</span>
              <span className="cmp-h-p mono">5,000</span>
            </div>
            <div className="cmp-h-cell">
              <span className="mono">ENT.</span>
              <span className="cmp-h-p mono">8,000</span>
            </div>
          </div>
          {AGENTS.map((a) => {
            const order = TIER_ORDER.indexOf(a.tier);
            return (
              <div key={a.id} className="cmp-row">
                <div className="cmp-agent">
                  <span className="cmp-agent-num mono">§ {a.code}</span>
                  <span className="cmp-agent-n">{a.name.en}</span>
                  <span className="cmp-agent-r mono">{a.pitch.en}</span>
                </div>
                {TIER_ORDER.map((_, idx) => (
                  <div
                    key={idx}
                    className={"cmp-cell " + (idx === 1 ? "cmp-cell-pop" : "")}
                  >
                    {idx >= order ? (
                      <span className="cmp-yes">
                        <Check size={12} />
                      </span>
                    ) : (
                      <span className="cmp-no">·</span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
          <div className="cmp-row cmp-row-foot">
            <div className="cmp-agent">
              <span className="cmp-agent-n mono">PERSISTENT MEMORY</span>
            </div>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={"cmp-cell " + (i === 1 ? "cmp-cell-pop" : "")}
              >
                <span className="cmp-yes">
                  <Check size={12} />
                </span>
              </div>
            ))}
          </div>
          <div className="cmp-row cmp-row-foot">
            <div className="cmp-agent">
              <span className="cmp-agent-n mono">REGIONAL DATA RESIDENCY</span>
            </div>
            <div className="cmp-cell">
              <span className="cmp-no">·</span>
            </div>
            <div className="cmp-cell cmp-cell-pop">
              <span className="cmp-no">·</span>
            </div>
            <div className="cmp-cell">
              <span className="cmp-yes">
                <Check size={12} />
              </span>
            </div>
            <div className="cmp-cell">
              <span className="cmp-yes">
                <Check size={12} />
              </span>
            </div>
          </div>
          <div className="cmp-row cmp-row-foot">
            <div className="cmp-agent">
              <span className="cmp-agent-n mono">DEDICATED ACCOUNT MANAGER</span>
            </div>
            <div className="cmp-cell">
              <span className="cmp-no">·</span>
            </div>
            <div className="cmp-cell cmp-cell-pop">
              <span className="cmp-no">·</span>
            </div>
            <div className="cmp-cell">
              <span className="cmp-no">·</span>
            </div>
            <div className="cmp-cell">
              <span className="cmp-yes">
                <Check size={12} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
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
      "No. Every tier is all-inclusive — unlimited messages, unlimited storage, unlimited API usage.",
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
      "Yes — anytime, with 30 days' notice. Setup fee is non-refundable once we go live.",
    ],
    [
      "Where is my data stored?",
      "Default: regional (RUH/DXB) infrastructure. KSA-resident data option available on Enterprise.",
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
          idx="05"
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
      <CompareMatrix />
      <FAQv2 />
      <PricingCTA />
    </SubShell>
  );
}

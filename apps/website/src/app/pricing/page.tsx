"use client";

import { cn } from "@/lib/utils";
import { FadeUp, StaggerList, StaggerItem, GlowCard } from "@/components/motion";
import { motion } from "framer-motion";
import { useState } from "react";

/* ── Pricing tiers ────────────────────────────────────────── */

const plans = [
  {
    tier: "Starter",
    tagline: "For solopreneurs getting started",
    priceAED: "1,500",
    priceSAR: "1,530",
    features: [
      "WhatsApp AI agent with custom persona",
      "Owner Brain (morning briefs + commands)",
      "Sales Rep (lead scoring + pipeline)",
      "Basic weekly reports",
      "Arabic + English auto-detection",
      "Customer memory across conversations",
    ],
    popular: false,
  },
  {
    tier: "Growth",
    tagline: "For teams ready to scale",
    priceAED: "3,000",
    priceSAR: "3,060",
    features: [
      "Everything in Starter",
      "Content Engine (social media autopilot)",
      "Loyalty program management",
      "Google Business optimization",
      "Advanced analytics and reports",
      "Calendar and CRM integration",
      "Multi-channel content generation",
    ],
    popular: true,
  },
  {
    tier: "Pro",
    tagline: "For high-volume operations",
    priceAED: "5,000",
    priceSAR: "5,100",
    features: [
      "Everything in Growth",
      "AI image prompt generator",
      "Conversion tracking and attribution",
      "Priority support (under 2h response)",
      "Unlimited WhatsApp messages",
      "Custom workflow automations",
      "Voice message AI responses",
    ],
    popular: false,
  },
  {
    tier: "Enterprise",
    tagline: "For scaling operations",
    priceAED: "8,000",
    priceSAR: "8,160",
    features: [
      "Everything, unlimited",
      "Custom integrations and API access",
      "Dedicated account manager",
      "UAE data residency option",
      "SLA guarantee",
      "Dedicated infrastructure",
      "White-label available",
      "Multi-location support",
    ],
    popular: false,
  },
];

/* ── FAQ ──────────────────────────────────────────────────── */

const faqs = [
  {
    q: "How does onboarding work?",
    a: "You answer 6 quick questions over WhatsApp about your business. We build your AI persona, configure your knowledge base, and provision your dedicated WhatsApp number. The whole process takes about 10 minutes. Once payment is confirmed, your AI goes live.",
  },
  {
    q: "What is the setup fee?",
    a: "There is a one-time AED 3,000 setup fee that covers AI persona creation, knowledge base configuration, industry-specific workflow setup, and WhatsApp Business API provisioning. This is a one-time cost regardless of which plan you choose.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. All plans are month-to-month with no long-term contracts. Cancel anytime from your dashboard or by texting your Owner Brain. Your AI agent will continue working until the end of your current billing period.",
  },
  {
    q: "What languages does the AI support?",
    a: "The AI supports Arabic and English with automatic language detection. Your customers can switch between languages mid-conversation and the AI will respond in the same language. Both Modern Standard Arabic and Gulf dialect are supported.",
  },
  {
    q: "Do I need my own WhatsApp Business number?",
    a: "No. We provision a dedicated WhatsApp Business API number for your customer-facing agent and a separate private channel for your Owner Brain. Both numbers are included in every plan at no extra cost.",
  },
  {
    q: "How quickly can I go live?",
    a: "Most businesses are live within 10 minutes of completing payment. Your AI starts handling customer conversations immediately. It gets smarter every day through our self-improving AI engine, which analyzes conversations nightly and adjusts its behavior automatically.",
  },
];

/* ── FAQ Item component ───────────────────────────────────── */

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/[0.06]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-sm font-semibold text-white/80 pr-8">{q}</span>
        <motion.svg
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-4 h-4 text-white/40 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </motion.svg>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        className="overflow-hidden"
      >
        <p className="pb-5 text-sm text-white/40 leading-relaxed max-w-[65ch]">{a}</p>
      </motion.div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */

export default function PricingPage() {
  return (
    <div className="min-h-[100dvh] bg-surface-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-4 pt-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between bg-surface-950/70 backdrop-blur-2xl rounded-full px-6 py-3 ring-1 ring-white/[0.06]">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2L2 5.5l6 3.5 6-3.5L8 2zM2 10.5l6 3.5 6-3.5M2 8l6 3.5 6-3.5" />
              </svg>
            </div>
            <span className="text-[15px] font-bold text-white tracking-tight">AI Agent Systems</span>
          </a>
          <div className="hidden md:flex items-center gap-7 text-[13px] font-medium text-white/40">
            <a href="/services/" className="hover:text-white transition-colors duration-300">Services</a>
            <a href="/pricing/" className="text-white transition-colors duration-300">Pricing</a>
            <a href="/process/" className="hover:text-white transition-colors duration-300">Process</a>
            <a href="/case-study/" className="hover:text-white transition-colors duration-300">Case study</a>
            <a href="https://agents.dcp.sa/login" className="hover:text-white transition-colors duration-300">Login</a>
            <a href="https://agents.dcp.sa/signup" className="rounded-full bg-white/[0.06] hover:bg-white/[0.1] px-5 py-2 text-[13px] font-semibold text-white/60 transition-all duration-300 active:scale-[0.97]">
              Sign up
            </a>
            <a href="/book-audit/" className="group inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-[13px] font-semibold text-white transition-all duration-300 active:scale-[0.97] shadow-sm shadow-emerald-600/20">
              Book free audit
              <svg className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </a>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-16 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-surface-950 to-surface-950" />
        <div className="max-w-[1400px] mx-auto relative z-10">
          <FadeUp>
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Simple pricing
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-none mt-4 text-white">
                Plans that scale
                <br />
                <span className="text-emerald-400">
                  with your business
                </span>
              </h1>
              <p className="mt-4 text-base text-white/40 leading-relaxed max-w-[52ch]">
                One-time AED 3,000 setup fee covers persona creation, knowledge base, and WhatsApp provisioning. Live in 10 minutes. Month-to-month, cancel anytime.
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Setup banner */}
      <div className="max-w-[1400px] mx-auto px-6 mb-10">
        <FadeUp delay={0.1}>
          <div className="rounded-2xl bg-emerald-500/[0.07] ring-1 ring-emerald-500/20 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-400">Live in 10 minutes. No developers needed.</p>
                <p className="text-xs text-white/40 mt-0.5">Month-to-month. Cancel anytime. Includes dedicated WhatsApp number.</p>
              </div>
            </div>
            <p className="text-xs text-white/30 font-medium">One-time setup fee: AED 3,000</p>
          </div>
        </FadeUp>
      </div>

      {/* Pricing cards */}
      <main className="max-w-[1400px] mx-auto px-6 pb-28 relative">
        <StaggerList className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <StaggerItem key={plan.tier}>
              <GlowCard
                glowColor={plan.popular ? "rgba(34, 197, 94, 0.15)" : "rgba(34, 197, 94, 0.06)"}
                className={cn(
                  "relative flex flex-col rounded-2xl overflow-hidden h-full",
                  "bg-white/[0.03] ring-1 transition-all duration-700",
                  plan.popular
                    ? "ring-emerald-500/30 shadow-[0_0_40px_rgba(34,197,94,0.08)]"
                    : "ring-white/[0.06]"
                )}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
                )}

                <div className="p-6 flex flex-col flex-1">
                  {/* Header */}
                  <div className="mb-6">
                    {plan.popular && (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-semibold bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 mb-4">
                        Most popular
                      </span>
                    )}
                    <h3 className="text-lg font-extrabold tracking-tight text-white">{plan.tier}</h3>
                    <p className="text-xs text-white/40 mt-1">{plan.tagline}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs text-white/40 font-medium">AED</span>
                      <span className="text-4xl font-extrabold tracking-tighter text-white">{plan.priceAED}</span>
                      <span className="text-sm text-white/30 font-medium">/mo</span>
                    </div>
                    <p className="text-[11px] text-white/25 mt-1.5">SAR {plan.priceSAR}/mo equivalent</p>
                  </div>

                  {/* Features */}
                  <div className="flex-1 space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex gap-2.5 text-sm text-white/50">
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <a
                    href="/book-audit/"
                    className={cn(
                      "group flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-all duration-300 active:scale-[0.97]",
                      plan.popular
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.25)] hover:shadow-[0_0_30px_rgba(34,197,94,0.35)]"
                        : "bg-white/[0.06] hover:bg-white/[0.1] text-white/70 ring-1 ring-white/[0.08] hover:ring-white/[0.15]"
                    )}
                  >
                    Get started
                    <svg className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </a>
                </div>
              </GlowCard>
            </StaggerItem>
          ))}
        </StaggerList>

        {/* Comparison note */}
        <FadeUp className="mt-16">
          <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-8 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-white">Go live in minutes</h3>
                <p className="mt-2 text-xs text-white/40 leading-relaxed">Self-service onboarding. AI crawls your website, builds your knowledge base, and configures your industry-specific workflows automatically.</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-white">No lock-in contracts</h3>
                <p className="mt-2 text-xs text-white/40 leading-relaxed">Month-to-month billing. Scale up, scale down, or cancel anytime. Your data and training are preserved for 30 days if you pause.</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-white">Arabic + English, 24/7</h3>
                <p className="mt-2 text-xs text-white/40 leading-relaxed">Your AI agent speaks both languages fluently with automatic detection. Gulf dialect supported. Voice messages transcribed and answered.</p>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* FAQ Section */}
        <FadeUp className="mt-20">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-white/[0.05] text-white/50 ring-1 ring-white/[0.08] mb-6">
                FAQ
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tighter text-white">
                Common questions
              </h2>
            </div>

            <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
              {faqs.map((faq) => (
                <FAQItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </FadeUp>

        {/* CTA */}
        <FadeUp className="mt-20">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-zinc-900" />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-transparent to-violet-600/10" />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.06] rounded-3xl" />

            <div className="relative p-12 md:p-16">
              <motion.div
                className="absolute top-0 right-0 w-64 h-64 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)" }}
                animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="relative max-w-xl">
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tighter text-white">Not sure which plan fits?</h2>
                <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                  Book a free 30-minute audit. We will map your operations, recommend the right plan, and show you exactly what your AI agent will do from day one. No commitment, no pressure.
                </p>
                <a href="/book-audit/" className="group inline-flex items-center gap-3 mt-6 rounded-full bg-emerald-600 hover:bg-emerald-500 px-8 py-4 text-sm font-semibold text-white transition-all duration-500 active:scale-[0.97] shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:shadow-[0_0_50px_rgba(34,197,94,0.4)]">
                  Book free AI audit
                  <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-500 group-hover:translate-x-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </span>
                </a>
              </div>
            </div>
          </div>
        </FadeUp>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-12">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2L2 5.5l6 3.5 6-3.5L8 2zM2 10.5l6 3.5 6-3.5M2 8l6 3.5 6-3.5" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-white/40">AI Agent Systems</span>
          </div>
          <div className="flex items-center gap-8 text-xs text-white/40 font-medium">
            <a href="/services/" className="hover:text-white/60 transition-colors">Services</a>
            <a href="/pricing/" className="hover:text-white/60 transition-colors">Pricing</a>
            <a href="/process/" className="hover:text-white/60 transition-colors">Process</a>
            <a href="/case-study/" className="hover:text-white/60 transition-colors">Case study</a>
            <a href="https://agents.dcp.sa/login" className="hover:text-white/60 transition-colors">Login</a>
            <a href="https://agents.dcp.sa/signup" className="hover:text-white/60 transition-colors">Sign up</a>
            <a href="/book-audit/" className="hover:text-white/60 transition-colors">Book audit</a>
          </div>
          <p className="text-xs text-white/20">
            &copy; {new Date().getFullYear()} AI Agent Systems. Dubai, UAE.
          </p>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { FadeUp, StaggerList, StaggerItem, GlowCard } from "@/components/motion";
import { motion } from "framer-motion";

const agents = [
  {
    name: "WhatsApp Intelligence Agent",
    tagline: "Your 24/7 customer service team",
    description:
      "Handles all inbound WhatsApp messages — customer inquiries, lead qualification, appointment booking, complaints — in Arabic and English. Responds in under 1 second, maintains conversation context, integrates with your CRM.",
    benefits: [
      "400+ inquiries handled monthly",
      "65-80% reduction in support workload",
      "24/7 in Arabic and English",
      "CRM integration (HubSpot, Zoho, Airtable)",
      "Smart escalation to human agents",
      "Appointment booking via Calendly",
    ],
    metric: "65-80%",
    metricLabel: "support load cut",
    gradient: "from-emerald-500/20 to-emerald-500/5",
    glow: "rgba(34, 197, 94, 0.15)",
    dot: "bg-emerald-400",
    textAccent: "text-emerald-400",
    check: "text-emerald-400",
  },
  {
    name: "AI Sales Development Rep",
    tagline: "Never miss a lead again",
    description:
      "Autonomously manages your entire top-of-funnel: scores leads against your ideal customer profile, sends personalized multi-channel outreach, qualifies prospects through adaptive conversation, and books meetings with your sales team.",
    benefits: [
      "500-5,000 leads processed monthly",
      "Instant response (under 5 min vs 47hr avg)",
      "Personalized email and WhatsApp outreach",
      "ICP scoring and lead qualification",
      "Automated follow-up sequences",
      "70-80% lower cost vs human SDR",
    ],
    metric: "70-80%",
    metricLabel: "lower cost per meeting",
    gradient: "from-amber-500/20 to-amber-500/5",
    glow: "rgba(245, 158, 11, 0.15)",
    dot: "bg-amber-400",
    textAccent: "text-amber-400",
    check: "text-amber-400",
  },
  {
    name: "Content Engine Agent",
    tagline: "Social media on autopilot",
    description:
      "Runs your entire organic content operation — researches trending topics, generates platform-specific posts, creates short-form video with Arabic and English voice, and publishes on schedule across LinkedIn, Instagram, and TikTok.",
    benefits: [
      "7+ posts per week across platforms",
      "Arabic and English bilingual content",
      "AI-generated video with voice synthesis",
      "Consistent brand voice",
      "Performance analytics loop",
      "From 30+ min to under 2 min per post",
    ],
    metric: "<2 min",
    metricLabel: "per post",
    gradient: "from-rose-500/20 to-rose-500/5",
    glow: "rgba(244, 63, 94, 0.15)",
    dot: "bg-rose-400",
    textAccent: "text-rose-400",
    check: "text-rose-400",
  },
  {
    name: "HR Screening and Scheduling",
    tagline: "Hire faster, screen smarter",
    description:
      "Ingests CVs, scores candidates against your criteria, sends personalized advancement or rejection messages, and books interviews directly into hiring manager calendars.",
    benefits: [
      "10-15 hours saved per hiring cycle",
      "Consistent, fair candidate scoring",
      "Personalized communication to every applicant",
      "Automated interview scheduling",
      "Full audit trail for compliance",
    ],
    metric: "10-15h",
    metricLabel: "saved per cycle",
    gradient: "from-sky-500/20 to-sky-500/5",
    glow: "rgba(14, 165, 233, 0.15)",
    dot: "bg-sky-400",
    textAccent: "text-sky-400",
    check: "text-sky-400",
  },
  {
    name: "Financial Intelligence Agent",
    tagline: "Your weekly financial advisor",
    description:
      "Connects to your financial data, categorizes transactions, detects anomalies, and delivers weekly financial health reports in plain language.",
    benefits: [
      "12 hours per month returned to you",
      "Automated transaction categorization",
      "Anomaly detection and flagging",
      "Weekly and monthly reports",
      "Cash flow forecasting",
    ],
    metric: "12h/mo",
    metricLabel: "time returned",
    gradient: "from-violet-500/20 to-violet-500/5",
    glow: "rgba(139, 92, 246, 0.15)",
    dot: "bg-violet-400",
    textAccent: "text-violet-400",
    check: "text-violet-400",
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-[100dvh] bg-surface-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-4 pt-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between bg-surface-950/70 backdrop-blur-2xl rounded-full px-6 py-3 ring-1 ring-white/[0.08] shadow-[0_2px_24px_rgba(0,0,0,0.3)]">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2L2 5.5l6 3.5 6-3.5L8 2zM2 10.5l6 3.5 6-3.5M2 8l6 3.5 6-3.5" />
              </svg>
            </div>
            <span className="text-sm font-bold text-white tracking-tight">AI Agent Systems</span>
          </a>
          <div className="hidden md:flex items-center gap-7 text-[13px] font-medium text-white/50">
            <a href="/services/" className="text-white transition-colors duration-300">Services</a>
            <a href="/process/" className="hover:text-white transition-colors duration-300">Process</a>
            <a href="/case-study/" className="hover:text-white transition-colors duration-300">Case study</a>
            <a href="/book-audit/" className="group inline-flex items-center gap-2 rounded-full bg-brand-500 hover:bg-brand-400 px-5 py-2 text-[13px] font-semibold text-white transition-all duration-300 active:scale-[0.97]">
              Book free audit
              <svg className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </a>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-16 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 via-surface-950 to-surface-950" />
        <div className="max-w-[1400px] mx-auto relative z-10">
          <FadeUp>
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                Our services
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-none mt-4">
                5 AI agents,
                <br />
                <span className="bg-gradient-to-r from-brand-400 via-emerald-300 to-brand-500 bg-clip-text text-transparent">
                  battle-tested
                </span>
              </h1>
              <p className="mt-4 text-base text-white/50 leading-relaxed max-w-[52ch]">
                Each agent is ready to deploy for your business in under two weeks.
                Pick one or deploy them all as a unified system.
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Agents */}
      <main className="max-w-[1400px] mx-auto px-6 pb-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-900 to-surface-950 -z-10" />

        <StaggerList className="space-y-5">
          {agents.map((agent) => (
            <StaggerItem key={agent.name}>
              <GlowCard
                glowColor={agent.glow}
                className={cn(
                  "grid grid-cols-1 md:grid-cols-12 gap-px items-stretch rounded-3xl overflow-hidden",
                  "bg-white/[0.04] ring-1 ring-white/[0.06]",
                  "transition-all duration-700"
                )}
              >
                {/* Metric side */}
                <div className={cn(
                  "md:col-span-3 p-8 flex flex-col justify-center bg-gradient-to-br",
                  agent.gradient
                )}>
                  <p className={cn("text-4xl md:text-5xl font-extrabold tracking-tighter font-mono", agent.textAccent)}>
                    {agent.metric}
                  </p>
                  <p className="text-xs text-white/40 mt-1.5">{agent.metricLabel}</p>
                  <div className="flex items-center gap-2 mt-4">
                    <span className={cn("w-2.5 h-2.5 rounded-full", agent.dot)} />
                    <span className={cn("text-xs font-semibold", agent.textAccent)}>{agent.tagline}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="md:col-span-9 p-8 bg-surface-900/50">
                  <h2 className="text-xl font-extrabold tracking-tight">{agent.name}</h2>
                  <p className="mt-3 text-sm text-white/50 leading-relaxed max-w-[65ch]">{agent.description}</p>
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {agent.benefits.map((b) => (
                      <div key={b} className="flex gap-2.5 text-sm text-white/60">
                        <svg className={cn("w-4 h-4 flex-shrink-0 mt-0.5", agent.check)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {b}
                      </div>
                    ))}
                  </div>
                </div>
              </GlowCard>
            </StaggerItem>
          ))}
        </StaggerList>

        {/* CTA */}
        <FadeUp className="mt-16">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 via-surface-900 to-violet-500/10" />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.06] rounded-3xl" />

            <div className="relative p-12 md:p-16">
              <motion.div
                className="absolute top-0 right-0 w-64 h-64 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)" }}
                animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="relative max-w-xl">
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tighter">Not sure which agents you need?</h2>
                <p className="mt-3 text-sm text-white/40 leading-relaxed">
                  Book a free 30-minute audit. We map your operations and recommend the right configuration.
                </p>
                <a href="/book-audit/" className="group inline-flex items-center gap-3 mt-6 rounded-full bg-brand-500 hover:bg-brand-400 px-8 py-4 text-sm font-semibold text-white transition-all duration-500 active:scale-[0.97] shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:shadow-[0_0_50px_rgba(34,197,94,0.4)]">
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
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2L2 5.5l6 3.5 6-3.5L8 2zM2 10.5l6 3.5 6-3.5M2 8l6 3.5 6-3.5" />
              </svg>
            </div>
            <span className="text-xs font-semibold">AI Agent Systems</span>
          </div>
          <div className="flex items-center gap-8 text-xs text-white/30 font-medium">
            <a href="/services/" className="text-white/60">Services</a>
            <a href="/process/" className="hover:text-white/60 transition-colors duration-300">Process</a>
            <a href="/case-study/" className="hover:text-white/60 transition-colors duration-300">Case study</a>
            <a href="/book-audit/" className="hover:text-white/60 transition-colors duration-300">Book audit</a>
          </div>
          <p className="text-xs text-white/20">
            &copy; {new Date().getFullYear()} AI Agent Systems. Dubai, UAE.
          </p>
        </div>
      </footer>
    </div>
  );
}

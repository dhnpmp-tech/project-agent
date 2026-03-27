"use client";

/* Website v2 — dark theme with animations, social proof, integration logos */
import { cn } from "@/lib/utils";
import { FadeUp, StaggerList, StaggerItem, ScaleIn, GlowCard, Float } from "@/components/motion";
import { AgentNetworkSVG, WorkflowSVG, ChatMockupSVG, GradientMesh, GridBackground, IntegrationLogos, WhatsAppLogo, LinkedInLogo, InstagramLogo } from "@/components/illustrations";
import { motion } from "framer-motion";

const agents = [
  {
    title: "WhatsApp Intelligence",
    desc: "Powered by Kapso — connects in 2 minutes, no Meta approval wait. Handles 400+ inquiries/month in Arabic and English. AI voice calls, lead qualification, appointment booking, and human escalation. Sub-second responses.",
    metric: "65-80%",
    metricLabel: "support load reduction",
    color: "emerald",
    gradient: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-500/20",
    glow: "rgba(34, 197, 94, 0.15)",
    dot: "bg-emerald-400",
    textAccent: "text-emerald-400",
  },
  {
    title: "AI Sales Rep",
    desc: "Scores leads against your ICP, sends personalized outreach via email and WhatsApp, qualifies through conversation, and books meetings with your team.",
    metric: "70-80%",
    metricLabel: "lower cost per meeting",
    color: "amber",
    gradient: "from-amber-500/20 to-amber-500/5",
    border: "border-amber-500/20",
    glow: "rgba(245, 158, 11, 0.15)",
    dot: "bg-amber-400",
    textAccent: "text-amber-400",
  },
  {
    title: "Content Engine",
    desc: "Runs your entire content operation across LinkedIn, Instagram, and TikTok. Generates posts, creates video with AI voice, publishes on schedule. Bilingual.",
    metric: "<2 min",
    metricLabel: "per post (was 30+)",
    color: "rose",
    gradient: "from-rose-500/20 to-rose-500/5",
    border: "border-rose-500/20",
    glow: "rgba(244, 63, 94, 0.15)",
    dot: "bg-rose-400",
    textAccent: "text-rose-400",
  },
  {
    title: "HR Screening",
    desc: "Parses CVs, scores candidates against your criteria, sends personalized messages, and books interviews directly into hiring manager calendars.",
    metric: "10-15h",
    metricLabel: "saved per hiring cycle",
    color: "sky",
    gradient: "from-sky-500/20 to-sky-500/5",
    border: "border-sky-500/20",
    glow: "rgba(14, 165, 233, 0.15)",
    dot: "bg-sky-400",
    textAccent: "text-sky-400",
  },
  {
    title: "Financial Intelligence",
    desc: "Connects to your financial data, categorizes transactions, flags anomalies, and delivers weekly health reports in plain language.",
    metric: "12h/mo",
    metricLabel: "returned to owner",
    color: "violet",
    gradient: "from-violet-500/20 to-violet-500/5",
    border: "border-violet-500/20",
    glow: "rgba(139, 92, 246, 0.15)",
    dot: "bg-violet-400",
    textAccent: "text-violet-400",
  },
];

const pricing = [
  {
    tier: "Starter",
    tagline: "Solopreneurs",
    price: "1,500",
    setup: "AED 2,999 one-time setup",
    features: [
      "1 AI agent (WhatsApp or Content)",
      "Arabic + English",
      "24/7 autonomous operation",
      "Monthly performance report",
      "Email support",
    ],
  },
  {
    tier: "Professional",
    tagline: "Growing teams",
    price: "8,000",
    setup: "AED 15,000 one-time setup",
    popular: true,
    features: [
      "3-5 AI agents",
      "Full CRM integration (HubSpot, Zoho)",
      "Custom knowledge base",
      "Weekly reports and live dashboard",
      "Priority support",
      "Dedicated Slack channel",
    ],
  },
  {
    tier: "Enterprise",
    tagline: "Scaling operations",
    price: "30,000+",
    setup: "Custom setup and integration",
    features: [
      "Unlimited agents",
      "Dedicated infrastructure",
      "UAE data residency",
      "Custom integrations and API access",
      "SLA guarantee",
      "Dedicated account manager",
    ],
  },
];

export default function HomePage() {
  return (
    <div className="min-h-[100dvh] bg-surface-950 text-white">
      {/* Navigation — floating glass pill */}
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
            <a href="/services/" className="hover:text-white transition-colors duration-300">Services</a>
            <a href="/process/" className="hover:text-white transition-colors duration-300">Process</a>
            <a href="/case-study/" className="hover:text-white transition-colors duration-300">Case study</a>
            <a href="/book-audit/" className="group inline-flex items-center gap-2 rounded-full bg-brand-500 hover:bg-brand-400 px-5 py-2 text-[13px] font-semibold text-white transition-all duration-300 active:scale-[0.97]">
              Book free audit
              <svg className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </a>
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative min-h-[100dvh] flex items-center px-6 pt-28 pb-20 overflow-hidden">
        <GradientMesh />
        <GridBackground />

        <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          {/* Left — copy */}
          <FadeUp>
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              Deploying in UAE and Saudi Arabia
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[0.95]">
              AI agents that
              <br />
              run your business
              <br />
              <span className="bg-gradient-to-r from-brand-400 via-emerald-300 to-brand-500 bg-clip-text text-transparent">
                around the clock
              </span>
            </h1>

            <p className="mt-6 text-lg text-white/50 leading-relaxed max-w-[52ch]">
              We deploy fully-managed AI agent systems for SMBs in the Middle East.
              WhatsApp support (powered by Kapso — live in 2 minutes), sales automation,
              content, HR, and finance — deployed in under two weeks.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <a href="/book-audit/" className="group inline-flex items-center justify-center gap-3 rounded-full bg-brand-500 hover:bg-brand-400 px-8 py-4 text-sm font-semibold text-white transition-all duration-500 active:scale-[0.97] shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:shadow-[0_0_50px_rgba(34,197,94,0.4)]">
                Book a free AI audit
                <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-500 group-hover:translate-x-0.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </span>
              </a>
              <a href="/case-study/" className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-semibold text-white/70 ring-1 ring-white/10 hover:ring-white/20 hover:bg-white/5 transition-all duration-500 active:scale-[0.97]">
                Read case study
              </a>
            </div>

            {/* Inline stats */}
            <div className="mt-14 flex gap-10">
              {[
                { value: "380+", label: "inquiries automated monthly" },
                { value: "19h", label: "owner time saved per week" },
                { value: "11d", label: "to go live" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-3xl font-extrabold tracking-tighter font-mono bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">{s.value}</p>
                  <p className="text-xs text-white/30 mt-1 leading-snug max-w-[14ch]">{s.label}</p>
                </div>
              ))}
            </div>
          </FadeUp>

          {/* Right — animated agent network illustration */}
          <FadeUp delay={0.3} className="relative">
            <Float duration={8} distance={16}>
              <div className="relative">
                {/* Glow behind illustration */}
                <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-violet-500/10 to-sky-500/10 rounded-3xl blur-3xl scale-110" />
                <div className="relative bg-surface-900/50 backdrop-blur-sm rounded-3xl border border-white/[0.06] p-8">
                  <AgentNetworkSVG className="w-full h-auto" />
                  {/* Bottom label */}
                  <div className="mt-4 flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                      <span className="text-xs text-white/40 font-mono">5 agents online</span>
                    </div>
                    <span className="text-xs text-white/20 font-mono">latency &lt;1s</span>
                  </div>
                </div>
              </div>
            </Float>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════ SOCIAL PROOF + INTEGRATIONS ═══════════ */}
      <section className="px-6 py-16 relative border-t border-white/[0.04]">
        <div className="max-w-[1400px] mx-auto">
          <FadeUp>
            <div className="flex flex-col md:flex-row items-center justify-between gap-10">
              {/* Testimonial snippet */}
              <div className="flex items-center gap-4 max-w-lg">
                <div className="flex -space-x-2 flex-shrink-0">
                  {["AH", "SK", "MR"].map((initials, i) => (
                    <div key={initials} className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-surface-950",
                      i === 0 ? "bg-brand-500/30 text-brand-300" :
                      i === 1 ? "bg-sky-500/30 text-sky-300" :
                      "bg-violet-500/30 text-violet-300"
                    )}>
                      {initials}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-0.5 mb-0.5">
                    {[1,2,3,4,5].map((star) => (
                      <svg key={star} className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-xs text-white/40">Trusted by SMBs across <span className="text-white/60 font-medium">Dubai, Abu Dhabi, and Riyadh</span></p>
                </div>
              </div>

              {/* Integration logos */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/15 mb-3">Integrates with</p>
                <IntegrationLogos />
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════ AGENTS ═══════════ */}
      <section className="px-6 py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-900 to-surface-950" />
        <div className="max-w-[1400px] mx-auto relative z-10">
          <FadeUp>
            <div className="max-w-2xl mb-16">
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-white/5 text-white/40 ring-1 ring-white/10 mb-6">
                5 agents, one system
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tighter leading-[1.05]">
                Each agent works autonomously.
                <br />
                <span className="text-white/40">Together, they transform your business.</span>
              </h2>
            </div>
          </FadeUp>

          <StaggerList className="space-y-4">
            {agents.map((agent) => (
              <StaggerItem key={agent.title}>
                <GlowCard
                  glowColor={agent.glow}
                  className={cn(
                    "grid grid-cols-1 md:grid-cols-12 gap-px items-stretch rounded-3xl overflow-hidden",
                    "bg-white/[0.04] ring-1 ring-white/[0.06]",
                    "transition-all duration-700"
                  )}
                >
                  {/* Metric */}
                  <div className={cn(
                    "md:col-span-3 p-8 flex flex-col justify-center bg-gradient-to-br",
                    agent.gradient
                  )}>
                    <p className={cn("text-4xl md:text-5xl font-extrabold tracking-tighter font-mono", agent.textAccent)}>
                      {agent.metric}
                    </p>
                    <p className="text-xs text-white/40 mt-1.5">{agent.metricLabel}</p>
                  </div>

                  {/* Content */}
                  <div className="md:col-span-9 p-8 bg-surface-900/50">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={cn("w-2.5 h-2.5 rounded-full", agent.dot)} />
                      <h3 className="text-lg font-bold tracking-tight">{agent.title}</h3>
                    </div>
                    <p className="text-sm text-white/50 leading-relaxed max-w-[65ch]">{agent.desc}</p>
                  </div>
                </GlowCard>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className="px-6 py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-surface-950 to-surface-900" />
        {/* Subtle gradient accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-brand-500/5 to-transparent rounded-full blur-3xl" />

        <div className="max-w-[1400px] mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <FadeUp>
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-white/5 text-white/40 ring-1 ring-white/10 mb-6">
                How it works
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tighter leading-[1.05]">
                From first call to live agents
                <br />
                <span className="bg-gradient-to-r from-brand-400 to-sky-400 bg-clip-text text-transparent">in under 2 weeks</span>
              </h2>
              <p className="mt-6 text-base text-white/40 leading-relaxed max-w-[52ch]">
                No technical knowledge required from you. We handle everything
                from setup to ongoing optimization.
              </p>

              {/* Workflow SVG */}
              <div className="mt-10 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <WorkflowSVG className="w-full h-auto" />
              </div>

              <a href="/process/" className="group inline-flex items-center gap-3 mt-8 rounded-full bg-white/5 hover:bg-white/10 ring-1 ring-white/10 px-7 py-3.5 text-sm font-semibold transition-all duration-500 active:scale-[0.97]">
                See full process
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center transition-transform duration-500 group-hover:translate-x-0.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </span>
              </a>
            </FadeUp>

            <FadeUp delay={0.2}>
              <div className="space-y-5">
                {[
                  { step: "01", title: "Free audit", desc: "30-minute call. We map what to automate and estimate your ROI.", color: "text-brand-400", border: "border-brand-500/20", bg: "bg-brand-500/5" },
                  { step: "02", title: "Configure", desc: "We build your agents with your knowledge base and connect your tools.", color: "text-sky-400", border: "border-sky-500/20", bg: "bg-sky-500/5" },
                  { step: "03", title: "Launch", desc: "Full testing, your approval, then go live. Usually 5-10 business days.", color: "text-violet-400", border: "border-violet-500/20", bg: "bg-violet-500/5" },
                  { step: "04", title: "Optimize", desc: "Live dashboard, monthly ROI reports, continuous performance improvements.", color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/5" },
                ].map((s) => (
                  <motion.div
                    key={s.step}
                    className={cn(
                      "flex gap-5 p-5 rounded-2xl border transition-all duration-500",
                      s.border, s.bg,
                      "hover:bg-white/[0.04]"
                    )}
                    whileHover={{ x: 6 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  >
                    <div className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-xl bg-surface-950 border flex items-center justify-center text-xs font-bold font-mono",
                      s.border, s.color
                    )}>
                      {s.step}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">{s.title}</h3>
                      <p className="text-sm text-white/40 mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Chat mockup */}
              <div className="mt-8">
                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/20 mb-3 px-1">Live agent preview</p>
                <ChatMockupSVG />
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIAL ═══════════ */}
      <section className="px-6 py-28 relative overflow-hidden">
        {/* Gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-surface-950 to-violet-500/5" />

        <div className="max-w-[1400px] mx-auto relative z-10">
          <FadeUp>
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-white/5 text-white/40 ring-1 ring-white/10 mb-8">
                Case study
              </span>
              <blockquote className="text-3xl md:text-5xl font-extrabold tracking-tighter leading-[1.1]">
                &ldquo;I was skeptical about AI handling our customer conversations.
                But the WhatsApp agent sounds like one of our best agents.
                <span className="bg-gradient-to-r from-brand-400 to-emerald-300 bg-clip-text text-transparent"> I got my weekends back.</span>&rdquo;
              </blockquote>
              <div className="mt-8 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-500/5 flex items-center justify-center ring-1 ring-brand-500/20">
                  <span className="text-sm font-bold text-brand-400">AH</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/90">Agency owner</p>
                  <p className="text-xs text-white/40">Real estate, Dubai Marina — 380 inquiries automated monthly</p>
                </div>
              </div>
              <a href="/case-study/" className="group inline-flex items-center gap-3 mt-8 rounded-full bg-white/5 hover:bg-white/10 ring-1 ring-white/10 px-6 py-3 text-sm font-semibold transition-all duration-500">
                Read the full case study
                <svg className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </a>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════ PRICING ═══════════ */}
      <section className="px-6 py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-900 to-surface-950" />

        <div className="max-w-[1400px] mx-auto relative z-10">
          <FadeUp>
            <div className="max-w-2xl mb-16">
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-white/5 text-white/40 ring-1 ring-white/10 mb-6">
                Pricing
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tighter leading-[1.05]">
                Transparent pricing,
                <br />
                <span className="text-white/40">no surprises</span>
              </h2>
              <p className="mt-4 text-base text-white/40 max-w-[52ch]">
                All plans include full setup, training, and ongoing optimization. Cancel anytime.
              </p>
            </div>
          </FadeUp>

          <StaggerList className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {pricing.map((plan) => (
              <StaggerItem key={plan.tier}>
                <GlowCard
                  glowColor={plan.popular ? "rgba(34, 197, 94, 0.2)" : "rgba(255,255,255,0.05)"}
                  className={cn(
                    "relative h-full rounded-3xl transition-all duration-700",
                    plan.popular
                      ? "bg-gradient-to-b from-brand-500/10 to-brand-500/[0.02] ring-1 ring-brand-500/30"
                      : "bg-white/[0.03] ring-1 ring-white/[0.06]"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-8">
                      <span className="inline-flex items-center rounded-full bg-brand-500 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                        Most popular
                      </span>
                    </div>
                  )}

                  <div className="h-full flex flex-col p-8">
                    <div>
                      <p className={cn("text-xs font-semibold uppercase tracking-[0.15em]", plan.popular ? "text-brand-400" : "text-white/40")}>{plan.tier}</p>
                      <p className="text-xs mt-0.5 text-white/30">{plan.tagline}</p>
                    </div>

                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-xs text-white/30">AED</span>
                      <span className="text-4xl font-extrabold tracking-tighter font-mono bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">{plan.price}</span>
                      <span className="text-sm text-white/30">/mo</span>
                    </div>
                    <p className="text-xs mt-1 text-white/20">{plan.setup}</p>

                    <ul className="mt-8 space-y-3 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="text-sm flex gap-2.5 text-white/50">
                          <svg className={cn("w-4 h-4 flex-shrink-0 mt-0.5", plan.popular ? "text-brand-400" : "text-white/30")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <a
                      href="/book-audit/"
                      className={cn(
                        "mt-8 group flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-all duration-500 active:scale-[0.97]",
                        plan.popular
                          ? "bg-brand-500 text-white hover:bg-brand-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                          : "bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/10"
                      )}
                    >
                      Get started
                      <span className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center transition-transform duration-500 group-hover:translate-x-0.5",
                        plan.popular ? "bg-white/20" : "bg-white/10"
                      )}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                      </span>
                    </a>
                  </div>
                </GlowCard>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="px-6 pb-28">
        <div className="max-w-[1400px] mx-auto">
          <ScaleIn>
            <div className="relative rounded-3xl overflow-hidden">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 via-surface-900 to-violet-500/10" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.06] rounded-3xl" />

              <div className="relative p-12 md:p-20 text-center">
                {/* Animated orbs */}
                <motion.div
                  className="absolute top-0 right-0 w-80 h-80 rounded-full"
                  style={{ background: "radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)" }}
                  animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute bottom-0 left-0 w-64 h-64 rounded-full"
                  style={{ background: "radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)" }}
                  animate={{ x: [0, -15, 0], y: [0, 20, 0] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />

                <div className="relative">
                  <h2 className="text-3xl md:text-5xl font-extrabold tracking-tighter leading-[1.05]">
                    Ready to automate?
                  </h2>
                  <p className="mt-4 text-base text-white/40 max-w-md mx-auto leading-relaxed">
                    Book a free 30-minute AI audit. We map exactly what you can automate and
                    estimate the time and cost savings. No commitment.
                  </p>
                  <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                    <a href="/book-audit/" className="group inline-flex items-center justify-center gap-3 rounded-full bg-brand-500 hover:bg-brand-400 px-8 py-4 text-sm font-semibold text-white transition-all duration-500 active:scale-[0.97] shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:shadow-[0_0_50px_rgba(34,197,94,0.4)]">
                      Book your free audit
                      <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-500 group-hover:translate-x-0.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                      </span>
                    </a>
                  </div>
                  <p className="mt-4 text-xs text-white/25">
                    Free 30-min call &middot; Written AI roadmap &middot; No strings attached
                  </p>
                </div>
              </div>
            </div>
          </ScaleIn>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
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
            <a href="/services/" className="hover:text-white/60 transition-colors duration-300">Services</a>
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

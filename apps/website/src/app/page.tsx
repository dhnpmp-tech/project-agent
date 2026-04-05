"use client";

/* eslint-disable */
/* Website v5 — Dark, no images, pure typography + motion
 * Taste-skill: DESIGN_VARIANCE: 8, MOTION_INTENSITY: 6, VISUAL_DENSITY: 4
 * No emojis. No centered hero. No 3-column card grids. No gradient text. No Inter.
 * Geist font. Single accent: emerald. Zinc neutrals. No images. */

import { cn } from "@/lib/utils";
import { FadeUp, StaggerList, StaggerItem, ScaleIn, GlowCard } from "@/components/motion";
import { HeroDemo } from "@/components/hero-demo";
import { motion } from "framer-motion";

const pricing = [
  {
    tier: "Starter",
    tagline: "For solopreneurs",
    price: "1,500",
    setup: "AED 2,999 one-time",
    features: [
      "1 AI agent — WhatsApp or Content",
      "Arabic + English, around the clock",
      "Customer memory across conversations",
      "Owner alerts via WhatsApp",
      "Self-service onboarding",
    ],
  },
  {
    tier: "Professional",
    tagline: "For growing teams",
    price: "8,000",
    setup: "AED 15,000 one-time",
    popular: true,
    features: [
      "3 to 5 AI agents, shared brain",
      "AI Chief of Staff with daily briefs",
      "Deep customer memory across channels",
      "Auto knowledge base from your website",
      "Industry-specific configuration",
      "Calendar and CRM integration",
    ],
  },
  {
    tier: "Enterprise",
    tagline: "For scaling operations",
    price: "30,000+",
    setup: "Custom integration",
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

const agents = [
  {
    name: "WhatsApp Agent",
    desc: "Not a chatbot — a person. We generate a unique AI employee with a real backstory, personality, and voice. She remembers every customer — their name, their usual order, their wife's birthday. She texts like a real person: short messages, natural timing, never a wall of text. She never says she's an AI. Birthday? She gets excited. Bad day? She's gentle. Can't decide? She'll tease you.",
    color: "emerald",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
  },
  {
    name: "Owner Brain",
    desc: "Your AI Chief of Staff. Morning brief at 9am with numbers, VIPs, and issues. Take a photo of today's special — it updates the menu, posts to Instagram, and texts your regulars. All from WhatsApp.",
    color: "amber",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
  },
  {
    name: "Sales Rep",
    desc: "Scores every lead against your ideal customer profile. Hot leads get personalized outreach in minutes, not days. Warm leads get nurtured. Cold leads get archived. You only see the ones worth your time.",
    color: "sky",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    name: "Content Engine",
    desc: "Weekly content plan for Instagram, LinkedIn, and TikTok. Bilingual. AI-generated from your brand voice and business data. Owner takes a photo — it becomes a reel, a post, and a story. On schedule, on brand, zero effort.",
    color: "rose",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
      </svg>
    ),
  },
  {
    name: "HR Screening",
    desc: "23 CVs arrive. Four minutes later, you see 4 candidates worth interviewing, with scores, strengths, and suggested questions. Decline emails already sent. Interviews already scheduled in your calendar.",
    color: "violet",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    name: "Financial Intelligence",
    desc: "Sunday morning: a plain-language report lands on your WhatsApp. Revenue up 12%. Seafood costs spiked 18% — here's a cheaper supplier. Dessert orders dropped — time for a new menu item? Numbers that tell you what to do, not just what happened.",
    color: "orange",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
];

const colorMap: Record<string, { bg: string; text: string; ring: string; glow: string }> = {
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", ring: "hover:ring-emerald-500/20", glow: "rgba(16, 185, 129, 0.08)" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", ring: "hover:ring-amber-500/20", glow: "rgba(245, 158, 11, 0.08)" },
  sky: { bg: "bg-sky-500/10", text: "text-sky-400", ring: "hover:ring-sky-500/20", glow: "rgba(14, 165, 233, 0.08)" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-400", ring: "hover:ring-rose-500/20", glow: "rgba(244, 63, 94, 0.08)" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-400", ring: "hover:ring-violet-500/20", glow: "rgba(139, 92, 246, 0.08)" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-400", ring: "hover:ring-orange-500/20", glow: "rgba(249, 115, 22, 0.08)" },
};

export default function HomePage() {
  return (
    <div className="min-h-[100dvh] bg-surface-950 text-white font-sans antialiased">

      {/* ═══ NAV ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-4 pt-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between bg-surface-950/70 backdrop-blur-2xl rounded-full px-6 py-3 ring-1 ring-white/[0.06] shadow-[0_2px_24px_rgba(0,0,0,0.3)]">
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
            <a href="/process/" className="hover:text-white transition-colors duration-300">Process</a>
            <a href="/case-study/" className="hover:text-white transition-colors duration-300">Case study</a>
            <a href="https://agents.dcp.sa/login" className="hover:text-white transition-colors duration-300">Login</a>
            <a href="https://agents.dcp.sa/signup" className="rounded-full bg-white/[0.06] hover:bg-white/[0.1] ring-1 ring-white/[0.08] px-5 py-2 text-[13px] font-semibold text-white/70 transition-all duration-300 active:scale-[0.97]">
              Sign up
            </a>
            <a href="/book-audit/" className="group inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-[13px] font-semibold text-white transition-all duration-300 active:scale-[0.97] shadow-[0_0_20px_rgba(16,185,129,0.25)]">
              Book free audit
              <svg className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </a>
          </div>
        </div>
      </nav>

      {/* ═══ HERO — Split: copy left, unified flow right ═══ */}
      <section className="relative min-h-[100dvh] flex items-center px-6 pt-28 pb-16 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/[0.03] rounded-full blur-[100px] translate-y-1/3 pointer-events-none" />

        <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 items-center relative z-10">
          {/* Left — copy */}
          <FadeUp>
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live in UAE and Saudi Arabia
            </div>

            <h1 className="text-5xl md:text-[4rem] lg:text-[4.5rem] font-extrabold tracking-[-0.04em] leading-[0.98]">
              Run your business.
              <br />
              <span className="text-emerald-400">Not your inbox.</span>
            </h1>

            <p className="mt-8 text-lg text-white/50 leading-[1.7] max-w-[44ch]">
              AI employees that remember every customer, improve themselves
              nightly from real conversations, and proactively follow up — so
              no booking is ever lost. In Arabic and English, around the clock.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <a href="https://wa.me/12058582516?text=Hi" target="_blank" rel="noopener noreferrer" className="group inline-flex items-center justify-center gap-3 rounded-full bg-emerald-600 hover:bg-emerald-500 px-8 py-4 text-[15px] font-semibold text-white transition-all duration-500 active:scale-[0.97] shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.4)]">
                Try the live demo
                <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-500 group-hover:translate-x-0.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </span>
              </a>
              <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-[15px] font-semibold text-white/60 ring-1 ring-white/[0.08] hover:ring-white/[0.15] hover:bg-white/[0.03] transition-all duration-500 active:scale-[0.97]">
                How it works
              </a>
            </div>

            <div className="mt-14 flex gap-12">
              {[
                { value: "380+", label: "inquiries monthly" },
                { value: "2 min", label: "to go live" },
                { value: "24/7", label: "self-improving" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-extrabold tracking-tighter font-mono text-white">{s.value}</p>
                  <p className="text-[10px] text-white/25 mt-1.5 leading-snug max-w-[12ch] uppercase tracking-wider font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </FadeUp>

          {/* Right — unified flow (chat + backend events interleaved) */}
          <FadeUp delay={0.3} className="flex justify-center lg:justify-end">
            <HeroDemo />
          </FadeUp>
        </div>
      </section>

      {/* ═══ PROBLEM ═══ */}
      <section className="px-6 py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-rose-500/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-[1400px] mx-auto relative z-10">
          <FadeUp>
            <div className="max-w-3xl mb-14">
              <h2 className="text-4xl md:text-[3.5rem] font-extrabold tracking-[-0.03em] leading-[1.05]">
                You&apos;re doing the work
                <br />
                of <span className="text-rose-400">6 people.</span>
              </h2>
              <p className="mt-6 text-white/40 text-lg leading-relaxed max-w-[48ch]">
                Hiring is expensive. Training takes months. Turnover is constant. You need help — but not the kind that costs AED 10,000 a month per head.
              </p>
            </div>
          </FadeUp>

          <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { pain: "Answering WhatsApp messages until midnight", time: "3h/day" },
              { pain: "Posting on social media between customer calls", time: "1.5h/day" },
              { pain: "Chasing leads that go cold because you were busy", time: "2h/day" },
              { pain: "Tracking invoices on spreadsheets at 2am", time: "4h/week" },
              { pain: "Screening CVs when you should be closing deals", time: "6h/week" },
              { pain: "Rescheduling no-shows and chasing confirmations", time: "5h/week" },
            ].map((item, i) => (
              <StaggerItem key={item.pain}>
                <motion.div
                  className="rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06] hover:ring-rose-500/20 p-6 h-full transition-colors duration-500"
                  whileHover={{ y: -3 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-mono text-rose-400/60 font-bold">0{i + 1}</span>
                    <span className="text-[11px] font-mono text-rose-400 bg-rose-500/10 rounded-full px-2.5 py-0.5 ring-1 ring-rose-500/20">{item.time}</span>
                  </div>
                  <p className="text-white/80 text-[15px] font-semibold leading-snug">{item.pain}</p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* ═══ AGENTS — Bento grid ═══ */}
      <section className="px-6 py-24 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-emerald-500/[0.03] rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-[1400px] mx-auto">
          <FadeUp>
            <div className="max-w-2xl mb-14">
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 mb-8">
                Your AI team
              </span>
              <h2 className="text-3xl md:text-[2.75rem] font-extrabold tracking-[-0.03em] leading-[1.1]">
                6 AI employees.
                <br />
                <span className="text-white/30">Each one has a name.</span>
              </h2>
              <p className="mt-6 text-white/40 text-[15px] leading-relaxed max-w-[50ch]">
                Not bots with scripts. Personalities with backstories, expertise, and memory that spans months. They work together, share intelligence, and get better without you touching anything.
              </p>
            </div>
          </FadeUp>

          <StaggerList className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
            {agents.map((agent, i) => {
              const c = colorMap[agent.color];
              return (
                <StaggerItem key={agent.name}>
                  <GlowCard
                    glowColor={c.glow}
                    className={cn(
                      "rounded-2xl p-7 bg-white/[0.02] ring-1 ring-white/[0.06] transition-all duration-500 h-full",
                      c.ring
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", c.bg, c.text)}>
                        {agent.icon}
                      </div>
                      <div>
                        <h3 className="text-[15px] font-bold text-white">{agent.name}</h3>
                        <p className="mt-2 text-sm text-white/40 leading-relaxed max-w-[50ch]">{agent.desc}</p>
                      </div>
                    </div>
                  </GlowCard>
                </StaggerItem>
              );
            })}
          </StaggerList>

          <FadeUp>
            <div className="mt-12">
              <a href="https://wa.me/12058582516?text=Hi" target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-3 rounded-full bg-white/[0.04] hover:bg-white/[0.06] ring-1 ring-white/[0.08] px-7 py-3.5 text-sm font-semibold text-white/70 transition-all duration-500 active:scale-[0.97]">
                Try them all — live demo
                <svg className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </a>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ═══ THE INTELLIGENCE ENGINE ═══ */}
      <section id="intelligence" className="px-6 py-24 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-[1400px] mx-auto relative z-10">
          <FadeUp>
            <div className="max-w-2xl mb-14">
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 mb-8">
                The Intelligence Engine
              </span>
              <h2 className="text-3xl md:text-[2.75rem] font-extrabold tracking-[-0.03em] leading-[1.1]">
                Gets smarter
                <br />
                <span className="text-white/30">every single night.</span>
              </h2>
              <p className="mt-6 text-white/40 text-[15px] leading-relaxed max-w-[50ch]">
                Most AI stays static after deployment. Ours analyzes its own performance, writes new rules, and proactively reaches out to customers — without you lifting a finger.
              </p>
            </div>
          </FadeUp>

          <StaggerList className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StaggerItem>
              <GlowCard
                glowColor={colorMap.emerald.glow}
                className={cn(
                  "rounded-2xl p-7 bg-white/[0.02] ring-1 ring-white/[0.06] transition-all duration-500 h-full",
                  colorMap.emerald.ring
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", colorMap.emerald.bg, colorMap.emerald.text)}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white">Self-Improving AI</h3>
                    <p className="mt-2 text-sm text-white/40 leading-relaxed max-w-[50ch]">Your agent analyzes every conversation overnight. What converted? Where did customers drop off? It writes new behavioral rules and applies them to its own prompt. By morning, it&apos;s measurably better than yesterday.</p>
                  </div>
                </div>
              </GlowCard>
            </StaggerItem>

            <StaggerItem>
              <GlowCard
                glowColor={colorMap.amber.glow}
                className={cn(
                  "rounded-2xl p-7 bg-white/[0.02] ring-1 ring-white/[0.06] transition-all duration-500 h-full",
                  colorMap.amber.ring
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", colorMap.amber.bg, colorMap.amber.text)}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white">Proactive Follow-ups</h3>
                    <p className="mt-2 text-sm text-white/40 leading-relaxed max-w-[50ch]">Reservation reminders before the visit. Feedback requests after. Re-engagement offers when a customer hasn&apos;t been back in 14 days. All automatic, all via WhatsApp templates approved by Meta.</p>
                  </div>
                </div>
              </GlowCard>
            </StaggerItem>

            <StaggerItem>
              <GlowCard
                glowColor={colorMap.sky.glow}
                className={cn(
                  "rounded-2xl p-7 bg-white/[0.02] ring-1 ring-white/[0.06] transition-all duration-500 h-full",
                  colorMap.sky.ring
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", colorMap.sky.bg, colorMap.sky.text)}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white">Weekly Intelligence Reports</h3>
                    <p className="mt-2 text-sm text-white/40 leading-relaxed max-w-[50ch]">Every Sunday, the owner gets a WhatsApp brief: bookings, trends, occasions, dietary patterns, drop-off rates, and AI-generated recommendations. Data that tells you what to do, not just what happened.</p>
                  </div>
                </div>
              </GlowCard>
            </StaggerItem>

            <StaggerItem>
              <GlowCard
                glowColor={colorMap.violet.glow}
                className={cn(
                  "rounded-2xl p-7 bg-white/[0.02] ring-1 ring-white/[0.06] transition-all duration-500 h-full",
                  colorMap.violet.ring
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", colorMap.violet.bg, colorMap.violet.text)}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white">WhatsApp Onboarding</h3>
                    <p className="mt-2 text-sm text-white/40 leading-relaxed max-w-[50ch]">No website needed. Text our setup number on WhatsApp, answer 5 questions in 2 minutes, and your AI agent is live. Works in Arabic and English.</p>
                  </div>
                </div>
              </GlowCard>
            </StaggerItem>
          </StaggerList>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" className="px-6 py-24 relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-amber-500/[0.03] rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-16 items-start">
            <FadeUp>
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 mb-8">
                How it works
              </span>
              <h2 className="text-3xl md:text-[2.75rem] font-extrabold tracking-[-0.03em] leading-[1.1]">
                Live in 10 minutes.
                <br />
                <span className="text-white/30">Not 10 weeks.</span>
              </h2>
              <p className="mt-6 text-white/40 text-[15px] leading-relaxed max-w-[48ch]">
                No developers. No technical setup. Our AI builds your knowledge base from your website automatically.
              </p>

              <div className="mt-12 space-y-4">
                {[
                  { num: "1", title: "We learn your business", desc: "We scan your website, interview you about your vibe, and study your industry. In 30 minutes we know your business better than a new hire would in a month." },
                  { num: "2", title: "We create your AI team", desc: "Each agent gets a unique persona — a name, a backstory, a personality, even a profile photo. Your WhatsApp agent isn't a bot. It's someone your customers will remember." },
                  { num: "3", title: "Connect and go live", desc: "WhatsApp connected, agents activated, knowledge loaded. Your AI team starts working. You get a morning brief. Take a photo of today's special — it's on Instagram in minutes." },
                ].map((step) => (
                  <motion.div
                    key={step.num}
                    className="flex gap-5 p-5 rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06] hover:ring-emerald-500/20 transition-all duration-500"
                    whileHover={{ x: 6 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  >
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-sm font-bold font-mono">
                      {step.num}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-white">{step.title}</h3>
                      <p className="text-sm text-white/40 mt-1.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </FadeUp>

            <FadeUp delay={0.2} className="hidden lg:block">
              <div className="sticky top-28">
                {/* WhatsApp-style morning brief */}
                <div className="rounded-2xl bg-zinc-900 ring-1 ring-white/[0.06] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
                  {/* WhatsApp header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-emerald-600/10 border-b border-white/[0.06]">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-white">Owner Brain</p>
                      <p className="text-[10px] text-white/40">Your AI Chief of Staff</p>
                    </div>
                    <p className="text-[10px] text-white/20 ml-auto font-mono">9:00 AM</p>
                  </div>

                  {/* Morning brief message */}
                  <div className="p-4">
                    <div className="bg-white/[0.04] ring-1 ring-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-4 text-[12px] leading-[1.7] text-white/60 space-y-4">
                      <p className="text-white/80 font-semibold">Good morning, Khalid.</p>

                      <div>
                        <p className="text-[10px] text-amber-400 uppercase tracking-wider font-bold mb-1.5">Yesterday</p>
                        <div className="space-y-1 font-mono text-[11px]">
                          <p><span className="text-white/80">38</span> inquiries handled across WhatsApp</p>
                          <p><span className="text-emerald-400 font-semibold">6 tables booked</span> — AED 12,740 covers</p>
                          <p><span className="text-white/80">1</span> complaint escalated, resolved in 4 min</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] text-rose-400 uppercase tracking-wider font-bold mb-1.5">Returning VIPs tonight</p>
                        <div className="space-y-2 text-[11px]">
                          <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                            <p className="text-white/80 font-semibold">Layla K. — party of 6</p>
                            <p className="font-mono text-[10px]">Terrace, 8:30 PM. Nut allergy (daughter).</p>
                            <p className="font-mono text-[10px] text-amber-400">Visit #9 — prefers the tasting menu</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] text-sky-400 uppercase tracking-wider font-bold mb-1.5">Needs your attention</p>
                        <div className="space-y-1 text-[11px]">
                          <p>Wagyu delivery delayed — supplier ETA tomorrow</p>
                          <p>New Google review (3 stars) — <span className="text-emerald-400">AI drafted reply</span></p>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold mb-1.5">Today</p>
                        <div className="space-y-1 text-[11px]">
                          <p>14 reservations, 3 large parties (8+ guests)</p>
                          <p>Friday brunch promo sent to 247 regulars</p>
                          <p>Instagram reel going live at 7 PM</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/[0.04]">
                        <p className="text-[10px] text-white/30 italic">Reply with any command:</p>
                        <p className="text-[10px] text-white/40 font-mono mt-1">&quot;86 the wagyu until restock&quot;</p>
                        <p className="text-[10px] text-white/40 font-mono">&quot;Add special: Seafood tower AED 390&quot;</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ═══ INDUSTRIES ═══ */}
      <section className="px-6 py-24 relative overflow-hidden">
        <div className="absolute top-20 left-0 w-[250px] h-[250px] bg-emerald-500/[0.03] rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-[1400px] mx-auto">
          <FadeUp>
            <div className="max-w-2xl mb-14">
              <h2 className="text-3xl md:text-[2.75rem] font-extrabold tracking-[-0.03em] leading-[1.1]">
                Built for your industry.
              </h2>
              <p className="mt-6 text-white/40 text-[15px] leading-relaxed max-w-[48ch]">Pre-configured for the businesses that need it most.</p>
            </div>
          </FadeUp>

          <div className="space-y-4">
            {[
              {
                title: "Restaurants and Cafes",
                desc: "Table bookings with time and occasion. Menu knowledge with prices. Dietary tracking per guest. Owner takes a photo at the market — it becomes today's special across WhatsApp, Instagram, and the knowledge base.",
                features: ["Calendar booking", "Allergy memory per guest", "Photo-to-special pipeline"],
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
                  </svg>
                ),
              },
              {
                title: "Coffee and Retail",
                desc: "Bean subscriptions, order management, cupping session bookings. The AI knows each customer's roast preference and texts them when their favorite origin comes back in stock.",
                features: ["Subscription management", "Taste preference memory", "New arrival notifications"],
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                  </svg>
                ),
              },
              {
                title: "Spas, Salons, and Clinics",
                desc: "Appointment booking with preferred therapist. Treatment history and pressure preferences remembered. Follow-up the morning after: 'How are you feeling?' Seasonal packages suggested automatically.",
                features: ["Therapist preference memory", "Post-treatment follow-up", "Package upselling"],
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                ),
              },
            ].map((ind, i) => (
              <FadeUp key={ind.title} delay={i * 0.1}>
                <div className={cn(
                  "grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-0 rounded-2xl overflow-hidden ring-1 ring-white/[0.06] bg-white/[0.02]",
                  i % 2 === 1 ? "md:direction-rtl" : ""
                )}>
                  <div className={cn("p-8 flex flex-col justify-center", i % 2 === 1 ? "md:order-2" : "")}>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                      {ind.icon}
                    </div>
                    <h3 className="text-lg font-bold text-white">{ind.title}</h3>
                    <p className="mt-2 text-sm text-white/40 leading-relaxed max-w-[40ch]">{ind.desc}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {ind.features.map((f) => (
                        <span key={f} className="text-[11px] font-medium text-white/50 bg-white/[0.04] rounded-full px-3 py-1 ring-1 ring-white/[0.06]">{f}</span>
                      ))}
                    </div>
                  </div>
                  <div className={cn("p-8 bg-white/[0.01] flex items-center justify-center border-l border-white/[0.04]", i % 2 === 1 ? "md:order-1 md:border-l-0 md:border-r md:border-white/[0.04]" : "")}>
                    <a href="https://wa.me/12058582516?text=Hi" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                      See demo
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </a>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CUSTOMER MEMORY ═══ */}
      <section className="px-6 py-24 relative overflow-hidden">
        <div className="absolute top-10 right-10 w-[200px] h-[200px] bg-emerald-500/[0.04] rounded-full blur-[80px] pointer-events-none" />
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-16 items-center">
            <FadeUp>
              <div className="relative">
                <motion.div
                  className="rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06] p-6"
                  animate={{ y: [-3, 3, -3] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <p className="text-xs font-semibold text-white mb-3">Layla Khoury</p>
                  <div className="space-y-2.5">
                    {[
                      { label: "Preference", value: "Outdoor terrace, party of 4", color: "text-white/50" },
                      { label: "Allergy", value: "Nut allergy", color: "text-rose-400" },
                      { label: "Status", value: "VIP — 8 visits", color: "text-emerald-400" },
                      { label: "Last order", value: "Truffle pasta, sparkling water", color: "text-white/50" },
                      { label: "Sentiment", value: "Positive — last 3 visits", color: "text-sky-400" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                        <span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">{item.label}</span>
                        <span className={cn("text-xs font-mono", item.color)}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </FadeUp>

            <FadeUp delay={0.15}>
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 mb-8">
                Persistent memory
              </span>
              <h2 className="text-3xl md:text-[2.75rem] font-extrabold tracking-[-0.03em] leading-[1.1]">
                Your AI remembers
                <br />
                <span className="text-white/30">every customer.</span>
              </h2>
              <p className="mt-6 text-white/40 text-[15px] leading-relaxed max-w-[46ch]">
                A customer who texted in January gets greeted by name in December. Their preferences, allergies, favorite orders, booking history, and sentiment — all recalled instantly.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  "Names, phone numbers, and communication language",
                  "Dietary restrictions — tracked per guest, not just per booking",
                  "Favorite dishes, usual party size, preferred seating",
                  "Every past booking, complaint, and compliment",
                  "Sentiment tracking — knows if last visit was a bad experience",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-sm text-white/50">{item}</p>
                  </div>
                ))}
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section className="px-6 py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/[0.03] rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-[1400px] mx-auto">
          <FadeUp>
            <div className="max-w-2xl mb-14">
              <h2 className="text-3xl md:text-[2.75rem] font-extrabold tracking-[-0.03em] leading-[1.1]">
                Transparent pricing.
                <br />
                <span className="text-white/30">No surprises.</span>
              </h2>
              <p className="mt-6 text-white/40 text-[15px] leading-relaxed max-w-[48ch]">
                Less than the cost of one employee. More output than a team of six.
              </p>
            </div>
          </FadeUp>

          <StaggerList className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr_1fr] gap-4 max-w-5xl">
            {pricing.map((plan) => (
              <StaggerItem key={plan.tier}>
                <div className={cn(
                  "rounded-2xl p-8 h-full flex flex-col transition-all duration-500",
                  plan.popular
                    ? "bg-white/[0.04] ring-1 ring-emerald-500/30 shadow-[0_0_40px_-10px_rgba(16,185,129,0.15)] relative"
                    : "bg-white/[0.02] ring-1 ring-white/[0.06] hover:ring-white/[0.1]"
                )}>
                  {plan.popular && (
                    <span className="absolute -top-3 left-8 rounded-full bg-emerald-500 px-4 py-1 text-xs font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                      Most popular
                    </span>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/30">{plan.tier}</p>
                    <p className="text-[11px] mt-0.5 text-white/20">{plan.tagline}</p>
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-xs text-white/30">AED</span>
                      <span className="text-4xl font-extrabold tracking-tighter font-mono text-white">{plan.price}</span>
                      <span className="text-sm text-white/30">/mo</span>
                    </div>
                    <p className="text-[11px] mt-1 text-white/20">{plan.setup}</p>
                  </div>
                  <ul className="mt-8 space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-white/50">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="/book-audit/"
                    className={cn(
                      "mt-8 block text-center rounded-full px-6 py-3.5 text-sm font-semibold transition-all duration-300 active:scale-[0.97]",
                      plan.popular
                        ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                        : "bg-white/[0.04] text-white/60 ring-1 ring-white/[0.08] hover:bg-white/[0.06]"
                    )}
                  >
                    Get started
                  </a>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <ScaleIn>
            <div className="rounded-[2rem] bg-white/[0.02] ring-1 ring-white/[0.06] p-12 md:p-20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/[0.06] rounded-full blur-[100px] pointer-events-none" />
              <div className="relative z-10 max-w-xl">
                <h2 className="text-3xl md:text-[2.75rem] font-extrabold tracking-[-0.03em] leading-[1.1] text-white">
                  Ready to stop doing everything yourself?
                </h2>
                <p className="mt-6 text-white/40 text-[15px] leading-relaxed">
                  Sign up in 2 minutes. Your AI team starts today.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row gap-4">
                  <a href="https://agents.dcp.sa/signup" className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white px-8 py-4 text-sm font-semibold hover:bg-emerald-500 transition-all duration-300 active:scale-[0.97] shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    Start free
                  </a>
                  <a href="https://wa.me/12058582516?text=Hi" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-full px-8 py-4 text-sm font-semibold text-white/60 ring-1 ring-white/[0.08] hover:bg-white/[0.03] transition-all duration-300 active:scale-[0.97]">
                    Try the demo
                  </a>
                </div>
              </div>
            </div>
          </ScaleIn>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
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
          <div className="flex items-center gap-8 text-xs text-white/30 font-medium">
            <a href="/services/" className="hover:text-white/60 transition-colors">Services</a>
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

"use client";

import { cn } from "@/lib/utils";
import { FadeUp, StaggerList, StaggerItem, ScaleIn, GlowCard } from "@/components/motion";
import { motion } from "framer-motion";

const stats = [
  { value: "380", suffix: "/mo", label: "Inquiries handled with full memory", color: "text-brand-400" },
  { value: "24", suffix: "/7", label: "Arabic + English, never sleeps", color: "text-sky-400" },
  { value: "92", suffix: "%", label: "Lead qualification accuracy", color: "text-violet-400" },
  { value: "4", suffix: "hrs", label: "From signup to fully live", color: "text-amber-400" },
];

const agents = [
  {
    name: "Customer WhatsApp Agent + Persistent Memory",
    desc: "Handles every inbound inquiry in Arabic and English, 24/7. Remembers every customer permanently. When a buyer who inquired 3 months ago texts back asking 'What about that JBR apartment?', the AI greets them by name, recalls their budget (AED 2.5M), preferred areas (JBR, Marina), and the exact units they viewed. No conversation starts from zero.",
    dot: "bg-emerald-400",
    gradient: "from-emerald-500/20 to-emerald-500/5",
    glow: "rgba(34, 197, 94, 0.15)",
  },
  {
    name: "Owner Brain — Your AI Chief of Staff",
    desc: "A private WhatsApp channel just for the agency owner. Every morning at 7am: 'New hot lead: Sarah K., budget AED 3M+, looking for Palm penthouses — lead score 92/100.' Every night at 9pm: '47 inquiries handled, 3 viewings booked, 2 hot leads flagged.' Owner texts back 'Palm penthouse in Tower B sold' — the AI removes it from listings instantly. Texts 'Price drop: Marina 2BR now AED 1.6M' — updated across all channels in seconds.",
    dot: "bg-amber-400",
    gradient: "from-amber-500/20 to-amber-500/5",
    glow: "rgba(245, 158, 11, 0.15)",
  },
  {
    name: "Auto Knowledge Base — Crawled & Ready",
    desc: "During onboarding, our system automatically crawled the agency's entire website — every property listing, team bio, service page, and FAQ. The AI built its own knowledge base in minutes, not weeks. No manual data entry. No CSV uploads. It knew the difference between their off-plan projects in Dubai Hills and ready units in Marina before the first customer ever texted.",
    dot: "bg-rose-400",
    gradient: "from-rose-500/20 to-rose-500/5",
    glow: "rgba(244, 63, 94, 0.15)",
  },
];

export default function CaseStudyPage() {
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
            <a href="/services/" className="hover:text-white transition-colors duration-300">Services</a>
            <a href="/process/" className="hover:text-white transition-colors duration-300">Process</a>
            <a href="/case-study/" className="text-white transition-colors duration-300">Case study</a>
            <a href="https://project-agent-chi.vercel.app/login" className="hover:text-white transition-colors duration-300">Login</a>
            <a href="https://project-agent-chi.vercel.app/signup" className="group inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 ring-1 ring-white/20 px-5 py-2 text-[13px] font-semibold text-white transition-all duration-300 active:scale-[0.97]">
              Sign up
            </a>
            <a href="/book-audit/" className="group inline-flex items-center gap-2 rounded-full bg-brand-500 hover:bg-brand-400 px-5 py-2 text-[13px] font-semibold text-white transition-all duration-300 active:scale-[0.97]">
              Book free audit
              <svg className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 via-surface-950 to-surface-950" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-brand-500/10 to-transparent rounded-full blur-3xl" />

        <div className="relative max-w-[1400px] mx-auto z-10">
          <FadeUp>
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                Case study
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-[0.95]">
                How a Dubai agency went from signup to{" "}
                <span className="bg-gradient-to-r from-brand-400 via-emerald-300 to-brand-500 bg-clip-text text-transparent">
                  AI-powered in 4 hours
                </span>{" "}
                — and never lost a lead again
              </h1>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Real estate", "Dubai Marina", "2 WhatsApp channels", "Persistent memory", "Live in hours"].map((tag) => (
                  <span key={tag} className="inline-flex items-center text-xs font-medium text-white/40 bg-white/5 rounded-full px-3 py-1.5 ring-1 ring-white/10">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-20 relative z-10">
        <div className="max-w-[1400px] mx-auto">
          <StaggerList className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
              <StaggerItem key={s.label}>
                <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-6 text-center hover:bg-white/[0.05] transition-all duration-500">
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className={cn("text-3xl md:text-4xl font-extrabold tracking-tighter font-mono", s.color)}>{s.value}</span>
                    {s.suffix && <span className={cn("text-sm font-bold font-mono", s.color)}>{s.suffix}</span>}
                  </div>
                  <p className="text-[11px] text-white/30 mt-1.5 font-medium">{s.label}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 pb-28">
        {/* Challenge */}
        <FadeUp>
          <div className="mb-20">
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-white/5 text-white/40 ring-1 ring-white/10 mb-6">
              The challenge
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tighter mt-4 mb-5">
              400 WhatsApp messages a month. Zero memory. Zero system.
            </h2>
            <div className="space-y-4 text-sm text-white/50 leading-relaxed max-w-[65ch]">
              <p>
                A fast-growing real estate agency in Dubai Marina was drowning. <span className="font-semibold text-white">400+
                WhatsApp inquiries per month</span> from buyers, tenants, and investors — and every single conversation
                started from scratch. A buyer who called last month about a Palm Jumeirah penthouse?
                The agent had no idea. They asked the same qualifying questions again. The buyer went to a competitor
                who remembered them.
              </p>
              <p>
                The owner, Ahmed, was the worst bottleneck. He was the only one who knew which units were sold,
                which prices had changed, which leads were hot. His team would WhatsApp him <span className="font-semibold text-white">30+ times a day</span> asking
                &ldquo;Is the Marina 2BR still available?&rdquo; or &ldquo;What&apos;s the updated price for Tower C?&rdquo;
                He was spending his evenings manually updating spreadsheets instead of closing deals.
              </p>
              <p>
                Worst of all: he had <span className="font-semibold text-white">no visibility into his pipeline</span>. He didn&apos;t know how many
                inquiries came in today, which leads were serious, or which properties were getting attention. He was
                flying blind in the most competitive real estate market on earth.
              </p>
            </div>
          </div>
        </FadeUp>

        {/* Solution */}
        <FadeUp>
          <div className="mb-20">
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-white/5 text-white/40 ring-1 ring-white/10 mb-6">
              The solution
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tighter mt-4 mb-6">
              Signed up at 10am. Live by{" "}
              <span className="bg-gradient-to-r from-brand-400 to-sky-400 bg-clip-text text-transparent">2pm the same day</span>
            </h2>
            <div className="space-y-4 text-sm text-white/50 leading-relaxed max-w-[65ch] mb-8">
              <p>
                Ahmed found AI Agent Systems on a Tuesday morning. He filled out the onboarding wizard — selected
                &ldquo;Real Estate&rdquo; as his industry, connected his WhatsApp Business number, and entered his website URL.
                That was it. <span className="font-semibold text-white">No sales calls. No 3-week implementation. No technical setup.</span>
              </p>
              <p>
                Our system crawled his entire website automatically — 127 property listings, team bios, service descriptions,
                area guides — and built a complete knowledge base. Two WhatsApp channels were provisioned: one for customers,
                one private channel just for Ahmed. By 2pm, the first customer inquiry was handled by AI. Ahmed watched it happen
                from his phone and said: <span className="font-semibold text-white">&ldquo;It sounds exactly like my best agent.&rdquo;</span>
              </p>
            </div>
            <div className="space-y-4">
              {agents.map((agent) => (
                <motion.div
                  key={agent.name}
                  className={cn(
                    "rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-6 transition-all duration-500",
                    "hover:bg-white/[0.05] hover:ring-white/[0.1]"
                  )}
                  whileHover={{ x: 6 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className={cn("w-2.5 h-2.5 rounded-full", agent.dot)} />
                    <h3 className="text-sm font-bold">{agent.name}</h3>
                  </div>
                  <p className="text-sm text-white/50 leading-relaxed">{agent.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeUp>

        {/* Testimonial */}
        <FadeUp>
          <div className="mb-20">
            <div className="relative rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-surface-900 to-violet-500/5" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.06] rounded-3xl" />

              <div className="relative p-10 md:p-12">
                <motion.div
                  className="absolute top-0 right-0 w-48 h-48 rounded-full"
                  style={{ background: "radial-gradient(circle, rgba(34, 197, 94, 0.1) 0%, transparent 70%)" }}
                  animate={{ x: [0, 15, 0], y: [0, -8, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="relative">
                  <blockquote className="text-xl md:text-2xl font-extrabold tracking-tighter leading-snug">
                    &ldquo;Last week a client texted us about a Palm Jumeirah villa she&apos;d
                    asked about 3 months ago. The AI greeted her by name, remembered her
                    budget, her preference for sea view, even that she has two kids and
                    wanted to be near a school. She was blown away. She thought she was
                    talking to our best agent.{" "}
                    <span className="bg-gradient-to-r from-brand-400 to-emerald-300 bg-clip-text text-transparent">
                      That deal closed for AED 4.2M. The AI remembered what my team forgot.
                    </span>&rdquo;
                  </blockquote>
                  <p className="mt-5 text-sm text-white/40 leading-relaxed">
                    &ldquo;And every morning at 7am I get a WhatsApp message from my Owner Brain:
                    who&apos;s hot, who&apos;s cold, what needs attention. Last night at 9pm it told me:
                    &lsquo;47 inquiries handled, 3 viewings booked, 2 hot leads scored above 90.&rsquo;
                    I texted back &lsquo;Marina 2BR Tower C — price drop to AED 1.6M&rsquo; and it updated
                    everywhere in seconds. I run my entire agency from WhatsApp now.&rdquo;
                  </p>
                  <div className="mt-8 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-500/5 flex items-center justify-center ring-1 ring-brand-500/20">
                      <span className="text-sm font-bold text-brand-400">AH</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/90">Ahmed H. — Agency Owner</p>
                      <p className="text-xs text-white/40">Real estate brokerage — Dubai Marina, 5 agents</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* CTA */}
        <ScaleIn>
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 via-surface-900 to-sky-500/10" />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.06] rounded-3xl" />

            <div className="relative p-12 text-center">
              <motion.div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(34, 197, 94, 0.12) 0%, transparent 70%)" }}
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="relative">
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tighter">Your competitors are still answering WhatsApp manually</h2>
                <p className="mt-3 text-sm text-white/40 max-w-md mx-auto">
                  Sign up today and be live by tonight. Self-service onboarding. No sales calls.
                  Your AI agent will remember every customer, qualify every lead, and report to you on WhatsApp — while you sleep.
                </p>
                <a href="/book-audit/" className="group inline-flex items-center gap-3 mt-6 rounded-full bg-brand-500 hover:bg-brand-400 px-8 py-4 text-sm font-semibold text-white transition-all duration-500 active:scale-[0.97] shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:shadow-[0_0_50px_rgba(34,197,94,0.4)]">
                  Book your free audit
                  <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-500 group-hover:translate-x-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </span>
                </a>
                <p className="mt-4 text-xs text-white/25">
                  Live in hours &middot; Cancel anytime &middot; Your AI remembers every customer
                </p>
              </div>
            </div>
          </div>
        </ScaleIn>
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
            <a href="/services/" className="hover:text-white/60 transition-colors duration-300">Services</a>
            <a href="/process/" className="hover:text-white/60 transition-colors duration-300">Process</a>
            <a href="/case-study/" className="text-white/60">Case study</a>
            <a href="https://project-agent-chi.vercel.app/login" className="hover:text-white/60 transition-colors duration-300">Login</a>
            <a href="https://project-agent-chi.vercel.app/signup" className="hover:text-white/60 transition-colors duration-300">Sign up</a>
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

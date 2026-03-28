"use client";

import { cn } from "@/lib/utils";
import { FadeUp, StaggerList, StaggerItem, ScaleIn } from "@/components/motion";
import { AgentPipeline } from "@/components/agent-pipeline";
import { motion } from "framer-motion";

const steps = [
  {
    step: "01",
    title: "Sign up and tell us about your business",
    duration: "5 minutes",
    description: "Enter your company profile and drop in your website URL. Our AI instantly crawls your entire site and auto-builds your FAQ, services list, team directory, social profiles, and review sources. No forms to fill. No PDFs to upload. No manual data entry. Your knowledge base writes itself — ready for your AI agents to use from minute one.",
    details: ["Company profile setup", "Auto website crawl", "AI-generated knowledge base"],
    color: "text-brand-400",
    border: "border-brand-500/20",
    gradient: "from-brand-500/10 to-transparent",
    glow: "rgba(34, 197, 94, 0.15)",
  },
  {
    step: "02",
    title: "Pick your agents and configure your industry",
    duration: "5 minutes",
    description: "Select the AI agents you need — receptionist, sales closer, booking manager, support. Then configure your industry-specific setup: restaurants get SevenRooms integration with menu management and dietary tracking down to individual guests. Real estate gets property search, viewing bookings, and automatic lead scoring. Healthcare and beauty get appointment booking with service pricing. Every agent is powered by MiniMax M2.7 and pre-trained for your vertical.",
    details: ["Agent selection", "Industry-specific setup", "MiniMax M2.7 AI engine"],
    color: "text-sky-400",
    border: "border-sky-500/20",
    gradient: "from-sky-500/10 to-transparent",
    glow: "rgba(14, 165, 233, 0.15)",
  },
  {
    step: "03",
    title: "Connect WhatsApp and go live",
    duration: "Instant",
    description: "Instant WhatsApp Business API setup — two channels deploy automatically. A customer-facing number handles inquiries, bookings, and support 24/7 with bilingual Arabic + English auto-detection and voice message support. A private Owner Brain channel pushes daily 9AM briefs, hot lead alerts, complaint escalations, and booking notifications. Text it back with natural language commands — \"Add today's special: Wagyu AED 280\" or \"86 the lamb\" — and your knowledge base updates instantly.",
    details: ["Instant WhatsApp setup", "Owner Brain with 9AM daily briefs", "Voice message support"],
    color: "text-violet-400",
    border: "border-violet-500/20",
    gradient: "from-violet-500/10 to-transparent",
    glow: "rgba(139, 92, 246, 0.15)",
  },
  {
    step: "04",
    title: "Your agents learn and remember everything",
    duration: "From day one",
    description: "MiniMax M2.7 auto-improves with every conversation. Every customer interaction builds persistent memory — name, allergies, dietary restrictions (and who in the family has them), favorite dishes, usual party size, preferred seating, visit timing, booking history, and sentiment tracking. A guest who had a bad experience last time gets extra care. A returning customer in December is greeted by name with preferences from January. Voice messages are transcribed and remembered. Live web search enriches every response with weather, events, and local context.",
    details: ["MiniMax M2.7 auto-improve", "Deep customer memory profiles", "Live web search enrichment"],
    color: "text-amber-400",
    border: "border-amber-500/20",
    gradient: "from-amber-500/10 to-transparent",
    glow: "rgba(245, 158, 11, 0.15)",
  },
  {
    step: "05",
    title: "Monitor, manage, and scale from your dashboard",
    duration: "Ongoing",
    description: "Your live dashboard shows every agent's status, activity feeds, conversation logs, and performance reports in real-time. Manage WhatsApp channels, review escalations, and track ROI. Use multimodal AI capabilities — generate images for social posts, create HD voiceovers for TikTok, produce background music for content, and build promotional video clips. Connect Google Calendar, Outlook, or SevenRooms to keep bookings in sync. Scale to new locations in minutes.",
    details: ["Live agent dashboard", "Multimodal AI: image, video, music, voice", "One-click multi-location scaling"],
    color: "text-emerald-400",
    border: "border-emerald-500/20",
    gradient: "from-emerald-500/10 to-transparent",
    glow: "rgba(34, 197, 94, 0.15)",
  },
];

export default function ProcessPage() {
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
            <a href="/process/" className="text-white transition-colors duration-300">Process</a>
            <a href="/case-study/" className="hover:text-white transition-colors duration-300">Case study</a>
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

      {/* Header */}
      <section className="pt-32 pb-16 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 via-surface-950 to-surface-950" />
        <div className="max-w-[1400px] mx-auto relative z-10">
          <FadeUp>
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                Our process
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-none mt-4">
                Onboard yourself.
                <br />
                <span className="bg-gradient-to-r from-brand-400 via-sky-400 to-violet-400 bg-clip-text text-transparent">
                  Go live in minutes.
                </span>
              </h1>
              <p className="mt-4 text-base text-white/50 leading-relaxed max-w-[52ch]">
                Self-service onboarding. AI crawls your website and builds your knowledge base. MiniMax M2.7 powers every conversation and auto-improves daily. Live in minutes, not weeks.
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Timeline + Agent Pipeline */}
      <main className="max-w-[1400px] mx-auto px-6 pb-28 relative">
        <div className="flex gap-8 lg:gap-12">
          {/* Left: Process steps */}
          <div className="flex-1 max-w-3xl min-w-0">
            <StaggerList className="space-y-5">
              {steps.map((s) => (
                <StaggerItem key={s.step}>
                  <motion.div
                    className={cn(
                      "rounded-3xl bg-white/[0.03] ring-1 ring-white/[0.06] p-8 transition-all duration-500",
                      "hover:bg-white/[0.05] hover:ring-white/[0.1]"
                    )}
                    whileHover={{ x: 6 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  >
                    <div className="flex gap-6">
                      <div className={cn(
                        "flex-shrink-0 w-12 h-12 rounded-xl bg-surface-950 border flex items-center justify-center text-sm font-bold font-mono transition-all duration-500",
                        s.border, s.color
                      )}>
                        {s.step}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h2 className="text-lg font-extrabold tracking-tight">{s.title}</h2>
                          <span className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.15em] bg-white/5 rounded-full px-2.5 py-0.5 ring-1 ring-white/10">{s.duration}</span>
                        </div>
                        <p className="text-sm text-white/50 leading-relaxed max-w-[65ch]">{s.description}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {s.details.map((d) => (
                            <span key={d} className="inline-flex items-center gap-1.5 text-xs font-medium text-white/50 bg-white/5 rounded-full px-3 py-1.5 ring-1 ring-white/10">
                              <svg className={cn("w-3 h-3", s.color)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerList>
          </div>

          {/* Right: Sticky agent pipeline illustration */}
          <div className="hidden lg:block w-[420px] flex-shrink-0">
            <div className="sticky top-28">
              <AgentPipeline />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-3xl mt-16">
          <ScaleIn>
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
                <div className="relative">
                  <h2 className="text-2xl md:text-3xl font-extrabold tracking-tighter">Your AI team is ready. Are you?</h2>
                  <p className="mt-3 text-sm text-white/40 leading-relaxed max-w-md">
                    No demos. No sales calls. Sign up, paste your website, and your AI agents go live in minutes — with voice support, customer memory, and an AI Chief of Staff on WhatsApp.
                  </p>
                  <a href="/book-audit/" className="group inline-flex items-center gap-3 mt-6 rounded-full bg-brand-500 hover:bg-brand-400 px-8 py-4 text-sm font-semibold text-white transition-all duration-500 active:scale-[0.97] shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:shadow-[0_0_50px_rgba(34,197,94,0.4)]">
                    Start onboarding now
                    <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-500 group-hover:translate-x-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </ScaleIn>
        </div>
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
            <a href="/process/" className="text-white/60">Process</a>
            <a href="/case-study/" className="hover:text-white/60 transition-colors duration-300">Case study</a>
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

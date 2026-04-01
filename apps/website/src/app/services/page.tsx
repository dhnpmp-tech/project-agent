"use client";

import { cn } from "@/lib/utils";
import { FadeUp, StaggerList, StaggerItem, GlowCard } from "@/components/motion";
import { IntegrationLogos } from "@/components/illustrations";
import { motion } from "framer-motion";

const agents = [
  {
    name: "WhatsApp Intelligence Agent",
    tagline: "A real personality that remembers everything. Not a chatbot.",
    description:
      "Every business gets a custom AI persona — a character with a full backstory, personality, and voice. She never breaks character. Never says she's an AI. She texts like a real person: 2-3 short messages with natural timing, not a wall of text. Powered by MiniMax M2.7 that auto-improves with every conversation. Every customer gets persistent memory across conversations: name, allergies, dietary restrictions (and WHO has them — 'wife is gluten-free'), favorite dishes, usual party size, preferred seating, visit timing, booking history, and sentiment tracking. A guest who messaged in January is greeted by name in December. Birthday? She gets genuinely excited. Bad experience last time? Extra care this time. The persona produces behavior you never programmed — because she's a person, not a script.",
    benefits: [
      "Custom AI persona with unique backstory, personality, and voice",
      "Multi-message replies — texts like a real person, not a bot",
      "40+ facts remembered per customer, forever",
      "Never breaks character — your customers think she's real",
      "Emergent emotional intelligence: birthdays, bad days, celebrations",
      "Voice message support: customers send voice notes, AI responds",
      "2 WhatsApp channels: customer-facing + owner private",
      "Bilingual Arabic + English auto-detection",
    ],
    metric: "65-80%",
    metricLabel: "support load cut",
    gradient: "from-emerald-500/5 to-emerald-500/[0.02]",
    glow: "rgba(34, 197, 94, 0.08)",
    dot: "bg-emerald-500",
    textAccent: "text-emerald-400",
    check: "text-emerald-500",
  },
  {
    name: "Owner Brain Agent",
    tagline: "Your AI Chief of Staff — on WhatsApp",
    description:
      "Every plan includes a private WhatsApp channel just for you, the owner. Your Owner Brain Agent is a proactive AI Chief of Staff that pushes daily 9AM briefs with yesterday's metrics, booking notifications, complaint escalations, and hot lead alerts directly to your phone. But it is not just one-way — text natural language commands: \"Add today's special: Wagyu AED 280\" and your knowledge base updates instantly. \"86 the lamb\" — removed from the menu. \"Price drop: Marina 2BR now AED 1.6M\" — updated across all channels in seconds. No dashboards, no logins. Run your business from your pocket.",
    benefits: [
      "Private owner WhatsApp channel included in every plan",
      "Daily 9AM briefs with yesterday's metrics and insights",
      "Natural language commands: update menus, prices, availability",
      "Hot lead alerts with full context and lead score",
      "Complaint escalations pushed in real time",
      "AI interprets intent and updates knowledge base instantly",
      "No app to install, no dashboard to check",
      "Proactive alerts — the AI comes to you, not the other way",
    ],
    metric: "0",
    metricLabel: "dashboards needed",
    gradient: "from-emerald-500/5 to-emerald-500/[0.02]",
    glow: "rgba(34, 197, 94, 0.1)",
    dot: "bg-emerald-500",
    textAccent: "text-emerald-400",
    check: "text-emerald-500",
  },
  {
    name: "Industry-Specific AI Setup",
    tagline: "Pre-built for restaurants, real estate, clinics, and salons",
    description:
      "Not a generic chatbot — your agent is configured for your exact industry from day one. Sign up, paste your website URL, and AI crawls everything to auto-build your knowledge base — FAQ, services, team bios, social links. Pick your agents, choose your industry, and go live in minutes. Restaurants get SevenRooms integration, menu management, and dietary tracking down to who in the party has allergies. Real estate gets property search, viewing bookings, and automatic lead scoring. Healthcare and beauty get appointment booking with full calendar sync.",
    benefits: [
      "Self-service onboarding: sign up, AI crawls, go live",
      "Restaurant: SevenRooms, menu, dietary tracking per guest",
      "Real Estate: property search, viewings, lead scoring",
      "Healthcare/Beauty: appointments, pricing, calendar sync",
      "Go live in minutes, not weeks",
      "Industry-specific conversation flows pre-loaded",
      "Auto Knowledge Base built from your website instantly",
      "Calendar integration: Google, Outlook, CalDAV, SevenRooms",
    ],
    metric: "<10 min",
    metricLabel: "to go live",
    gradient: "from-amber-500/5 to-amber-500/[0.02]",
    glow: "rgba(245, 158, 11, 0.08)",
    dot: "bg-amber-500",
    textAccent: "text-amber-400",
    check: "text-amber-500",
  },
  {
    name: "AI Sales Development Rep",
    tagline: "Never miss a lead — every one remembered and scored",
    description:
      "Autonomously manages your entire top-of-funnel with persistent memory that tracks every lead interaction across months and years. Powered by MiniMax M2.7 that auto-improves with every conversation — it never forgets a prospect. Scores leads against your ICP, sends personalized multi-channel outreach via WhatsApp and email, qualifies through adaptive conversation that recalls prior exchanges, and books meetings with your sales team. Hot leads trigger instant Owner Brain alerts so you can act in seconds. Voice message support means leads can speak naturally and get intelligent responses.",
    benefits: [
      "MiniMax M2.7 — gets smarter with every lead conversation",
      "Persistent lead memory across months and years",
      "Hot lead alerts pushed to your Owner WhatsApp channel",
      "Voice message support for natural lead qualification",
      "500-5,000 leads processed monthly",
      "ICP scoring and adaptive lead qualification",
      "70-80% lower cost vs human SDR",
      "Lead history and sentiment tracked over months",
    ],
    metric: "70-80%",
    metricLabel: "lower cost per meeting",
    gradient: "from-orange-500/5 to-orange-500/[0.02]",
    glow: "rgba(249, 115, 22, 0.08)",
    dot: "bg-orange-500",
    textAccent: "text-orange-400",
    check: "text-orange-500",
  },
  {
    name: "Content Engine Agent",
    tagline: "Social media on autopilot — with AI image, video, and music",
    description:
      "Runs your entire organic content operation, powered by your Auto Knowledge Base and real-time business updates. When you text your Owner Brain \"Add today's special: Truffle pasta AED 65\", the Content Engine turns that into an Instagram post with AI-generated images, a TikTok video with HD voiceover and generated background music, and a LinkedIn update — automatically. Text-to-speech HD for voice messages and TikTok voiceovers. Video generation for promotional clips. Your brand voice stays consistent because the AI knows your business inside out.",
    benefits: [
      "AI-generated images for social media content",
      "Text-to-speech HD for voiceovers and voice messages",
      "Music generation for content background tracks",
      "Video generation for promotional clips",
      "7+ posts per week across platforms",
      "Arabic and English bilingual content",
      "Content generated from live business updates",
      "From 30+ min to under 2 min per post",
    ],
    metric: "<2 min",
    metricLabel: "per post",
    gradient: "from-rose-500/5 to-rose-500/[0.02]",
    glow: "rgba(244, 63, 94, 0.08)",
    dot: "bg-rose-500",
    textAccent: "text-rose-400",
    check: "text-rose-500",
  },
  {
    name: "HR Screening and Scheduling",
    tagline: "Hire faster — interviews booked into your calendar automatically",
    description:
      "Ingests CVs, scores candidates against your criteria, sends personalized advancement or rejection messages in bilingual Arabic and English with auto-detection. Books interviews directly into hiring manager calendars via Google Calendar, Outlook, or CalDAV. Top-candidate alerts go straight to your Owner Brain channel. Every candidate interaction is remembered with persistent memory — re-applicants are recognized and their full history is surfaced instantly. Voice message support lets candidates respond naturally.",
    benefits: [
      "10-15 hours saved per hiring cycle",
      "Calendar sync: Google, Outlook, CalDAV",
      "Persistent candidate memory across applications",
      "Consistent, fair candidate scoring",
      "Personalized bilingual communication",
      "Automated interview scheduling",
      "Owner Brain alerts for top candidates",
      "Full audit trail for compliance",
    ],
    metric: "10-15h",
    metricLabel: "saved per cycle",
    gradient: "from-sky-500/5 to-sky-500/[0.02]",
    glow: "rgba(14, 165, 233, 0.08)",
    dot: "bg-sky-500",
    textAccent: "text-sky-400",
    check: "text-sky-500",
  },
  {
    name: "Financial Intelligence Agent",
    tagline: "Weekly reports pushed to your WhatsApp — not buried in a dashboard",
    description:
      "Connects to your financial data, categorizes transactions, detects anomalies, and delivers weekly financial health reports in plain language — directly to your Owner Brain WhatsApp channel. Unusual spend? You get an alert. Cash flow running thin? You know before it is a crisis. Text back natural language questions like \"What did we spend on marketing last month?\" and get instant answers powered by MiniMax M2.7. No spreadsheets, no logins, no dashboards.",
    benefits: [
      "Reports delivered to your Owner WhatsApp channel",
      "12 hours per month returned to you",
      "Anomaly alerts pushed in real time",
      "Automated transaction categorization",
      "Cash flow forecasting with plain-language summaries",
      "Text-back queries for instant financial answers",
      "Weekly and monthly trend reports",
      "Zero spreadsheets or dashboards required",
    ],
    metric: "12h/mo",
    metricLabel: "time returned",
    gradient: "from-violet-500/5 to-violet-500/[0.02]",
    glow: "rgba(139, 92, 246, 0.08)",
    dot: "bg-violet-500",
    textAccent: "text-violet-400",
    check: "text-violet-500",
  },
];

export default function ServicesPage() {
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
            <a href="/services/" className="text-white transition-colors duration-300">Services</a>
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
                Our services
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-none mt-4 text-white">
                7 AI agents,
                <br />
                <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 bg-clip-text text-transparent">
                  persistent memory,
                </span>
                <br />
                your own AI Chief of Staff
              </h1>
              <p className="mt-4 text-base text-white/40 leading-relaxed max-w-[52ch]">
                This is not a concept — it is live. Real WhatsApp messages, real AI responses, sub-second. Voice notes transcribed and answered. Customer memory that spans years. An AI Chief of Staff that takes commands in plain English. Self-service onboarding, go live in minutes.
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Agents */}
      <main className="max-w-[1400px] mx-auto px-6 pb-28 relative">
        <StaggerList className="space-y-5">
          {agents.map((agent) => (
            <StaggerItem key={agent.name}>
              <GlowCard
                glowColor={agent.glow}
                className={cn(
                  "grid grid-cols-1 md:grid-cols-12 gap-px items-stretch rounded-[1.5rem] overflow-hidden",
                  "bg-white/[0.03] ring-1 ring-white/[0.06]",
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
                <div className="md:col-span-9 p-8 bg-white/[0.03]">
                  <h2 className="text-xl font-extrabold tracking-tight text-white">{agent.name}</h2>
                  <p className="mt-3 text-sm text-white/40 leading-relaxed max-w-[65ch]">{agent.description}</p>
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {agent.benefits.map((b) => (
                      <div key={b} className="flex gap-2.5 text-sm text-white/50">
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

        {/* Integrations + Social proof */}
        <FadeUp className="mt-16">
          <div className="rounded-3xl bg-white/[0.03] ring-1 ring-white/[0.06] p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/40 mb-4">Connects with your tools</p>
                <IntegrationLogos />
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="flex items-center gap-0.5 justify-end mb-1">
                  {[1,2,3,4,5].map((star) => (
                    <svg key={star} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-xs text-white/40">&ldquo;I got my weekends back.&rdquo;</p>
                <p className="text-[10px] text-white/40 mt-0.5">— Agency owner, Dubai</p>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* CTA */}
        <FadeUp className="mt-8">
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
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tighter text-white">Not sure which agents you need?</h2>
                <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                  Book a free 30-minute audit. We map your operations, configure your industry-specific agents, and get your Owner Brain channel live — complete with voice message support, customer memory, live web search, and multimodal AI. Run your business from WhatsApp.
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

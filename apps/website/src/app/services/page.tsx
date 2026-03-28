"use client";

import { cn } from "@/lib/utils";
import { FadeUp, StaggerList, StaggerItem, GlowCard } from "@/components/motion";
import { IntegrationLogos } from "@/components/illustrations";
import { motion } from "framer-motion";

const agents = [
  {
    name: "WhatsApp Intelligence Agent",
    tagline: "Two channels. Persistent memory. Every customer remembered.",
    description:
      "Deploys two WhatsApp channels for your business in minutes via Kapso — a customer-facing channel that handles inquiries, bookings, and complaints 24/7 in Arabic and English, plus a private Owner channel for real-time alerts. Every customer gets persistent memory: preferences, past orders, sentiment, and key events are tracked across months and years. A guest who messaged in January is greeted by name in December. Auto Knowledge Base crawls your website and builds your FAQ, services, team bios, and social links automatically — zero manual data entry.",
    benefits: [
      "Persistent customer memory across months and years",
      "2 WhatsApp channels: customer-facing + owner private",
      "Auto Knowledge Base built from your website",
      "AI voice calls with real-time speech",
      "400+ inquiries handled monthly, sub-second response",
      "Calendar sync: Google, Outlook, CalDAV, SevenRooms",
      "24/7 bilingual support in Arabic and English",
      "Smart escalation to human agents with full context",
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
    name: "Owner Brain Agent",
    tagline: "Your AI Chief of Staff — on WhatsApp",
    description:
      "Every plan includes a private WhatsApp channel just for you, the owner. Your Owner Brain Agent is a proactive AI Chief of Staff that pushes booking notifications, complaint alerts, hot lead alerts, and daily business summaries directly to your phone. But it is not just one-way — text back commands like \"Add today's special: Wagyu burger AED 95\", \"We're fully booked tonight\", or \"New price for 2BR Marina: AED 1.8M\" and the AI interprets your intent and updates your business knowledge base instantly. No dashboards, no logins. Run your business from your pocket.",
    benefits: [
      "Private owner WhatsApp channel included in every plan",
      "Real-time booking and complaint notifications",
      "Hot lead alerts so you never miss a deal",
      "Daily summary: inquiries, bookings, sentiment, revenue",
      "Text-based commands to update menus, prices, availability",
      "AI interprets natural language and updates knowledge base",
      "No app to install, no dashboard to check",
      "Proactive alerts — the AI comes to you, not the other way",
    ],
    metric: "0",
    metricLabel: "dashboards needed",
    gradient: "from-brand-500/20 to-brand-500/5",
    glow: "rgba(34, 197, 94, 0.2)",
    dot: "bg-brand-400",
    textAccent: "text-brand-400",
    check: "text-brand-400",
  },
  {
    name: "Industry-Specific AI Setup",
    tagline: "Pre-built for restaurants, real estate, clinics, and salons",
    description:
      "Not a generic chatbot — your agent is configured for your exact industry from day one. Restaurants get SevenRooms booking integration, menu management, cuisine-type handling, and dietary preference tracking. Real estate agencies get property search via WhatsApp, viewing bookings, and automatic lead scoring. Healthcare clinics and beauty salons get appointment booking, service pricing, and full calendar sync. Self-service onboarding walks you through 6 steps and you go live in minutes, not weeks.",
    benefits: [
      "Restaurant: SevenRooms, menu, dietary handling",
      "Real Estate: property search, viewings, lead scoring",
      "Healthcare/Beauty: appointments, pricing, calendar sync",
      "6-step self-service onboarding wizard",
      "Go live in minutes, not weeks",
      "Industry-specific conversation flows pre-loaded",
      "Auto Knowledge Base crawls your website on setup",
      "Calendar integration: Google, Outlook, CalDAV, SevenRooms",
    ],
    metric: "<10 min",
    metricLabel: "to go live",
    gradient: "from-amber-500/20 to-amber-500/5",
    glow: "rgba(245, 158, 11, 0.15)",
    dot: "bg-amber-400",
    textAccent: "text-amber-400",
    check: "text-amber-400",
  },
  {
    name: "AI Sales Development Rep",
    tagline: "Never miss a lead — every one remembered and scored",
    description:
      "Autonomously manages your entire top-of-funnel with persistent memory that tracks every lead interaction across months. Scores leads against your ideal customer profile, sends personalized multi-channel outreach via WhatsApp and email, qualifies prospects through adaptive conversation that recalls prior exchanges, and books meetings with your sales team. Hot leads trigger instant Owner Brain alerts so you can act in seconds. Your agent gets smarter with every conversation — it never forgets a prospect.",
    benefits: [
      "Persistent lead memory across all conversations",
      "Hot lead alerts pushed to your Owner WhatsApp channel",
      "500-5,000 leads processed monthly",
      "Instant response (under 5 min vs 47hr industry avg)",
      "ICP scoring and adaptive lead qualification",
      "Automated multi-touch follow-up sequences",
      "70-80% lower cost vs human SDR",
      "Lead history and sentiment tracked over months",
    ],
    metric: "70-80%",
    metricLabel: "lower cost per meeting",
    gradient: "from-orange-500/20 to-orange-500/5",
    glow: "rgba(249, 115, 22, 0.15)",
    dot: "bg-orange-400",
    textAccent: "text-orange-400",
    check: "text-orange-400",
  },
  {
    name: "Content Engine Agent",
    tagline: "Social media on autopilot — fed by your business brain",
    description:
      "Runs your entire organic content operation, powered by your Auto Knowledge Base and real-time business updates. When you text your Owner Brain \"Add today's special: Truffle pasta AED 65\", the Content Engine can turn that into an Instagram post, a TikTok video, and a LinkedIn update — automatically. Generates platform-specific posts, creates short-form video with Arabic and English voice synthesis, and publishes on schedule. Your brand voice stays consistent because the AI knows your business inside out.",
    benefits: [
      "7+ posts per week across platforms",
      "Content generated from live business updates",
      "Arabic and English bilingual content",
      "AI-generated video with voice synthesis",
      "Auto-pulls from your knowledge base for accuracy",
      "Consistent brand voice trained on your data",
      "Performance analytics loop for optimization",
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
    tagline: "Hire faster — interviews booked into your calendar automatically",
    description:
      "Ingests CVs, scores candidates against your criteria, sends personalized advancement or rejection messages in Arabic and English, and books interviews directly into hiring manager calendars via Google Calendar, Outlook, or CalDAV. Complaint and escalation alerts go straight to your Owner Brain channel. Every candidate interaction is remembered — re-applicants are recognized and their history is surfaced instantly.",
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
    gradient: "from-sky-500/20 to-sky-500/5",
    glow: "rgba(14, 165, 233, 0.15)",
    dot: "bg-sky-400",
    textAccent: "text-sky-400",
    check: "text-sky-400",
  },
  {
    name: "Financial Intelligence Agent",
    tagline: "Weekly reports pushed to your WhatsApp — not buried in a dashboard",
    description:
      "Connects to your financial data, categorizes transactions, detects anomalies, and delivers weekly financial health reports in plain language — directly to your Owner Brain WhatsApp channel. Unusual spend? You get an alert. Cash flow running thin? You know before it is a crisis. Text back questions like \"What did we spend on marketing last month?\" and get instant answers. No spreadsheets, no logins.",
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
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 via-surface-950 to-surface-950" />
        <div className="max-w-[1400px] mx-auto relative z-10">
          <FadeUp>
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                Our services
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-none mt-4">
                7 AI agents,
                <br />
                <span className="bg-gradient-to-r from-brand-400 via-emerald-300 to-brand-500 bg-clip-text text-transparent">
                  persistent memory,
                </span>
                <br />
                your own AI Chief of Staff
              </h1>
              <p className="mt-4 text-base text-white/50 leading-relaxed max-w-[52ch]">
                Every agent remembers every customer. Your Owner Brain pushes alerts and takes commands via WhatsApp. Industry-specific setup, self-service onboarding, go live in minutes.
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

        {/* Integrations + Social proof */}
        <FadeUp className="mt-16">
          <div className="rounded-3xl bg-white/[0.03] ring-1 ring-white/[0.06] p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/20 mb-4">Connects with your tools</p>
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
                <p className="text-xs text-white/50">&ldquo;I got my weekends back.&rdquo;</p>
                <p className="text-[10px] text-white/25 mt-0.5">— Agency owner, Dubai</p>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* CTA */}
        <FadeUp className="mt-8">
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
                  Book a free 30-minute audit. We map your operations, configure your industry-specific agents, and get your Owner Brain channel live — so you can run your business from WhatsApp.
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

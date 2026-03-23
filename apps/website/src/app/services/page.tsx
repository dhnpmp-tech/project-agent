import { cn } from "@/lib/utils";

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
    color: "bg-emerald-50",
    dot: "bg-emerald-500",
    accent: "text-emerald-600",
    check: "text-emerald-500",
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
    color: "bg-amber-50",
    dot: "bg-amber-500",
    accent: "text-amber-600",
    check: "text-amber-500",
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
    color: "bg-rose-50",
    dot: "bg-rose-500",
    accent: "text-rose-600",
    check: "text-rose-500",
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
    color: "bg-sky-50",
    dot: "bg-sky-500",
    accent: "text-sky-600",
    check: "text-sky-500",
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
    color: "bg-violet-50",
    dot: "bg-violet-500",
    accent: "text-violet-600",
    check: "text-violet-500",
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-[100dvh]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-4 pt-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between bg-surface-0/80 backdrop-blur-xl rounded-full px-6 py-3 ring-1 ring-surface-200/60 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-surface-900 flex items-center justify-center">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2L2 5.5l6 3.5 6-3.5L8 2zM2 10.5l6 3.5 6-3.5M2 8l6 3.5 6-3.5" />
              </svg>
            </div>
            <span className="text-sm font-bold text-surface-900 tracking-tight">AI Agent Systems</span>
          </a>
          <a href="/book-audit" className="group btn-primary !py-2 !px-5 !text-[13px]">
            Book free audit
          </a>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="max-w-2xl opacity-0 animate-fade-up">
            <span className="eyebrow mb-4">Our services</span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-none text-surface-900 mt-4">
              5 AI agents,
              <br />
              battle-tested
            </h1>
            <p className="mt-4 text-base text-surface-500 leading-relaxed max-w-[52ch]">
              Each agent is ready to deploy for your business in under two weeks.
              Pick one or deploy them all as a unified system.
            </p>
          </div>
        </div>
      </section>

      {/* Agents */}
      <main className="max-w-[1400px] mx-auto px-6 pb-28">
        <div className="space-y-6">
          {agents.map((agent) => (
            <div key={agent.name} className="card-shell">
              <div className="card-core !p-0 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-12">
                  {/* Metric side */}
                  <div className={cn("md:col-span-3 p-8 flex flex-col justify-center", agent.color)}>
                    <p className="stat-value">{agent.metric}</p>
                    <p className="text-xs text-surface-500 mt-1">{agent.metricLabel}</p>
                    <div className="flex items-center gap-2 mt-4">
                      <span className={cn("w-2 h-2 rounded-full", agent.dot)} />
                      <span className={cn("text-xs font-semibold", agent.accent)}>{agent.tagline}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="md:col-span-9 p-8">
                    <h2 className="text-xl font-extrabold text-surface-900 tracking-tight">{agent.name}</h2>
                    <p className="mt-3 text-sm text-surface-500 leading-relaxed max-w-[65ch]">{agent.description}</p>
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {agent.benefits.map((b) => (
                        <div key={b} className="flex gap-2.5 text-sm text-surface-600">
                          <svg className={cn("w-4 h-4 flex-shrink-0 mt-0.5", agent.check)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {b}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16">
          <div className="rounded-4xl bg-surface-950 p-12 md:p-16">
            <div className="max-w-xl">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tighter text-white">Not sure which agents you need?</h2>
              <p className="mt-3 text-sm text-white/40 leading-relaxed">
                Book a free 30-minute audit. We map your operations and recommend the right configuration.
              </p>
              <a href="/book-audit" className="group inline-flex items-center gap-2 mt-6 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-surface-900 hover:bg-surface-100 transition-all duration-500 ease-spring active:scale-[0.98]">
                Book free AI audit
                <span className="w-6 h-6 rounded-full bg-surface-900/10 flex items-center justify-center transition-transform duration-500 ease-spring group-hover:translate-x-0.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

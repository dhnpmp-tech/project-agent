export default function ServicesPage() {
  const agents = [
    {
      name: "WhatsApp Intelligence Agent",
      tagline: "Your 24/7 customer service team",
      description:
        "Handles all inbound WhatsApp messages — customer inquiries, lead qualification, appointment booking, complaints — in Arabic and English. Responds in under 1 second, maintains conversation context, integrates with your CRM.",
      benefits: [
        "400+ inquiries/month handled automatically",
        "65-80% reduction in support workload",
        "24/7 in Arabic + English",
        "CRM integration (HubSpot, Zoho, Airtable)",
        "Smart escalation to human agents",
        "Appointment booking via Calendly",
      ],
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14">
          <rect width="48" height="48" rx="14" fill="#dcfce7" />
          <path d="M24 12c-6.627 0-12 5.066-12 11.318 0 3.55 1.8 6.726 4.627 8.831L15.6 36l4.2-2.22c1.32.37 2.73.57 4.2.57 6.627 0 12-5.066 12-11.318S30.627 12 24 12z" fill="#22c55e" />
          <path d="M28.5 25.5c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17c-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.89-.8-1.5-1.78-1.67-2.08-.18-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.025-.52-.075-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.075-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35z" fill="white" />
        </svg>
      ),
      color: "green",
      gradient: "from-green-50 to-emerald-50/50",
      accent: "text-green-600",
      badge: "bg-green-50 text-green-700 border-green-100",
    },
    {
      name: "AI Sales Development Rep",
      tagline: "Never miss a lead again",
      description:
        "Autonomously manages your entire top-of-funnel: scores leads against your ideal customer profile, sends personalized multi-channel outreach, qualifies prospects through adaptive conversation, and books meetings with your sales team.",
      benefits: [
        "500-5,000 leads processed/month",
        "Instant response (under 5 min vs 47hr avg)",
        "Personalized email + WhatsApp outreach",
        "ICP scoring and lead qualification",
        "Automated follow-up sequences",
        "70-80% lower cost vs. human SDR",
      ],
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14">
          <rect width="48" height="48" rx="14" fill="#ede9fe" />
          <path d="M16 32v-2c0-2.21 3.582-4 8-4s8 1.79 8 4v2" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" />
          <circle cx="24" cy="20" r="4" stroke="#7c3aed" strokeWidth="2" />
          <path d="M32 22l3 3 5-5" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      color: "violet",
      gradient: "from-violet-50 to-purple-50/50",
      accent: "text-violet-600",
      badge: "bg-violet-50 text-violet-700 border-violet-100",
    },
    {
      name: "Content Engine Agent",
      tagline: "Social media on autopilot",
      description:
        "Runs your entire organic content operation — researches trending topics, generates platform-specific posts, creates short-form video with Arabic/English voice, and publishes on schedule across LinkedIn, Instagram, and TikTok.",
      benefits: [
        "7+ posts/week across all platforms",
        "Arabic + English bilingual content",
        "AI-generated video with voice synthesis",
        "Consistent brand voice",
        "Performance analytics loop",
        "From 30+ min to under 2 min per post",
      ],
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14">
          <rect width="48" height="48" rx="14" fill="#fef3c7" />
          <rect x="14" y="14" width="20" height="20" rx="4" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="21" cy="22" r="3" stroke="#f59e0b" strokeWidth="2" />
          <path d="M14 30l5-5 3 3 4-4 8 8" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      color: "amber",
      gradient: "from-amber-50 to-yellow-50/50",
      accent: "text-amber-600",
      badge: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
      name: "HR Screening & Scheduling",
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
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14">
          <rect width="48" height="48" rx="14" fill="#dbeafe" />
          <path d="M18 14h12a2 2 0 012 2v16a2 2 0 01-2 2H18a2 2 0 01-2-2V16a2 2 0 012-2z" stroke="#2563eb" strokeWidth="2" />
          <path d="M21 20h6M21 24h6M21 28h4" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      color: "blue",
      gradient: "from-blue-50 to-sky-50/50",
      accent: "text-blue-600",
      badge: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      name: "Financial Intelligence Agent",
      tagline: "Your weekly financial advisor",
      description:
        "Connects to your financial data, categorizes transactions, detects anomalies, and delivers weekly financial health reports in plain language.",
      benefits: [
        "12 hours/month returned to you",
        "Automated transaction categorization",
        "Anomaly detection and flagging",
        "Weekly + monthly reports",
        "Cash flow forecasting",
      ],
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14">
          <rect width="48" height="48" rx="14" fill="#fce7f3" />
          <path d="M16 32V22" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" />
          <path d="M22 32V18" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" />
          <path d="M28 32V24" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" />
          <path d="M34 32V16" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ),
      color: "pink",
      gradient: "from-pink-50 to-rose-50/50",
      accent: "text-pink-600",
      badge: "bg-pink-50 text-pink-700 border-pink-100",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-accent-500 flex items-center justify-center">
              <svg viewBox="0 0 20 20" className="w-4.5 h-4.5">
                <path d="M10 2L2 7l8 5 8-5-8-5zM2 13l8 5 8-5M2 10l8 5 8-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">AI Agent Systems</span>
          </a>
          <a href="/book-audit" className="btn-primary !py-2.5 !px-5 !text-sm">
            Book Free Audit
          </a>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-16 px-6 mesh-bg">
        <div className="max-w-4xl mx-auto text-center">
          <span className="section-label mb-4">Our Services</span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mt-4 tracking-tight">
            5 AI Agents,{" "}
            <span className="gradient-text">Battle-Tested</span>
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Each agent is ready to deploy for your business in under 2 weeks.
            Pick one or deploy them all as a unified system.
          </p>
        </div>
      </section>

      {/* Agents */}
      <main className="max-w-5xl mx-auto px-6 pb-24">
        <div className="space-y-8">
          {agents.map((agent, i) => (
            <div
              key={agent.name}
              className={`rounded-2xl border border-gray-200 bg-gradient-to-br ${agent.gradient} p-8 md:p-10 card-hover`}
            >
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-4">
                    {agent.icon}
                    <div>
                      <h2 className="text-2xl font-extrabold text-gray-900">{agent.name}</h2>
                      <p className={`text-sm font-semibold ${agent.accent} mt-0.5`}>{agent.tagline}</p>
                    </div>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{agent.description}</p>
                </div>
                <div className="md:w-72 flex-shrink-0">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">What you get</p>
                  <ul className="space-y-2.5">
                    {agent.benefits.map((b) => (
                      <li key={b} className="text-sm text-gray-700 flex gap-2.5">
                        <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${agent.accent}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <div className="rounded-2xl bg-gray-950 p-10 md:p-12 text-white">
            <h2 className="text-2xl md:text-3xl font-extrabold">Not sure which agents you need?</h2>
            <p className="mt-3 text-gray-400 max-w-lg mx-auto">
              Book a free 30-minute audit. We&apos;ll map your operations and recommend the right agents.
            </p>
            <a href="/book-audit" className="btn-primary mt-6 !bg-white !text-gray-900 hover:!bg-gray-100">
              Book Free AI Audit
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

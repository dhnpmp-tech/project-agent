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
    },
    {
      name: "AI Sales Development Representative",
      tagline: "Never miss a lead again",
      description:
        "Autonomously manages your entire top-of-funnel: scores leads against your ideal customer profile, sends personalized multi-channel outreach, qualifies prospects through adaptive conversation, and books meetings with your sales team.",
      benefits: [
        "500-5,000 leads processed/month",
        "Instant response (under 5 minutes vs. 47 hour industry average)",
        "Personalized email + WhatsApp outreach",
        "ICP scoring and lead qualification",
        "Automated follow-up sequences",
        "70-80% lower cost vs. human SDR",
      ],
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
    },
    {
      name: "HR Screening & Scheduling Agent",
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
    },
  ];

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-brand-900">
            AI Agent Systems
          </a>
          <a
            href="/book-audit"
            className="rounded-md bg-brand-600 px-4 py-2 text-white text-sm font-medium hover:bg-brand-700"
          >
            Book Free AI Audit
          </a>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h1>
        <p className="text-lg text-gray-600 mb-12">
          Five AI agent templates, battle-tested and ready to deploy for your
          business in under 2 weeks.
        </p>

        <div className="space-y-16">
          {agents.map((agent) => (
            <div key={agent.name} className="border-b border-gray-100 pb-12">
              <h2 className="text-2xl font-bold text-gray-900">
                {agent.name}
              </h2>
              <p className="text-brand-600 font-medium mt-1">
                {agent.tagline}
              </p>
              <p className="mt-4 text-gray-600">{agent.description}</p>
              <ul className="mt-6 grid sm:grid-cols-2 gap-2">
                {agent.benefits.map((b) => (
                  <li key={b} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-green-500 flex-shrink-0">
                      &#10003;
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

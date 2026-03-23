export default function ProcessPage() {
  const steps = [
    {
      step: "01",
      title: "Free AI Audit",
      duration: "30 minutes",
      description:
        "We map your business operations and identify exactly which tasks can be automated. You get a written roadmap with ROI estimates — usable even if you don't work with us.",
      details: ["Map current workflows", "Identify automation opportunities", "Estimate time & cost savings"],
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    },
    {
      step: "02",
      title: "Agent Selection & Customization",
      duration: "1-2 days",
      description:
        "Based on the audit, we select the right agents for your business. You fill a simple intake form with your business FAQ, brand voice, and integration details.",
      details: ["Select agent configuration", "Simple 20-min intake form", "Define brand voice & tone"],
      icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    },
    {
      step: "03",
      title: "Build & Deploy",
      duration: "5-10 days",
      description:
        "We configure your agents with your business knowledge, connect them to your WhatsApp, CRM, and calendar, and deploy them on isolated, secure infrastructure.",
      details: ["Connect integrations", "Train on your knowledge base", "Deploy to secure infrastructure"],
      icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
    },
    {
      step: "04",
      title: "Test & Launch",
      duration: "1-2 days",
      description:
        "We run comprehensive tests — send test messages, simulate leads, verify all integrations. You review and approve every detail. Then we go live.",
      details: ["End-to-end testing", "Your review & approval", "Go live"],
      icon: "M13 10V3L4 14h7v7l9-11h-7z",
    },
    {
      step: "05",
      title: "Monitor & Optimize",
      duration: "Ongoing",
      description:
        "You get a branded dashboard showing agent performance in real-time. Monthly reports track ROI. We continuously optimize based on conversation data and your feedback.",
      details: ["Real-time dashboard", "Monthly ROI reports", "Continuous optimization"],
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
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
          <span className="section-label mb-4">Our Process</span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mt-4 tracking-tight">
            From First Call to{" "}
            <span className="gradient-text">Live AI Agents</span>
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Under 2 weeks. No technical knowledge required from you.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <main className="max-w-4xl mx-auto px-6 pb-24">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-7 top-0 bottom-0 w-px bg-gradient-to-b from-brand-300 via-brand-200 to-transparent hidden md:block" />

          <div className="space-y-12">
            {steps.map((s) => (
              <div key={s.step} className="relative flex gap-8 group">
                {/* Step indicator */}
                <div className="hidden md:flex flex-col items-center flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-white border-2 border-brand-200 flex items-center justify-center shadow-sm group-hover:border-brand-400 group-hover:shadow-md transition-all">
                    <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                    </svg>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-8 card-hover">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-brand-600 bg-brand-50 rounded-full px-3 py-1">
                      Step {s.step}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">{s.duration}</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-gray-900">{s.title}</h2>
                  <p className="mt-2 text-gray-600 leading-relaxed">{s.description}</p>
                  {s.details && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {s.details.map((d) => (
                        <span key={d} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 rounded-full px-3 py-1.5 border border-gray-100">
                          <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 text-center">
          <div className="relative rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-accent-600 p-12 text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <h2 className="text-3xl font-extrabold">Start with a Free AI Audit</h2>
              <p className="mt-3 text-white/70 max-w-md mx-auto">
                30 minutes. Written roadmap. No commitment.
              </p>
              <a href="/book-audit" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-brand-700 font-bold hover:bg-gray-50 transition-all active:scale-[0.98]">
                Book Your Free Audit
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

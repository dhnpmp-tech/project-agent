export default function HomePage() {
  const agents = [
    {
      title: "WhatsApp Intelligence",
      desc: "Handles 400+ inquiries/month in Arabic & English. Qualifies leads, books appointments, routes to humans when needed.",
      metric: "65-80%",
      metricLabel: "support load reduction",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12">
          <rect width="48" height="48" rx="12" fill="#dcfce7" />
          <path
            d="M24 12c-6.627 0-12 5.066-12 11.318 0 3.55 1.8 6.726 4.627 8.831L15.6 36l4.2-2.22c1.32.37 2.73.57 4.2.57 6.627 0 12-5.066 12-11.318S30.627 12 24 12z"
            fill="#22c55e"
          />
          <path
            d="M28.5 25.5c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17c-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.89-.8-1.5-1.78-1.67-2.08-.18-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.025-.52-.075-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.075-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35z"
            fill="white"
          />
        </svg>
      ),
      gradient: "from-green-50 to-emerald-50",
      border: "hover:border-green-300",
    },
    {
      title: "AI Sales Rep (SDR)",
      desc: "Scores leads, sends personalized outreach across email & WhatsApp, qualifies prospects, and books meetings automatically.",
      metric: "70-80%",
      metricLabel: "lower cost per qualified meeting",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12">
          <rect width="48" height="48" rx="12" fill="#ede9fe" />
          <path
            d="M16 32v-2c0-2.21 3.582-4 8-4s8 1.79 8 4v2"
            stroke="#7c3aed"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="24" cy="20" r="4" stroke="#7c3aed" strokeWidth="2" />
          <path
            d="M32 22l3 3 5-5"
            stroke="#7c3aed"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      gradient: "from-violet-50 to-purple-50",
      border: "hover:border-violet-300",
    },
    {
      title: "Content Engine",
      desc: "Generates and schedules posts for LinkedIn, Instagram, TikTok — including video with AI voice. Bilingual.",
      metric: "2 min",
      metricLabel: "per post (was 30+ min)",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12">
          <rect width="48" height="48" rx="12" fill="#fef3c7" />
          <rect x="14" y="14" width="20" height="20" rx="4" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="21" cy="22" r="3" stroke="#f59e0b" strokeWidth="2" />
          <path
            d="M14 30l5-5 3 3 4-4 8 8"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      gradient: "from-amber-50 to-yellow-50",
      border: "hover:border-amber-300",
    },
    {
      title: "HR Screening Agent",
      desc: "Parses CVs, scores candidates, sends personalized messages, books interviews. Full audit trail.",
      metric: "10-15h",
      metricLabel: "saved per hiring cycle",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12">
          <rect width="48" height="48" rx="12" fill="#dbeafe" />
          <path
            d="M18 14h12a2 2 0 012 2v16a2 2 0 01-2 2H18a2 2 0 01-2-2V16a2 2 0 012-2z"
            stroke="#2563eb"
            strokeWidth="2"
          />
          <path d="M21 20h6M21 24h6M21 28h4" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      gradient: "from-blue-50 to-sky-50",
      border: "hover:border-blue-300",
    },
    {
      title: "Financial Intelligence",
      desc: "Categorizes transactions, detects anomalies, delivers weekly reports in plain language.",
      metric: "12h/mo",
      metricLabel: "returned to the owner",
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12">
          <rect width="48" height="48" rx="12" fill="#fce7f3" />
          <path d="M16 32V22" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" />
          <path d="M22 32V18" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" />
          <path d="M28 32V24" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" />
          <path d="M34 32V16" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ),
      gradient: "from-pink-50 to-rose-50",
      border: "hover:border-pink-300",
    },
  ];

  const pricingPlans = [
    {
      tier: "Starter",
      subtitle: "Perfect for solopreneurs",
      price: "1,500",
      period: "/mo",
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
      subtitle: "For growing businesses",
      price: "8,000",
      period: "/mo",
      setup: "AED 15,000 one-time setup",
      popular: true,
      features: [
        "3-5 AI agents",
        "Full CRM integration",
        "Custom knowledge base",
        "Weekly reports & dashboard",
        "Priority support",
        "Dedicated Slack channel",
      ],
    },
    {
      tier: "Enterprise",
      subtitle: "Full-scale automation",
      price: "30,000+",
      period: "/mo",
      setup: "Custom setup & integration",
      features: [
        "Unlimited agents",
        "Dedicated infrastructure",
        "UAE data residency",
        "Custom integrations",
        "SLA guarantee",
        "Dedicated account manager",
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-accent-500 flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="white" className="w-4.5 h-4.5">
                <path d="M10 2L2 7l8 5 8-5-8-5zM2 13l8 5 8-5M2 10l8 5 8-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">
              AI Agent Systems
            </span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="/services" className="text-gray-500 hover:text-gray-900 transition-colors">
              Services
            </a>
            <a href="/process" className="text-gray-500 hover:text-gray-900 transition-colors">
              Process
            </a>
            <a href="/case-study" className="text-gray-500 hover:text-gray-900 transition-colors">
              Case Study
            </a>
            <a href="/book-audit" className="btn-primary !py-2.5 !px-5 !text-sm">
              Book Free Audit
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden mesh-bg">
        {/* Decorative blobs */}
        <div className="absolute top-20 -left-32 w-96 h-96 bg-brand-200/20 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 bg-accent-400/10 rounded-full blur-3xl animate-pulse-soft delay-500" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-100 px-4 py-1.5 text-sm font-medium text-brand-700 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse-soft" />
            Now deploying in UAE & Saudi Arabia
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.08] animate-fade-in-up">
            AI Agents That
            <br />
            <span className="gradient-text">Run Your Business</span>
            <br />
            24/7
          </h1>

          <p className="mt-6 text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
            We deploy fully-managed AI agent systems for SMBs in the Middle East.
            WhatsApp support, sales automation, content, HR, and finance —{" "}
            <span className="text-gray-700 font-medium">live in under 2 weeks.</span>
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-300">
            <a href="/book-audit" className="btn-primary text-base gap-2">
              Book a Free AI Audit
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
            <a href="/case-study" className="btn-secondary text-base">
              See Case Study
            </a>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto animate-fade-in-up delay-400">
            {[
              { value: "380+", label: "Inquiries automated/mo" },
              { value: "19h", label: "Owner time saved/week" },
              { value: "<2wk", label: "To go live" },
            ].map((s) => (
              <div key={s.label}>
                <p className="stat-number text-3xl md:text-4xl">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Tech Bar */}
      <section className="border-y border-gray-100 px-6 py-6 bg-gray-50/50">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs text-center text-gray-400 uppercase tracking-wider mb-4 font-medium">
            Built on enterprise-grade AI infrastructure
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-3 text-gray-300 font-semibold text-sm">
            {["Claude AI", "WhatsApp Business API", "HubSpot", "Calendly", "MiniMax"].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Agent Cards */}
      <section className="px-6 py-24 relative">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="section-label mb-4">Our Agents</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mt-4 tracking-tight">
              5 Agents. One System.
            </h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto text-lg">
              Each agent works autonomously. Together, they transform how your business operates.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {agents.map((agent, i) => (
              <div
                key={agent.title}
                className={`group relative rounded-2xl border border-gray-200 bg-gradient-to-br ${agent.gradient} p-6 card-hover ${agent.border}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="mb-4">{agent.icon}</div>
                <h3 className="text-lg font-bold text-gray-900">{agent.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{agent.desc}</p>
                <div className="mt-5 pt-4 border-t border-gray-200/60">
                  <span className="text-2xl font-extrabold text-gray-900">{agent.metric}</span>
                  <span className="text-xs text-gray-500 ml-2">{agent.metricLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works - mini */}
      <section className="px-6 py-24 bg-gray-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 dot-pattern" />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-1.5 text-sm font-medium text-white/70 mb-4">
              How It Works
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Live in <span className="text-brand-400">Under 2 Weeks</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Free Audit", desc: "30-min call. We map what to automate and estimate ROI.", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
              { step: "02", title: "Configure", desc: "We build your agents with your knowledge base and integrations.", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
              { step: "03", title: "Launch", desc: "Full testing, then go live. You approve every step.", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
              { step: "04", title: "Optimize", desc: "Dashboard, monthly ROI reports, continuous improvements.", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                  </svg>
                </div>
                <p className="text-xs font-bold text-brand-400 mb-1">{s.step}</p>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <a href="/process" className="text-brand-400 font-semibold text-sm hover:text-brand-300 transition-colors inline-flex items-center gap-1">
              See full process
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonial */}
      <section className="px-6 py-24 mesh-bg">
        <div className="max-w-4xl mx-auto text-center">
          <span className="section-label mb-6">Case Study</span>
          <div className="mt-6 relative">
            <svg className="absolute -top-4 -left-4 w-12 h-12 text-brand-100" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H10v10H0z" />
            </svg>
            <blockquote className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug">
              &ldquo;The WhatsApp agent sounds like one of our best agents. It handles Arabic
              conversations perfectly.{" "}
              <span className="gradient-text">I got my weekends back.</span>&rdquo;
            </blockquote>
            <div className="mt-6">
              <p className="font-semibold text-gray-900">Real Estate Agency Owner</p>
              <p className="text-sm text-gray-500">Dubai Marina — 380 inquiries automated/month</p>
            </div>
          </div>
          <a
            href="/case-study"
            className="mt-8 inline-flex items-center gap-2 text-brand-600 font-semibold hover:text-brand-700 transition-colors"
          >
            Read the full case study
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-24 relative">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="section-label mb-4">Pricing</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mt-4 tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto">
              All plans include full setup, training, and ongoing optimization. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {pricingPlans.map((plan) => (
              <div
                key={plan.tier}
                className={`relative rounded-2xl p-8 transition-all duration-300 ${
                  plan.popular
                    ? "bg-gray-950 text-white ring-4 ring-brand-400/20 scale-[1.02] shadow-2xl"
                    : "bg-white border border-gray-200 hover:border-gray-300 hover:shadow-lg"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-brand-500 px-4 py-1 text-xs font-bold text-white shadow-lg shadow-brand-500/30">
                      Most Popular
                    </span>
                  </div>
                )}
                <p className={`text-sm font-semibold ${plan.popular ? "text-brand-400" : "text-brand-600"}`}>
                  {plan.tier}
                </p>
                <p className={`text-xs mt-0.5 ${plan.popular ? "text-gray-400" : "text-gray-500"}`}>
                  {plan.subtitle}
                </p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-xs text-gray-500">AED</span>
                  <span className={`text-4xl font-extrabold ${plan.popular ? "text-white" : "text-gray-900"}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.popular ? "text-gray-400" : "text-gray-500"}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${plan.popular ? "text-gray-500" : "text-gray-400"}`}>
                  {plan.setup}
                </p>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className={`text-sm flex gap-2.5 ${plan.popular ? "text-gray-300" : "text-gray-600"}`}>
                      <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.popular ? "text-brand-400" : "text-emerald-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href="/book-audit"
                  className={`mt-8 block text-center rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    plan.popular
                      ? "bg-brand-500 text-white hover:bg-brand-400 shadow-lg shadow-brand-500/25"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  Get Started
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-accent-600 p-12 md:p-16 text-center text-white overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                Ready to automate?
              </h2>
              <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
                Book a free 30-minute AI Audit. We&apos;ll map exactly what you can
                automate and estimate the time and cost savings.{" "}
                <span className="text-white font-semibold">No commitment.</span>
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/book-audit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-brand-700 font-bold text-lg hover:bg-gray-50 transition-all hover:shadow-xl active:scale-[0.98]"
                >
                  Book Your Free Audit
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
              <p className="mt-4 text-sm text-white/50">
                Free 30-min call &middot; Written AI roadmap &middot; No strings attached
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-600 to-accent-500 flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="white" className="w-3.5 h-3.5">
                <path d="M10 2L2 7l8 5 8-5-8-5zM2 13l8 5 8-5M2 10l8 5 8-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900">AI Agent Systems</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-gray-400">
            <a href="/services" className="hover:text-gray-600 transition-colors">Services</a>
            <a href="/process" className="hover:text-gray-600 transition-colors">Process</a>
            <a href="/case-study" className="hover:text-gray-600 transition-colors">Case Study</a>
            <a href="/book-audit" className="hover:text-gray-600 transition-colors">Book Audit</a>
          </div>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} AI Agent Systems. Dubai, UAE.
          </p>
        </div>
      </footer>
    </div>
  );
}

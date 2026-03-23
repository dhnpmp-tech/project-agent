import { cn } from "@/lib/utils";

const agents = [
  {
    title: "WhatsApp Intelligence",
    desc: "Handles 400+ customer inquiries a month in Arabic and English. Qualifies leads, books appointments, escalates when needed. Responds in under 1 second.",
    metric: "65-80%",
    metricLabel: "support load reduction",
    color: "bg-emerald-50",
    ring: "ring-emerald-200/60",
    dot: "bg-emerald-500",
  },
  {
    title: "AI Sales Rep",
    desc: "Scores leads against your ICP, sends personalized outreach via email and WhatsApp, qualifies through conversation, and books meetings with your team.",
    metric: "70-80%",
    metricLabel: "lower cost per meeting",
    color: "bg-amber-50",
    ring: "ring-amber-200/60",
    dot: "bg-amber-500",
  },
  {
    title: "Content Engine",
    desc: "Runs your entire content operation across LinkedIn, Instagram, and TikTok. Generates posts, creates video with AI voice, publishes on schedule. Bilingual.",
    metric: "<2 min",
    metricLabel: "per post (was 30+)",
    color: "bg-rose-50",
    ring: "ring-rose-200/60",
    dot: "bg-rose-500",
  },
  {
    title: "HR Screening",
    desc: "Parses CVs, scores candidates against your criteria, sends personalized messages, and books interviews directly into hiring manager calendars.",
    metric: "10-15h",
    metricLabel: "saved per hiring cycle",
    color: "bg-sky-50",
    ring: "ring-sky-200/60",
    dot: "bg-sky-500",
  },
  {
    title: "Financial Intelligence",
    desc: "Connects to your financial data, categorizes transactions, flags anomalies, and delivers weekly health reports in plain language.",
    metric: "12h/mo",
    metricLabel: "returned to owner",
    color: "bg-violet-50",
    ring: "ring-violet-200/60",
    dot: "bg-violet-500",
  },
];

const pricing = [
  {
    tier: "Starter",
    for: "Solopreneurs",
    price: "1,500",
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
    for: "Growing teams",
    price: "8,000",
    setup: "AED 15,000 one-time setup",
    popular: true,
    features: [
      "3-5 AI agents",
      "Full CRM integration (HubSpot, Zoho)",
      "Custom knowledge base",
      "Weekly reports and live dashboard",
      "Priority support",
      "Dedicated Slack channel",
    ],
  },
  {
    tier: "Enterprise",
    for: "Scaling operations",
    price: "30,000+",
    setup: "Custom setup and integration",
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

export default function HomePage() {
  return (
    <div className="min-h-[100dvh]">
      {/* Navigation — floating pill */}
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
          <div className="hidden md:flex items-center gap-7 text-[13px] font-medium text-surface-500">
            <a href="/services" className="hover:text-surface-900 transition-colors duration-300">Services</a>
            <a href="/process" className="hover:text-surface-900 transition-colors duration-300">Process</a>
            <a href="/case-study" className="hover:text-surface-900 transition-colors duration-300">Case study</a>
            <a href="/book-audit" className="group btn-primary !py-2 !px-5 !text-[13px]">
              Book free audit
              <span className="btn-icon !w-5 !h-5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </span>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero — left-aligned, asymmetric split */}
      <section className="min-h-[100dvh] flex items-center px-6 pt-28 pb-20">
        <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          {/* Left — copy */}
          <div className="opacity-0 animate-fade-up">
            <div className="eyebrow mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse-dot" />
              Deploying in UAE and Saudi Arabia
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-none text-surface-900">
              AI agents that
              <br />
              run your business
              <br />
              <span className="text-brand-600">around the clock</span>
            </h1>

            <p className="mt-6 text-base text-surface-500 leading-relaxed max-w-[52ch]">
              We deploy fully-managed AI agent systems for SMBs in the Middle East.
              WhatsApp support, sales automation, content, HR, and finance — live
              in under two weeks.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <a href="/book-audit" className="group btn-primary">
                Book a free AI audit
                <span className="btn-icon">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </span>
              </a>
              <a href="/case-study" className="btn-secondary">
                Read case study
              </a>
            </div>
          </div>

          {/* Right — stats + social proof */}
          <div className="opacity-0 animate-fade-up delay-200">
            <div className="card-shell">
              <div className="card-core space-y-8">
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { value: "380+", label: "inquiries automated monthly" },
                    { value: "19h", label: "owner time saved per week" },
                    { value: "11d", label: "to go live" },
                  ].map((s) => (
                    <div key={s.label}>
                      <p className="stat-value">{s.value}</p>
                      <p className="text-xs text-surface-400 mt-1.5 leading-snug">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-surface-100 pt-6">
                  <p className="text-xs text-surface-400 uppercase tracking-[0.15em] font-medium mb-3">Infrastructure</p>
                  <div className="flex flex-wrap gap-2">
                    {["Claude AI", "WhatsApp Business API", "HubSpot", "Calendly"].map((t) => (
                      <span key={t} className="inline-flex items-center gap-1.5 text-xs font-medium text-surface-500 bg-surface-50 rounded-full px-3 py-1.5 ring-1 ring-surface-100">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-surface-100 pt-6">
                  <blockquote className="text-sm text-surface-600 leading-relaxed italic">
                    &ldquo;The WhatsApp agent sounds like one of our best agents. I got my weekends back.&rdquo;
                  </blockquote>
                  <p className="text-xs text-surface-400 mt-2">Real estate agency owner, Dubai Marina</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Agents — asymmetric 2-column zig-zag */}
      <section className="px-6 py-28 bg-surface-50">
        <div className="max-w-[1400px] mx-auto">
          <div className="max-w-2xl mb-16 opacity-0 animate-fade-up">
            <span className="eyebrow mb-4">5 agents, one system</span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tighter leading-none text-surface-900 mt-4">
              Each agent works autonomously.
              <br />
              Together, they transform your business.
            </h2>
          </div>

          <div className="space-y-4">
            {agents.map((agent, i) => (
              <div
                key={agent.title}
                className={cn(
                  "group grid grid-cols-1 md:grid-cols-12 gap-4 items-center rounded-4xl p-1.5",
                  "bg-surface-950/[0.02] ring-1 ring-surface-950/[0.04]",
                  "transition-all duration-700 ease-spring hover:ring-surface-950/[0.08]"
                )}
              >
                {/* Metric */}
                <div className={cn(
                  "md:col-span-3 rounded-[calc(2rem-0.375rem)] p-8 flex flex-col justify-center",
                  agent.color
                )}>
                  <p className="stat-value">{agent.metric}</p>
                  <p className="text-xs text-surface-500 mt-1.5">{agent.metricLabel}</p>
                </div>

                {/* Content */}
                <div className="md:col-span-9 bg-surface-0 rounded-[calc(2rem-0.375rem)] p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={cn("w-2 h-2 rounded-full", agent.dot)} />
                    <h3 className="text-lg font-bold text-surface-900 tracking-tight">{agent.title}</h3>
                  </div>
                  <p className="text-sm text-surface-500 leading-relaxed max-w-[65ch]">{agent.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process — compact */}
      <section className="px-6 py-28">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="opacity-0 animate-fade-up">
              <span className="eyebrow mb-4">How it works</span>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tighter leading-none text-surface-900 mt-4">
                From first call to live agents in under 2 weeks
              </h2>
              <p className="mt-6 text-base text-surface-500 leading-relaxed max-w-[52ch]">
                No technical knowledge required from you. We handle everything
                from setup to ongoing optimization.
              </p>
              <a href="/process" className="group btn-primary mt-8">
                See full process
                <span className="btn-icon">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </span>
              </a>
            </div>

            <div className="space-y-6 opacity-0 animate-fade-up delay-200">
              {[
                { step: "01", title: "Free audit", desc: "30-minute call. We map what to automate and estimate your ROI." },
                { step: "02", title: "Configure", desc: "We build your agents with your knowledge base and connect your tools." },
                { step: "03", title: "Launch", desc: "Full testing, your approval, then go live. Usually 5-10 business days." },
                { step: "04", title: "Optimize", desc: "Live dashboard, monthly ROI reports, continuous performance improvements." },
              ].map((s) => (
                <div key={s.step} className="flex gap-5 group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-surface-50 ring-1 ring-surface-100 flex items-center justify-center text-xs font-bold text-surface-400 font-mono transition-all duration-500 ease-spring group-hover:bg-brand-50 group-hover:text-brand-600 group-hover:ring-brand-200">
                    {s.step}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-surface-900">{s.title}</h3>
                    <p className="text-sm text-surface-500 mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial — full width */}
      <section className="px-6 py-28 bg-surface-950 text-white relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.15em] font-semibold bg-white/5 text-white/40 ring-1 ring-white/10 mb-8">
              Case study
            </span>
            <blockquote className="text-3xl md:text-5xl font-extrabold tracking-tighter leading-[1.1]">
              &ldquo;I was skeptical about AI handling our customer conversations.
              But the WhatsApp agent sounds like one of our best agents.
              <span className="text-brand-400"> I got my weekends back.</span>&rdquo;
            </blockquote>
            <div className="mt-8 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/10">
                <span className="text-xs font-bold text-white/60">AH</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">Agency owner</p>
                <p className="text-xs text-white/40">Real estate, Dubai Marina — 380 inquiries automated monthly</p>
              </div>
            </div>
            <a href="/case-study" className="group inline-flex items-center gap-2 mt-8 text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors duration-300">
              Read the full case study
              <svg className="w-4 h-4 transition-transform duration-500 ease-spring group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </a>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-28">
        <div className="max-w-[1400px] mx-auto">
          <div className="max-w-2xl mb-16">
            <span className="eyebrow mb-4">Pricing</span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tighter leading-none text-surface-900 mt-4">
              Transparent pricing, no surprises
            </h2>
            <p className="mt-4 text-base text-surface-500 max-w-[52ch]">
              All plans include full setup, training, and ongoing optimization. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pricing.map((plan) => (
              <div
                key={plan.tier}
                className={cn(
                  "relative rounded-4xl transition-all duration-700 ease-spring",
                  plan.popular
                    ? "bg-surface-950 text-white p-1.5"
                    : "card-shell"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-8">
                    <span className="inline-flex items-center rounded-full bg-brand-500 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider shadow-lg shadow-brand-500/25">
                      Most popular
                    </span>
                  </div>
                )}

                <div className={cn(
                  "h-full flex flex-col",
                  plan.popular
                    ? "bg-surface-900 rounded-[calc(2rem-0.375rem)] p-8"
                    : "card-core"
                )}>
                  <div>
                    <p className={cn("text-xs font-semibold uppercase tracking-[0.15em]", plan.popular ? "text-brand-400" : "text-brand-600")}>{plan.tier}</p>
                    <p className={cn("text-xs mt-0.5", plan.popular ? "text-white/40" : "text-surface-400")}>{plan.for}</p>
                  </div>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className={cn("text-xs", plan.popular ? "text-white/40" : "text-surface-400")}>AED</span>
                    <span className={cn("text-4xl font-extrabold tracking-tighter font-mono", plan.popular ? "text-white" : "text-surface-900")}>{plan.price}</span>
                    <span className={cn("text-sm", plan.popular ? "text-white/40" : "text-surface-400")}>/mo</span>
                  </div>
                  <p className={cn("text-xs mt-1", plan.popular ? "text-white/30" : "text-surface-400")}>{plan.setup}</p>

                  <ul className="mt-8 space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className={cn("text-sm flex gap-2.5", plan.popular ? "text-white/60" : "text-surface-500")}>
                        <svg className={cn("w-4 h-4 flex-shrink-0 mt-0.5", plan.popular ? "text-brand-400" : "text-brand-500")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <a
                    href="/book-audit"
                    className={cn(
                      "mt-8 group flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-500 ease-spring active:scale-[0.98]",
                      plan.popular
                        ? "bg-white text-surface-900 hover:bg-surface-100"
                        : "bg-surface-900 text-white hover:bg-surface-800"
                    )}
                  >
                    Get started
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center transition-transform duration-500 ease-spring group-hover:translate-x-0.5",
                      plan.popular ? "bg-surface-900/10" : "bg-white/10"
                    )}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 pb-28">
        <div className="max-w-[1400px] mx-auto">
          <div className="card-shell">
            <div className="card-core !p-12 md:!p-20 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-brand-100/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="relative">
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tighter leading-none text-surface-900">
                  Ready to automate?
                </h2>
                <p className="mt-4 text-base text-surface-500 max-w-md mx-auto leading-relaxed">
                  Book a free 30-minute AI audit. We map exactly what you can automate and
                  estimate the time and cost savings. No commitment.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <a href="/book-audit" className="group btn-primary">
                    Book your free audit
                    <span className="btn-icon">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </span>
                  </a>
                </div>
                <p className="mt-4 text-xs text-surface-400">
                  Free 30-min call &middot; Written AI roadmap &middot; No strings attached
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-100 px-6 py-12">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-surface-900 flex items-center justify-center">
              <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2L2 5.5l6 3.5 6-3.5L8 2zM2 10.5l6 3.5 6-3.5M2 8l6 3.5 6-3.5" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-surface-900">AI Agent Systems</span>
          </div>
          <div className="flex items-center gap-8 text-xs text-surface-400 font-medium">
            <a href="/services" className="hover:text-surface-600 transition-colors duration-300">Services</a>
            <a href="/process" className="hover:text-surface-600 transition-colors duration-300">Process</a>
            <a href="/case-study" className="hover:text-surface-600 transition-colors duration-300">Case study</a>
            <a href="/book-audit" className="hover:text-surface-600 transition-colors duration-300">Book audit</a>
          </div>
          <p className="text-xs text-surface-400">
            &copy; {new Date().getFullYear()} AI Agent Systems. Dubai, UAE.
          </p>
        </div>
      </footer>
    </div>
  );
}

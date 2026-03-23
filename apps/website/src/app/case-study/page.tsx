export default function CaseStudyPage() {
  const stats = [
    { metric: "380", label: "Inquiries handled automatically", suffix: "/mo" },
    { metric: "19", label: "Owner hours saved per week", suffix: "h/wk" },
    { metric: "0", label: "Additional staff hired", suffix: "" },
    { metric: "11", label: "Days from start to live", suffix: "days" },
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

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 bg-gray-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 dot-pattern" />
        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-1.5 text-sm font-medium text-white/70 mb-6">
            Case Study
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
            How a Dubai Real Estate Agency Automated{" "}
            <span className="text-brand-400">380 Monthly Inquiries</span>
          </h1>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
            {["Real Estate", "Dubai, UAE", "3 Agents Deployed", "11 Days to Launch"].map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1 border border-white/10">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="px-6 -mt-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-lg shadow-gray-200/50">
                <div className="flex items-baseline justify-center gap-0.5">
                  <span className="stat-number text-3xl">{s.metric}</span>
                  {s.suffix && <span className="text-sm font-bold text-brand-600">{s.suffix}</span>}
                </div>
                <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-20">
        {/* Challenge */}
        <div className="mb-16">
          <span className="section-label mb-4">The Challenge</span>
          <h2 className="text-2xl font-extrabold text-gray-900 mt-4 mb-4">
            Drowning in WhatsApp messages
          </h2>
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>
              A growing real estate agency in Dubai Marina was receiving <span className="font-semibold text-gray-900">400+
              WhatsApp inquiries per month</span> from prospective buyers and tenants.
              With a team of 5, the owner was spending <span className="font-semibold text-gray-900">15+ hours per week</span> just
              responding to initial messages — many of which were repetitive
              questions about pricing, availability, and viewing schedules.
            </p>
            <p>
              Leads were falling through the cracks. Follow-ups were inconsistent.
              The team had no time for content creation, and their social media had
              gone quiet.
            </p>
          </div>
        </div>

        {/* Solution */}
        <div className="mb-16">
          <span className="section-label mb-4">The Solution</span>
          <h2 className="text-2xl font-extrabold text-gray-900 mt-4 mb-6">
            3 AI agents, deployed in 11 days
          </h2>
          <div className="space-y-4">
            {[
              {
                name: "WhatsApp Intelligence Agent",
                desc: "Handles all inbound inquiries in Arabic and English, provides property information, qualifies buyers, and books site visits via Calendly.",
                color: "bg-green-50 border-green-100",
                dot: "bg-green-500",
              },
              {
                name: "AI Sales Development Rep",
                desc: "Scores incoming leads against ICP criteria, sends personalized follow-up sequences, and books qualified meetings with senior agents.",
                color: "bg-violet-50 border-violet-100",
                dot: "bg-violet-500",
              },
              {
                name: "Content Engine Agent",
                desc: "Generates and publishes 5 posts/week across LinkedIn and Instagram, including property showcases and market insights.",
                color: "bg-amber-50 border-amber-100",
                dot: "bg-amber-500",
              },
            ].map((agent) => (
              <div key={agent.name} className={`rounded-xl border ${agent.color} p-5`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${agent.dot}`} />
                  <h3 className="font-bold text-gray-900">{agent.name}</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{agent.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="mb-16">
          <div className="relative rounded-2xl bg-gradient-to-br from-gray-50 to-brand-50/30 border border-gray-200 p-8 md:p-10">
            <svg className="absolute top-6 left-6 w-10 h-10 text-brand-200" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H10v10H0z" />
            </svg>
            <blockquote className="relative text-xl md:text-2xl font-bold text-gray-900 leading-snug pt-8">
              &ldquo;I was skeptical about AI handling our customer conversations
              — our clients expect a personal touch. But the WhatsApp agent sounds
              like one of our best agents. It handles the Arabic conversations
              perfectly. <span className="gradient-text">I got my weekends back.</span>&rdquo;
            </blockquote>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                <span className="text-brand-700 font-bold text-sm">AH</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Agency Owner</p>
                <p className="text-xs text-gray-500">Real Estate — Dubai Marina</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="relative rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-accent-600 p-12 text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <h2 className="text-2xl md:text-3xl font-extrabold">Get Results Like This</h2>
              <p className="mt-3 text-white/70 max-w-md mx-auto">
                Book a free 30-minute audit and see what AI agents can do for your business.
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

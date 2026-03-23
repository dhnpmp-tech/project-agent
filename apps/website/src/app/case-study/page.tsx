import { cn } from "@/lib/utils";

export default function CaseStudyPage() {
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
          <a href="/book-audit" className="group btn-primary !py-2 !px-5 !text-[13px]">Book free audit</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 bg-surface-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
        <div className="relative max-w-[1400px] mx-auto">
          <div className="max-w-3xl opacity-0 animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.15em] font-semibold bg-white/5 text-white/40 ring-1 ring-white/10 mb-6">
              Case study
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-none">
              How a Dubai real estate agency automated 380 monthly inquiries
            </h1>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Real estate", "Dubai, UAE", "3 agents deployed", "11 days to launch"].map((tag) => (
                <span key={tag} className="inline-flex items-center text-xs font-medium text-white/40 bg-white/5 rounded-full px-3 py-1.5 ring-1 ring-white/10">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 -mt-8 relative z-10">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: "380", suffix: "/mo", label: "Inquiries handled automatically" },
              { value: "19", suffix: "h/wk", label: "Owner time saved per week" },
              { value: "0", suffix: "", label: "Additional staff hired" },
              { value: "11", suffix: "days", label: "From start to live" },
            ].map((s) => (
              <div key={s.label} className="card-shell">
                <div className="card-core !p-6 text-center">
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="stat-value text-3xl">{s.value}</span>
                    {s.suffix && <span className="text-sm font-bold text-brand-600 font-mono">{s.suffix}</span>}
                  </div>
                  <p className="text-[11px] text-surface-400 mt-1.5 font-medium">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-24">
        {/* Challenge */}
        <div className="mb-20">
          <span className="eyebrow mb-4">The challenge</span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tighter text-surface-900 mt-4 mb-5">
            Drowning in WhatsApp messages
          </h2>
          <div className="space-y-4 text-sm text-surface-500 leading-relaxed max-w-[65ch]">
            <p>
              A growing real estate agency in Dubai Marina was receiving <span className="font-semibold text-surface-900">400+
              WhatsApp inquiries per month</span> from prospective buyers and tenants.
              With a team of 5, the owner was spending <span className="font-semibold text-surface-900">15+ hours per week</span> just
              responding to initial messages — many of which were repetitive
              questions about pricing, availability, and viewing schedules.
            </p>
            <p>
              Leads were falling through the cracks. Follow-ups were inconsistent.
              The team had no time for content creation, and their social media had
              gone quiet for months.
            </p>
          </div>
        </div>

        {/* Solution */}
        <div className="mb-20">
          <span className="eyebrow mb-4">The solution</span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tighter text-surface-900 mt-4 mb-6">
            3 AI agents, deployed in 11 days
          </h2>
          <div className="space-y-3">
            {[
              {
                name: "WhatsApp Intelligence Agent",
                desc: "Handles all inbound inquiries in Arabic and English, provides property information, qualifies buyers, and books site visits via Calendly.",
                dot: "bg-emerald-500",
                bg: "bg-emerald-50 ring-emerald-100",
              },
              {
                name: "AI Sales Development Rep",
                desc: "Scores incoming leads against ICP criteria, sends personalized follow-up sequences, and books qualified meetings with senior agents.",
                dot: "bg-amber-500",
                bg: "bg-amber-50 ring-amber-100",
              },
              {
                name: "Content Engine Agent",
                desc: "Generates and publishes 5 posts per week across LinkedIn and Instagram, including property showcases and market insights.",
                dot: "bg-rose-500",
                bg: "bg-rose-50 ring-rose-100",
              },
            ].map((agent) => (
              <div key={agent.name} className={cn("rounded-2xl p-6 ring-1", agent.bg)}>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className={cn("w-2 h-2 rounded-full", agent.dot)} />
                  <h3 className="text-sm font-bold text-surface-900">{agent.name}</h3>
                </div>
                <p className="text-sm text-surface-500 leading-relaxed">{agent.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="mb-20">
          <div className="card-shell">
            <div className="card-core !p-10">
              <blockquote className="text-xl md:text-2xl font-extrabold tracking-tighter text-surface-900 leading-snug">
                &ldquo;I was skeptical about AI handling our customer conversations
                — our clients expect a personal touch. But the WhatsApp agent sounds
                like one of our best agents. It handles the Arabic conversations
                perfectly. I got my weekends back.&rdquo;
              </blockquote>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-50 ring-1 ring-surface-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-surface-400">AH</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-surface-900">Agency owner</p>
                  <p className="text-xs text-surface-400">Real estate — Dubai Marina</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-4xl bg-surface-950 p-12 text-center">
          <h2 className="text-2xl font-extrabold tracking-tighter text-white">Get results like this</h2>
          <p className="mt-3 text-sm text-white/40 max-w-md mx-auto">
            Book a free 30-minute audit and see what AI agents can do for your business.
          </p>
          <a href="/book-audit" className="group inline-flex items-center gap-2 mt-6 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-surface-900 hover:bg-surface-100 transition-all duration-500 ease-spring active:scale-[0.98]">
            Book your free audit
            <span className="w-6 h-6 rounded-full bg-surface-900/10 flex items-center justify-center transition-transform duration-500 ease-spring group-hover:translate-x-0.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </span>
          </a>
        </div>
      </main>
    </div>
  );
}

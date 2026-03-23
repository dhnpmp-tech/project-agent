import { cn } from "@/lib/utils";

const steps = [
  {
    step: "01",
    title: "Free AI audit",
    duration: "30 minutes",
    description: "We map your business operations and identify exactly which tasks can be automated. You get a written roadmap with ROI estimates — usable even if you choose not to work with us.",
    details: ["Map current workflows", "Identify automation wins", "Estimate time and cost savings"],
  },
  {
    step: "02",
    title: "Agent selection and customization",
    duration: "1-2 days",
    description: "Based on the audit, we select the right agents for your business. You fill a simple intake form with your business FAQ, brand voice, and integration details. Takes about 20 minutes.",
    details: ["Select agent configuration", "20-min intake form", "Define brand voice and tone"],
  },
  {
    step: "03",
    title: "Build and deploy",
    duration: "5-10 days",
    description: "We configure your agents with your business knowledge, connect them to your WhatsApp, CRM, and calendar, and deploy them on isolated, secure infrastructure.",
    details: ["Connect integrations", "Train on your knowledge base", "Deploy to secure infrastructure"],
  },
  {
    step: "04",
    title: "Test and launch",
    duration: "1-2 days",
    description: "We run comprehensive tests — send test messages, simulate leads, verify all integrations. You review and approve every detail. Then we go live.",
    details: ["End-to-end testing", "Your review and approval", "Go live"],
  },
  {
    step: "05",
    title: "Monitor and optimize",
    duration: "Ongoing",
    description: "You get a branded dashboard showing agent performance in real-time. Monthly reports track ROI. We continuously optimize based on conversation data and your feedback.",
    details: ["Real-time dashboard", "Monthly ROI reports", "Continuous optimization"],
  },
];

export default function ProcessPage() {
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

      {/* Header */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="max-w-2xl opacity-0 animate-fade-up">
            <span className="eyebrow mb-4">Our process</span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-none text-surface-900 mt-4">
              From first call to
              <br />
              live AI agents
            </h1>
            <p className="mt-4 text-base text-surface-500 leading-relaxed max-w-[52ch]">
              Under two weeks. No technical knowledge required from you.
            </p>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <main className="max-w-[1400px] mx-auto px-6 pb-28">
        <div className="max-w-3xl">
          <div className="space-y-6">
            {steps.map((s) => (
              <div key={s.step} className="card-shell group">
                <div className="card-core">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-50 ring-1 ring-surface-100 flex items-center justify-center text-sm font-bold text-surface-400 font-mono transition-all duration-500 ease-spring group-hover:bg-brand-50 group-hover:text-brand-600 group-hover:ring-brand-200">
                      {s.step}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h2 className="text-lg font-extrabold text-surface-900 tracking-tight">{s.title}</h2>
                        <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-[0.15em] bg-surface-50 rounded-full px-2.5 py-0.5 ring-1 ring-surface-100">{s.duration}</span>
                      </div>
                      <p className="text-sm text-surface-500 leading-relaxed max-w-[65ch]">{s.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {s.details.map((d) => (
                          <span key={d} className="inline-flex items-center gap-1.5 text-xs font-medium text-surface-500 bg-surface-50 rounded-full px-3 py-1.5 ring-1 ring-surface-100">
                            <svg className="w-3 h-3 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-3xl mt-16">
          <div className="rounded-4xl bg-surface-950 p-12">
            <h2 className="text-2xl font-extrabold tracking-tighter text-white">Start with a free AI audit</h2>
            <p className="mt-3 text-sm text-white/40 leading-relaxed max-w-md">
              30 minutes. Written roadmap. No commitment.
            </p>
            <a href="/book-audit" className="group inline-flex items-center gap-2 mt-6 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-surface-900 hover:bg-surface-100 transition-all duration-500 ease-spring active:scale-[0.98]">
              Book your free audit
              <span className="w-6 h-6 rounded-full bg-surface-900/10 flex items-center justify-center transition-transform duration-500 ease-spring group-hover:translate-x-0.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </span>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

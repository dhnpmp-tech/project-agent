export default function BookAuditPage() {
  return (
    <div className="min-h-[100dvh] bg-surface-50">
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
        </div>
      </nav>

      <main className="pt-28 pb-28 px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-12 items-start">
            {/* Left — info */}
            <div className="md:col-span-2 md:sticky md:top-28">
              <div className="opacity-0 animate-fade-up">
                <span className="eyebrow mb-4">Free AI audit</span>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter leading-none text-surface-900 mt-4">
                  See what you
                  <br />
                  can automate
                </h1>
                <p className="mt-4 text-sm text-surface-500 leading-relaxed max-w-[44ch]">
                  30 minutes. We map what you can automate, estimate the ROI, and give
                  you a written roadmap. No cost, no commitment.
                </p>

                {/* Steps */}
                <div className="mt-10 space-y-5">
                  <p className="text-[10px] font-bold text-surface-400 uppercase tracking-[0.2em]">What to expect</p>
                  {[
                    { time: "0-10 min", title: "Understand your operations", desc: "We ask about your current workflows, team, and pain points." },
                    { time: "10-20 min", title: "Identify automation opportunities", desc: "We pinpoint which tasks our AI agents can handle." },
                    { time: "20-30 min", title: "Live agent demo", desc: "We show you a working agent relevant to your business." },
                    { time: "Within 24h", title: "Written AI roadmap delivered", desc: "A detailed plan you can use, even if you choose another path." },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-4 group">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-surface-0 ring-1 ring-surface-200 flex items-center justify-center transition-all duration-500 ease-spring group-hover:ring-brand-200 group-hover:bg-brand-50">
                        <span className="text-[10px] font-bold text-surface-400 font-mono group-hover:text-brand-600 transition-colors duration-500">{item.time.split(" ")[0]}</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-surface-900">{item.title}</h3>
                        <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Trust */}
                <div className="mt-10 pt-8 border-t border-surface-200 flex flex-wrap gap-5 text-xs text-surface-400">
                  {["100% free", "30 minutes", "No commitment"].map((t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Calendly embed area */}
            <div className="md:col-span-3 opacity-0 animate-fade-up delay-200">
              <div className="card-shell">
                <div className="card-core !p-0 overflow-hidden min-h-[560px] flex flex-col items-center justify-center text-center">
                  <div className="p-10">
                    <div className="w-14 h-14 rounded-2xl bg-surface-50 ring-1 ring-surface-100 flex items-center justify-center mx-auto mb-6">
                      <svg className="w-6 h-6 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-extrabold text-surface-900 tracking-tight mb-2">Schedule your free audit</h3>
                    <p className="text-sm text-surface-400 max-w-sm mx-auto leading-relaxed">
                      Pick a time that works for you. We will send a calendar invite with a video call link.
                    </p>
                    <div className="mt-8 w-full max-w-md mx-auto bg-surface-50 rounded-2xl ring-1 ring-dashed ring-surface-200 p-10">
                      <p className="text-xs text-surface-300 font-medium">
                        Calendly widget will be embedded here
                      </p>
                      <p className="text-[10px] text-surface-200 mt-2 font-mono">
                        calendly-inline-widget
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

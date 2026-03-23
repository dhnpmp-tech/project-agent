export default function BookAuditPage() {
  return (
    <div className="min-h-screen bg-gray-50">
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
        </div>
      </nav>

      <main className="pt-28 pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-5 gap-12">
            {/* Left column — info */}
            <div className="md:col-span-2">
              <span className="section-label mb-4">Free AI Audit</span>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-4 tracking-tight">
                See What You Can <span className="gradient-text">Automate</span>
              </h1>
              <p className="mt-4 text-gray-500 leading-relaxed">
                30 minutes. We map what you can automate, estimate the ROI, and give
                you a written roadmap. No cost, no commitment.
              </p>

              {/* What to expect */}
              <div className="mt-10 space-y-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">What to expect</p>
                {[
                  {
                    time: "0-10 min",
                    title: "Understand your operations",
                    desc: "We ask about your current workflows, team, and pain points.",
                    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
                  },
                  {
                    time: "10-20 min",
                    title: "Identify automation opportunities",
                    desc: "We pinpoint which tasks our AI agents can handle.",
                    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
                  },
                  {
                    time: "20-30 min",
                    title: "Live agent demo",
                    desc: "We show you a working agent relevant to your business.",
                    icon: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
                  },
                  {
                    time: "Within 24h",
                    title: "Written AI roadmap delivered",
                    desc: "A detailed plan you can use — even if you don't work with us.",
                    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                      <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-sm">{item.title}</h3>
                        <span className="text-[10px] font-medium text-brand-600 bg-brand-50 rounded-full px-2 py-0.5">{item.time}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trust signals */}
              <div className="mt-10 pt-8 border-t border-gray-200">
                <div className="flex items-center gap-6 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    100% free
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    30 minutes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    No commitment
                  </span>
                </div>
              </div>
            </div>

            {/* Right column — Calendly embed */}
            <div className="md:col-span-3">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden">
                <div className="p-8 md:p-10 text-center min-h-[500px] flex flex-col items-center justify-center">
                  {/* Placeholder for Calendly */}
                  <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Schedule Your Free Audit</h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-sm">
                    Pick a time that works for you. We&apos;ll send a calendar invite with a video call link.
                  </p>
                  <div className="w-full max-w-md bg-gray-50 rounded-xl border border-dashed border-gray-300 p-8">
                    <p className="text-xs text-gray-400 font-medium">
                      Calendly widget will be embedded here
                    </p>
                    <p className="text-[10px] text-gray-300 mt-2 font-mono">
                      Replace with: calendly-inline-widget
                    </p>
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

export default function ProcessPage() {
  const steps = [
    {
      step: "1",
      title: "Free AI Audit",
      duration: "30 minutes",
      description:
        "We map your business operations and identify exactly which tasks can be automated. You get a written roadmap — usable even if you don't work with us.",
    },
    {
      step: "2",
      title: "Agent Selection & Customization",
      duration: "1-2 days",
      description:
        "Based on the audit, we select the right agents for your business. You fill a simple intake form (20 minutes) with your business FAQ, brand voice, and integration details.",
    },
    {
      step: "3",
      title: "Build & Deploy",
      duration: "5-10 days",
      description:
        "We configure your agents with your business knowledge, connect them to your WhatsApp, CRM, and calendar, and deploy them on isolated, secure infrastructure.",
    },
    {
      step: "4",
      title: "Test & Launch",
      duration: "1-2 days",
      description:
        "We run comprehensive tests — send test messages, simulate leads, verify all integrations. You review and approve. Then we go live.",
    },
    {
      step: "5",
      title: "Monitor & Optimize",
      duration: "Ongoing",
      description:
        "You get a branded dashboard showing agent performance in real-time. Monthly reports track ROI. We continuously optimize based on conversation data and your feedback.",
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

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h1>
        <p className="text-lg text-gray-600 mb-12">
          From first call to live AI agents in under 2 weeks. No technical
          knowledge required from you.
        </p>

        <div className="space-y-8">
          {steps.map((s) => (
            <div key={s.step} className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-lg">
                {s.step}
              </div>
              <div>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-xl font-bold text-gray-900">{s.title}</h2>
                  <span className="text-xs text-gray-400">{s.duration}</span>
                </div>
                <p className="mt-2 text-gray-600">{s.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <a
            href="/book-audit"
            className="inline-block rounded-md bg-brand-600 px-8 py-3 text-white font-semibold hover:bg-brand-700"
          >
            Start with a Free AI Audit
          </a>
        </div>
      </main>
    </div>
  );
}

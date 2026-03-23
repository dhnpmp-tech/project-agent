export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold text-brand-900">
            AI Agent Systems
          </span>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="/services" className="text-gray-600 hover:text-gray-900">
              Services
            </a>
            <a href="/process" className="text-gray-600 hover:text-gray-900">
              Process
            </a>
            <a href="/case-study" className="text-gray-600 hover:text-gray-900">
              Case Study
            </a>
            <a
              href="/book-audit"
              className="rounded-md bg-brand-600 px-4 py-2 text-white font-medium hover:bg-brand-700"
            >
              Book Free AI Audit
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            AI Agents That Run Your Business
            <br />
            <span className="text-brand-600">24/7, in Arabic & English</span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
            We build and deploy AI agent systems for SMBs in the UAE and Saudi
            Arabia. WhatsApp customer service, sales automation, content
            creation, HR screening, and financial intelligence — fully managed.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/book-audit"
              className="rounded-md bg-brand-600 px-8 py-3 text-white font-semibold hover:bg-brand-700 transition-colors"
            >
              Book a Free AI Audit
            </a>
            <a
              href="/services"
              className="rounded-md border border-gray-300 px-8 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              See Our Services
            </a>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="bg-gray-50 px-6 py-8 border-y border-gray-100">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-gray-500 mb-4">
            Powered by industry-leading AI
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-gray-400 text-sm font-medium">
            <span>Claude AI (Anthropic)</span>
            <span>WhatsApp Business API</span>
            <span>HubSpot</span>
            <span>Calendly</span>
            <span>MiniMax M27</span>
          </div>
        </div>
      </section>

      {/* Agent Cards */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            5 AI Agents. One Integrated System.
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "WhatsApp Intelligence Agent",
                desc: "Handle 400+ customer inquiries/month automatically. Arabic + English. 24/7.",
                metric: "65-80% support load reduction",
              },
              {
                title: "AI Sales Rep (SDR)",
                desc: "Score leads, send personalized outreach, qualify prospects, book meetings.",
                metric: "70-80% lower cost per qualified meeting",
              },
              {
                title: "Content Engine",
                desc: "LinkedIn, Instagram, TikTok content generated and scheduled weekly. Including video.",
                metric: "From 30 min to under 2 min per post",
              },
              {
                title: "HR Screening Agent",
                desc: "Parse CVs, score candidates, send communications, book interviews.",
                metric: "10-15 hours saved per hiring cycle",
              },
              {
                title: "Financial Intelligence",
                desc: "Transaction categorization, anomaly detection, weekly reports delivered.",
                metric: "12 hours/month returned to owner",
              },
            ].map((agent) => (
              <div
                key={agent.title}
                className="rounded-lg border border-gray-200 p-6 hover:border-brand-300 hover:shadow-sm transition-all"
              >
                <h3 className="font-semibold text-gray-900">{agent.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{agent.desc}</p>
                <p className="mt-4 text-xs font-medium text-brand-600">
                  {agent.metric}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 px-6 py-16 border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Simple Pricing
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                tier: "Starter",
                price: "AED 1,500",
                period: "/month",
                setup: "AED 2,999 setup",
                features: [
                  "1 AI agent (WhatsApp or Content)",
                  "Arabic + English",
                  "24/7 operation",
                  "Monthly performance report",
                  "Email support",
                ],
              },
              {
                tier: "Professional",
                price: "AED 8,000",
                period: "/month",
                setup: "AED 15,000 setup",
                features: [
                  "3-5 AI agents",
                  "Full CRM integration",
                  "Custom knowledge base",
                  "Weekly reports",
                  "Priority support",
                  "Client dashboard",
                ],
                popular: true,
              },
              {
                tier: "Enterprise",
                price: "AED 30,000+",
                period: "/month",
                setup: "Custom setup",
                features: [
                  "Full agent deployment",
                  "Dedicated infrastructure",
                  "UAE data residency",
                  "Custom integrations",
                  "SLA guarantee",
                  "Dedicated account manager",
                ],
              },
            ].map((plan) => (
              <div
                key={plan.tier}
                className={`rounded-lg border p-6 ${
                  plan.popular
                    ? "border-brand-500 ring-2 ring-brand-100"
                    : "border-gray-200"
                }`}
              >
                {plan.popular && (
                  <span className="text-xs font-semibold text-brand-600 uppercase">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold text-gray-900 mt-1">
                  {plan.tier}
                </h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{plan.setup}</p>
                <ul className="mt-6 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-gray-600 flex gap-2">
                      <span className="text-green-500">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="/book-audit"
                  className="mt-6 block text-center rounded-md bg-brand-600 px-4 py-2 text-white text-sm font-medium hover:bg-brand-700"
                >
                  Book Free Audit
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900">
            Ready to automate?
          </h2>
          <p className="mt-4 text-gray-600">
            Book a free 30-minute AI Audit. We&apos;ll map exactly what you can
            automate and estimate the time and cost savings. No commitment.
          </p>
          <a
            href="/book-audit"
            className="mt-8 inline-block rounded-md bg-brand-600 px-8 py-3 text-white font-semibold hover:bg-brand-700"
          >
            Book Your Free AI Audit
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} AI Agent Systems. Dubai, UAE.</p>
      </footer>
    </div>
  );
}

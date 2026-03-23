export default function BookAuditPage() {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-brand-900">
            AI Agent Systems
          </a>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Book Your Free AI Audit
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          30 minutes. We map what you can automate, estimate the ROI, and give
          you a written roadmap. No cost, no commitment.
        </p>

        {/* Calendly embed placeholder */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12">
          <p className="text-gray-500 mb-4">
            Calendly booking widget will be embedded here.
          </p>
          <p className="text-sm text-gray-400">
            Replace this with:{" "}
            <code className="bg-gray-100 px-2 py-1 rounded">
              {
                '<div class="calendly-inline-widget" data-url="https://calendly.com/YOUR_LINK" style="min-width:320px;height:630px;"></div>'
              }
            </code>
          </p>
        </div>

        <div className="mt-12 text-left max-w-xl mx-auto">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            What to expect:
          </h2>
          <ul className="space-y-3 text-gray-600">
            <li className="flex gap-2">
              <span className="text-brand-600 font-bold">1.</span>
              We ask about your current operations (10 min)
            </li>
            <li className="flex gap-2">
              <span className="text-brand-600 font-bold">2.</span>
              We identify automation opportunities (10 min)
            </li>
            <li className="flex gap-2">
              <span className="text-brand-600 font-bold">3.</span>
              We show you a live agent demo relevant to your business (10 min)
            </li>
            <li className="flex gap-2">
              <span className="text-brand-600 font-bold">4.</span>
              You receive a written AI roadmap within 24 hours
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}

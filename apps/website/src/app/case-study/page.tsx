export default function CaseStudyPage() {
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
        <span className="text-sm font-medium text-brand-600 uppercase">
          Case Study
        </span>
        <h1 className="text-4xl font-bold text-gray-900 mt-2 mb-4">
          How a Dubai Real Estate Agency Automated 380 Monthly Inquiries
        </h1>
        <p className="text-gray-500 mb-12">
          Real estate | Dubai, UAE | 3 agents deployed | 11 days to launch
        </p>

        <div className="prose prose-gray max-w-none">
          <h2>The Challenge</h2>
          <p>
            A growing real estate agency in Dubai Marina was receiving 400+
            WhatsApp inquiries per month from prospective buyers and tenants.
            With a team of 5, the owner was spending 15+ hours per week just
            responding to initial messages — many of which were repetitive
            questions about pricing, availability, and viewing schedules.
          </p>
          <p>
            Leads were falling through the cracks. Follow-ups were inconsistent.
            The team had no time for content creation, and their social media had
            gone quiet.
          </p>

          <h2>The Solution</h2>
          <p>We deployed three AI agents:</p>
          <ol>
            <li>
              <strong>WhatsApp Intelligence Agent</strong> — handles all inbound
              inquiries in Arabic and English, provides property information,
              qualifies buyers, and books site visits via Calendly.
            </li>
            <li>
              <strong>AI Sales Development Representative</strong> — scores
              incoming leads against ICP criteria, sends personalized follow-up
              sequences, and books qualified meetings with senior agents.
            </li>
            <li>
              <strong>Content Engine Agent</strong> — generates and publishes 5
              posts/week across LinkedIn and Instagram, including property
              showcases and market insights.
            </li>
          </ol>

          <h2>The Results (30 Days)</h2>
          <div className="not-prose grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
            {[
              { metric: "380", label: "Inquiries handled automatically" },
              { metric: "19h", label: "Owner hours saved per week" },
              { metric: "0", label: "Additional staff hired" },
              { metric: "11", label: "Days from start to live" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-brand-50 rounded-lg p-4 text-center"
              >
                <p className="text-3xl font-bold text-brand-700">
                  {stat.metric}
                </p>
                <p className="text-xs text-gray-600 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          <h2>What the Owner Said</h2>
          <blockquote>
            &ldquo;I was skeptical about AI handling our customer conversations
            — our clients expect a personal touch. But the WhatsApp agent sounds
            like one of our best agents. It handles the Arabic conversations
            perfectly. I got my weekends back.&rdquo;
          </blockquote>

          <div className="mt-12 text-center not-prose">
            <a
              href="/book-audit"
              className="inline-block rounded-md bg-brand-600 px-8 py-3 text-white font-semibold hover:bg-brand-700"
            >
              Get Results Like This — Book Your Free Audit
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { FadeUp, StaggerList, StaggerItem } from "@/components/motion";
import { motion } from "framer-motion";

/*
 * AGENT-READABLE METADATA
 * page_type: integration_setup_guide
 * supported_integrations: sevenrooms, hubspot, google_calendar, google_sheets, gmail, stripe, zoho_crm, zoho_books, tabby, tamara, fresha, foodics
 * regions: UAE, Saudi Arabia, GCC
 * last_updated: 2026-03-31
 */

const categories = [
  {
    id: "reservations",
    title: "Restaurant Reservations",
    description: "Connect your reservation system so your AI agent can check availability, create bookings, and manage guest profiles in real time.",
    color: "emerald",
    integrations: [
      {
        name: "SevenRooms",
        id: "sevenrooms",
        description: "The standard for premium restaurants across UAE and Saudi Arabia. Used by Jumeirah Group, Nobu, CZN Burak, and 70+ venues across the region.",
        what_it_enables: [
          "AI checks real-time table availability",
          "Customer says 'book a table for 4 tonight' — reservation created instantly",
          "Guest profiles sync automatically (dietary preferences, VIP status, visit history)",
          "Cancellations and modifications handled via WhatsApp",
        ],
        setup_steps: [
          "Log in to your SevenRooms dashboard",
          "Go to Settings then API & Integrations",
          "Request API access or contact your SevenRooms account manager",
          "You will receive a Client ID and Client Secret",
          "Share both credentials with us securely during onboarding",
          "We configure the venue_id mapping and test the connection",
        ],
        credentials_needed: ["Client ID", "Client Secret", "Venue ID"],
        api_docs: "https://api-docs.sevenrooms.com",
        contact: "api-integration-support@sevenrooms.com",
        pricing: "Included in your SevenRooms subscription. API access may require partner approval.",
      },
      {
        name: "Eat App",
        id: "eatapp",
        description: "Born in Dubai. Popular across mid-range to upscale restaurants. Direct integrations with TripAdvisor, Google, and Zomato.",
        what_it_enables: [
          "Real-time availability checks via WhatsApp",
          "Instant reservation creation from customer conversations",
          "Guest history and preferences available to your AI agent",
        ],
        setup_steps: [
          "Log in to your Eat App dashboard at restaurant.eatapp.co",
          "Navigate to Settings then Integrations",
          "Generate an API key",
          "Share the API key with us during onboarding",
        ],
        credentials_needed: ["API Key", "Restaurant ID"],
        api_docs: "https://eatapp.co/integrations",
        pricing: "Starting at $99/month. API access included in all plans.",
      },
    ],
  },
  {
    id: "pos",
    title: "Point of Sale (POS)",
    description: "Connect your POS so your AI agent can access menu data, process orders, and track inventory.",
    color: "amber",
    integrations: [
      {
        name: "Foodics",
        id: "foodics",
        description: "The dominant POS system in UAE and Saudi Arabia. 30,000+ restaurants. Founded in Riyadh.",
        what_it_enables: [
          "Real-time menu and pricing pulled from your POS",
          "Orders placed via WhatsApp flow directly into your kitchen",
          "Inventory tracking — AI knows when items are out of stock",
          "Daily sales reports delivered to owner via WhatsApp",
        ],
        setup_steps: [
          "Log in to your Foodics dashboard at console.foodics.com",
          "Go to Settings then Integrations then API",
          "Create a new API application",
          "Copy the API Key and Secret",
          "Share both credentials with us during onboarding",
        ],
        credentials_needed: ["API Key", "API Secret", "Business ID"],
        api_docs: "https://docs.foodics.com",
        pricing: "API access included in Foodics Growth plan and above.",
      },
    ],
  },
  {
    id: "crm",
    title: "CRM (Customer Relationship Management)",
    description: "Connect your CRM so every customer interaction, lead score, and deal update flows automatically between your AI agents and your sales pipeline.",
    color: "sky",
    integrations: [
      {
        name: "HubSpot",
        id: "hubspot",
        description: "Free CRM with powerful marketing automation. Popular with UAE startups and growing teams.",
        what_it_enables: [
          "Every WhatsApp lead automatically added to your CRM",
          "Lead scores updated based on AI conversation analysis",
          "Deal pipeline stages synced with customer interactions",
          "Contact properties enriched with preferences, history, and sentiment",
        ],
        setup_steps: [
          "Sign up or log in at app.hubspot.com",
          "During our onboarding, click the Connect HubSpot button",
          "Authorize access via the OAuth popup (takes 10 seconds)",
          "Done — no API keys to copy, connection is automatic",
        ],
        credentials_needed: ["OAuth authorization (one-click connect)"],
        api_docs: "https://developers.hubspot.com",
        pricing: "Free CRM with unlimited users. Marketing Hub starts at $15/month.",
      },
      {
        name: "Zoho CRM",
        id: "zoho_crm",
        description: "The most widely adopted CRM among UAE small businesses. Arabic and English interface. Part of the Zoho ecosystem.",
        what_it_enables: [
          "Contacts and leads synced from WhatsApp conversations",
          "Deal stages updated as your AI qualifies leads",
          "Activity timeline shows every customer touchpoint",
          "Works with Zoho Books, Zoho Invoice, and Zoho Desk",
        ],
        setup_steps: [
          "Log in to your Zoho CRM at crm.zoho.com",
          "During our onboarding, click the Connect Zoho button",
          "Authorize access via the OAuth popup",
          "Select which modules to sync (Contacts, Leads, Deals)",
        ],
        credentials_needed: ["OAuth authorization (one-click connect)"],
        api_docs: "https://www.zoho.com/crm/developer/docs/api/v5/",
        pricing: "Free for 3 users. Standard plan at $14/user/month.",
      },
    ],
  },
  {
    id: "calendar",
    title: "Calendar and Scheduling",
    description: "Connect your calendar so your AI agent can book appointments, check availability, and send reminders — all from WhatsApp.",
    color: "violet",
    integrations: [
      {
        name: "Google Calendar",
        id: "google_calendar",
        description: "The default calendar for most businesses. Connects seamlessly with Gmail and Google Workspace.",
        what_it_enables: [
          "Customer asks for an appointment — AI checks your real availability",
          "Bookings created with automatic Google Meet links",
          "Reminders sent via WhatsApp before the appointment",
          "Cancellations and reschedules handled conversationally",
        ],
        setup_steps: [
          "During our onboarding, click the Connect Google Calendar button",
          "Sign in with your Google account",
          "Select which calendar to use for bookings",
          "Done — your AI agent can now read and write to your calendar",
        ],
        credentials_needed: ["Google account (OAuth authorization)"],
        api_docs: "https://developers.google.com/calendar",
        pricing: "Free with any Google account.",
      },
      {
        name: "Google Sheets",
        id: "google_sheets",
        description: "Use spreadsheets as a lightweight database for orders, inventory, or custom tracking.",
        what_it_enables: [
          "Orders logged to a Google Sheet in real time",
          "Inventory tracked and updated from WhatsApp commands",
          "Custom reports and dashboards built from live data",
        ],
        setup_steps: [
          "Create or select a Google Sheet for your data",
          "During onboarding, connect your Google account",
          "Tell us which sheet and columns to use",
        ],
        credentials_needed: ["Google account (OAuth authorization)"],
        pricing: "Free with any Google account.",
      },
    ],
  },
  {
    id: "payments",
    title: "Payments and BNPL",
    description: "Let your AI agent send payment links and Buy Now Pay Later options directly in WhatsApp. Customer pays without leaving the chat.",
    color: "rose",
    integrations: [
      {
        name: "Stripe",
        id: "stripe",
        description: "The global standard for online payments. Available in UAE with full AED support.",
        what_it_enables: [
          "AI sends a payment link in the WhatsApp conversation",
          "Customer pays with card — no app download, no redirect",
          "Automatic receipt and confirmation via WhatsApp",
          "Recurring payments and subscriptions supported",
        ],
        setup_steps: [
          "Sign up or log in at dashboard.stripe.com",
          "During onboarding, connect your Stripe account via OAuth",
          "Select your default currency (AED, SAR, USD)",
          "Test with a small payment to verify the flow",
        ],
        credentials_needed: ["Stripe account (OAuth authorization)"],
        api_docs: "https://stripe.com/docs/api",
        pricing: "2.9% + AED 1 per transaction. No monthly fee.",
      },
      {
        name: "Tabby",
        id: "tabby",
        description: "The leading Buy Now Pay Later platform in the UAE and GCC. Split payments into 4 interest-free installments.",
        what_it_enables: [
          "Customer says 'can I pay in installments?' — AI sends a Tabby link",
          "Payment split into 4 equal parts over 6 weeks, interest-free",
          "AI confirms payment status and sends order confirmation",
          "Works for orders from AED 50 to AED 5,000",
        ],
        setup_steps: [
          "Apply for a Tabby merchant account at tabby.ai/business",
          "After approval, log in to merchant.tabby.ai",
          "Go to Settings then API Keys",
          "Copy your Secret Key (starts with sk_)",
          "Share the Secret Key and Merchant Code with us during onboarding",
        ],
        credentials_needed: ["Secret Key (sk_...)", "Merchant Code"],
        api_docs: "https://docs.tabby.ai",
        pricing: "Merchant pays 4-6% commission per transaction. Free for customers.",
      },
      {
        name: "Tamara",
        id: "tamara",
        description: "The leading Buy Now Pay Later platform in Saudi Arabia. Split into 3 installments or pay in 30 days.",
        what_it_enables: [
          "Customers in KSA can split payments into 3 monthly installments",
          "AI sends Tamara checkout link in WhatsApp",
          "Pay-in-30 option for full payment deferred by one month",
          "Works for orders from SAR 50 to SAR 5,000",
        ],
        setup_steps: [
          "Apply for a Tamara merchant account at tamara.co",
          "After approval, log in to partners.tamara.co",
          "Navigate to API settings and copy your API Token",
          "Share the API Token with us during onboarding",
          "We configure sandbox testing first, then go live",
        ],
        credentials_needed: ["API Token"],
        api_docs: "https://docs.tamara.co",
        pricing: "Merchant pays commission per transaction. Free for customers.",
      },
    ],
  },
  {
    id: "salon",
    title: "Salon and Spa Booking",
    description: "Connect your booking system so your AI agent handles appointments, reminders, and client preferences.",
    color: "pink",
    integrations: [
      {
        name: "Fresha",
        id: "fresha",
        description: "The world's largest salon booking platform. Free to use. 5,000+ salons in Dubai alone.",
        what_it_enables: [
          "Customers book appointments via WhatsApp",
          "AI checks stylist availability in real time",
          "Automatic reminders sent before appointments",
          "Client preferences and history tracked across visits",
        ],
        setup_steps: [
          "Sign up or log in at fresha.com/for-business",
          "Go to Settings then Integrations",
          "Contact Fresha support to request API access for your business",
          "Share the provided credentials with us during onboarding",
        ],
        credentials_needed: ["API credentials (via Fresha support)"],
        api_docs: "https://fresha.com/for-business",
        pricing: "Free platform. No monthly subscription.",
      },
    ],
  },
  {
    id: "accounting",
    title: "Accounting and Invoicing",
    description: "Connect your accounting software so your AI agent can track revenue, send invoices, and flag financial anomalies.",
    color: "orange",
    integrations: [
      {
        name: "Zoho Books",
        id: "zoho_books",
        description: "FTA-approved accounting software. UAE VAT and corporate tax compliant. Part of the Zoho ecosystem.",
        what_it_enables: [
          "Invoices auto-generated from WhatsApp orders",
          "VAT calculations handled automatically (5% UAE rate)",
          "Weekly financial summaries delivered to owner via WhatsApp",
          "Expense tracking and anomaly detection",
        ],
        setup_steps: [
          "Log in to Zoho Books at books.zoho.com",
          "During onboarding, connect via the OAuth popup",
          "Select your organization and fiscal year",
        ],
        credentials_needed: ["Zoho account (OAuth authorization)"],
        api_docs: "https://www.zoho.com/books/api/v3/",
        pricing: "Free plan available. Standard at $15/month.",
      },
    ],
  },
  {
    id: "email",
    title: "Email",
    description: "Let your AI agents send emails — booking confirmations, follow-ups, marketing campaigns.",
    color: "zinc",
    integrations: [
      {
        name: "Gmail",
        id: "gmail",
        description: "Send emails from your business Gmail account. Booking confirmations, follow-ups, and reports.",
        what_it_enables: [
          "Booking confirmation emails sent automatically",
          "Follow-up emails after customer interactions",
          "Weekly reports emailed to owner",
        ],
        setup_steps: [
          "During onboarding, click Connect Gmail",
          "Sign in with your Google Workspace or personal Gmail account",
          "Authorize email sending permissions",
        ],
        credentials_needed: ["Google account (OAuth authorization)"],
        pricing: "Free with any Google account.",
      },
    ],
  },
];

const colorMap: Record<string, { badge: string; dot: string; border: string; heading: string }> = {
  emerald: { badge: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20", dot: "bg-emerald-400", border: "border-emerald-500/20", heading: "text-emerald-400" },
  amber: { badge: "bg-amber-500/10 text-amber-400 ring-amber-500/20", dot: "bg-amber-400", border: "border-amber-500/20", heading: "text-amber-400" },
  sky: { badge: "bg-sky-500/10 text-sky-400 ring-sky-500/20", dot: "bg-sky-400", border: "border-sky-500/20", heading: "text-sky-400" },
  violet: { badge: "bg-violet-500/10 text-violet-400 ring-violet-500/20", dot: "bg-violet-400", border: "border-violet-500/20", heading: "text-violet-400" },
  rose: { badge: "bg-rose-500/10 text-rose-400 ring-rose-500/20", dot: "bg-rose-400", border: "border-rose-500/20", heading: "text-rose-400" },
  pink: { badge: "bg-pink-500/10 text-pink-400 ring-pink-500/20", dot: "bg-pink-400", border: "border-pink-500/20", heading: "text-pink-400" },
  orange: { badge: "bg-orange-500/10 text-orange-400 ring-orange-500/20", dot: "bg-orange-400", border: "border-orange-500/20", heading: "text-orange-400" },
  zinc: { badge: "bg-white/[0.06] text-white/50 ring-white/[0.08]", dot: "bg-white/40", border: "border-white/[0.08]", heading: "text-white/60" },
};

export default function IntegrationsPage() {
  return (
    <div className="min-h-[100dvh] bg-surface-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-4 pt-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between bg-surface-950/70 backdrop-blur-2xl rounded-full px-6 py-3 ring-1 ring-white/[0.06] shadow-[0_2px_24px_rgba(0,0,0,0.3)]">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2L2 5.5l6 3.5 6-3.5L8 2zM2 10.5l6 3.5 6-3.5M2 8l6 3.5 6-3.5" />
              </svg>
            </div>
            <span className="text-[15px] font-bold text-white tracking-tight">AI Agent Systems</span>
          </a>
          <div className="hidden md:flex items-center gap-7 text-[13px] font-medium text-white/40">
            <a href="/services/" className="hover:text-white transition-colors duration-300">Services</a>
            <a href="/pricing/" className="hover:text-white transition-colors duration-300">Pricing</a>
            <a href="/process/" className="hover:text-white transition-colors duration-300">Process</a>
            <a href="/case-study/" className="hover:text-white transition-colors duration-300">Case study</a>
            <a href="/integrations/" className="text-white transition-colors duration-300">Integrations</a>
            <a href="/book-audit/" className="group inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-[13px] font-semibold text-white transition-all duration-300 active:scale-[0.97] shadow-[0_0_20px_rgba(16,185,129,0.25)]">
              Book free audit
              <svg className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </a>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-16 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-surface-950 to-surface-950" />
        <div className="max-w-[1400px] mx-auto relative z-10">
          <FadeUp>
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Integrations
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-none mt-4">
                Connect the tools
                <br />
                <span className="text-white/40">
                  you already use
                </span>
              </h1>
              <p className="mt-4 text-base text-white/50 leading-relaxed max-w-[52ch]">
                Your AI agents plug into the software your business runs on. Reservations, CRM, payments, calendars, accounting — connected in minutes, not months.
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Quick links */}
      <section className="px-6 pb-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const c = colorMap[cat.color] || colorMap.zinc;
              return (
                <a
                  key={cat.id}
                  href={`#${cat.id}`}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ring-1 transition-all duration-300 hover:opacity-80",
                    c.badge
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
                  {cat.title}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Integration categories */}
      <main className="max-w-[1400px] mx-auto px-6 pb-28">
        <StaggerList className="space-y-16">
          {categories.map((cat) => {
            const c = colorMap[cat.color] || colorMap.zinc;
            return (
              <StaggerItem key={cat.id}>
                <section id={cat.id} className="scroll-mt-24">
                  {/* Category header */}
                  <div className="mb-6">
                    <h2 className={cn("text-2xl md:text-3xl font-extrabold tracking-tighter", c.heading)}>
                      {cat.title}
                    </h2>
                    <p className="mt-2 text-sm text-white/40 leading-relaxed max-w-[65ch]">
                      {cat.description}
                    </p>
                  </div>

                  {/* Integration cards */}
                  <div className="space-y-4">
                    {cat.integrations.map((integration) => (
                      <motion.div
                        key={integration.id}
                        className={cn(
                          "rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] overflow-hidden transition-all duration-500",
                          "hover:bg-white/[0.05] hover:ring-white/[0.08]"
                        )}
                        whileHover={{ x: 4 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      >
                        {/* Integration header */}
                        <div className="p-6 pb-4">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={cn("w-2.5 h-2.5 rounded-full", c.dot)} />
                            <h3 className="text-lg font-bold tracking-tight">{integration.name}</h3>
                          </div>
                          <p className="text-sm text-white/50 leading-relaxed max-w-[65ch]">
                            {integration.description}
                          </p>
                        </div>

                        {/* What it enables */}
                        <div className="px-6 pb-4">
                          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/20 mb-2">
                            What your AI agent can do
                          </p>
                          <ul className="space-y-1.5">
                            {integration.what_it_enables.map((item) => (
                              <li key={item} className="flex gap-2 text-sm text-white/40">
                                <svg className={cn("w-4 h-4 flex-shrink-0 mt-0.5", c.heading)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Setup steps */}
                        <div className={cn("px-6 py-4 border-t", c.border, "border-opacity-20 border-white/[0.04]")}>
                          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/20 mb-3">
                            Setup steps
                          </p>
                          <ol className="space-y-2">
                            {integration.setup_steps.map((step, i) => (
                              <li key={i} className="flex gap-3 text-sm text-white/40">
                                <span className={cn("flex-shrink-0 w-5 h-5 rounded-md bg-white/[0.06] flex items-center justify-center text-[10px] font-bold font-mono text-white/30")}>
                                  {i + 1}
                                </span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Credentials + links */}
                        <div className="px-6 py-4 bg-white/[0.02] flex flex-wrap gap-x-8 gap-y-2 text-xs text-white/30">
                          <div>
                            <span className="font-semibold text-white/40">You provide: </span>
                            {integration.credentials_needed.join(", ")}
                          </div>
                          {integration.api_docs && (
                            <a href={integration.api_docs} target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors underline underline-offset-2">
                              API docs
                            </a>
                          )}
                          {integration.pricing && (
                            <div>
                              <span className="font-semibold text-white/40">Cost: </span>
                              {integration.pricing}
                            </div>
                          )}
                          {"contact" in integration && integration.contact && (
                            <div>
                              <span className="font-semibold text-white/40">Contact: </span>
                              {integration.contact}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              </StaggerItem>
            );
          })}
        </StaggerList>

        {/* CTA */}
        <div className="mt-20">
          <FadeUp>
            <div className="relative rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-surface-900 to-violet-500/10" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.06] rounded-3xl" />
              <div className="relative p-12 md:p-16">
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tighter">
                  Not sure which integrations you need?
                </h2>
                <p className="mt-3 text-sm text-white/40 leading-relaxed max-w-md">
                  Book a free 30-minute audit. We map your current tools and show you exactly what to connect.
                </p>
                <a href="/book-audit/" className="group inline-flex items-center gap-3 mt-6 rounded-full bg-emerald-600 hover:bg-emerald-500 px-8 py-4 text-sm font-semibold text-white transition-all duration-500 active:scale-[0.97] shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  Book your free audit
                  <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-500 group-hover:translate-x-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </span>
                </a>
              </div>
            </div>
          </FadeUp>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-12">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2L2 5.5l6 3.5 6-3.5L8 2zM2 10.5l6 3.5 6-3.5M2 8l6 3.5 6-3.5" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-white/40">AI Agent Systems</span>
          </div>
          <div className="flex items-center gap-8 text-xs text-white/30 font-medium">
            <a href="/services/" className="hover:text-white/50 transition-colors duration-300">Services</a>
            <a href="/pricing/" className="hover:text-white/50 transition-colors duration-300">Pricing</a>
            <a href="/process/" className="hover:text-white/50 transition-colors duration-300">Process</a>
            <a href="/case-study/" className="hover:text-white/50 transition-colors duration-300">Case study</a>
            <a href="/integrations/" className="text-white/50">Integrations</a>
            <a href="/book-audit/" className="hover:text-white/50 transition-colors duration-300">Book audit</a>
          </div>
          <p className="text-xs text-white/20">&copy; {new Date().getFullYear()} AI Agent Systems. Dubai, UAE.</p>
        </div>
      </footer>
    </div>
  );
}

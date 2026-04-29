// Pricing tiers + currency rates. Mirrors /tmp/dcp-design/assets/data.js
// (tiers + rates blocks). Single source of truth for the /pricing page.

export type TierId = "starter" | "growth" | "pro" | "enterprise";

export interface Tier {
  id: TierId;
  name: string;
  sub: string;
  monthly_aed: number;
  setup_aed: number;
  popular: boolean;
  includes: string[];
}

export const TIERS: Tier[] = [
  {
    id: "starter",
    name: "Starter",
    sub: "For solopreneurs",
    monthly_aed: 1500,
    setup_aed: 3000,
    popular: false,
    includes: [
      "1 WhatsApp AI agent with custom persona",
      "Owner Brain — morning briefs + commands",
      "Sales Rep — lead scoring + pipeline",
      "Arabic + English auto-detection",
      "Customer memory across conversations",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    sub: "Most popular",
    monthly_aed: 3000,
    setup_aed: 3000,
    popular: true,
    includes: [
      "Everything in Starter",
      "Content Engine — social on autopilot",
      "Loyalty program management",
      "Google Business Profile optimization",
      "Calendar and CRM integration",
      "Multi-channel content generation",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    sub: "For growing teams",
    monthly_aed: 5000,
    setup_aed: 3000,
    popular: false,
    includes: [
      "Everything in Growth",
      "AI image prompt generator",
      "Conversion tracking and attribution",
      "Priority support — under 2h response",
      "Voice message AI responses",
      "Custom workflow automations",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    sub: "For scaling operations",
    monthly_aed: 8000,
    setup_aed: 3000,
    popular: false,
    includes: [
      "Everything, unlimited",
      "Custom integrations and API access",
      "UAE data residency option",
      "Dedicated account manager",
      "SLA guarantee",
      "White-label available",
    ],
  },
];

export const RATES = { aed_to_sar: 1.02, aed_to_usd: 0.272 } as const;

export type Currency = "AED" | "SAR" | "USD";

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  AED: "د.إ",
  SAR: "ر.س",
  USD: "$",
};

export function rateFor(cur: Currency): number {
  if (cur === "SAR") return RATES.aed_to_sar;
  if (cur === "USD") return RATES.aed_to_usd;
  return 1;
}

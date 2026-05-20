// Pricing — single offer, no friction.
//
// Lifted from Nick / Greg Isenberg's "$1M solo agent" playbook: skip the
// tiered comparison matrix, sell one plan that bundles everything. The
// magic dies the moment a prospect has to think about tokens, credits,
// agent count, or which tier unlocks what. We charge one price, deliver
// done-for-you, and absorb the operational complexity.
//
// Current top-tier customers (Saffron, Jareed) effectively get this
// today. The page just stops asking them to assemble it from a menu.

export type TierId = "core";

export interface Tier {
  id: TierId;
  name: string;
  sub: string;
  monthly_aed: number;
  setup_aed: number;
  popular: boolean;
  includes: string[];
}

/**
 * THE single offer. Mirrors the Nick playbook (unlimited agents, unlimited
 * usage, infrastructure + monitoring + workflow changes included), priced
 * for the UAE/KSA SMB owner who is comparing us to a full-time hire.
 *
 * Pricing logic:
 *   AED 5,000/mo  · monthly all-inclusive (≈ 1/4 of a single junior hire)
 *   AED 3,500    · one-time setup (Meta verification, KB seeding, persona,
 *                  integration wiring — covers the human work we do up front)
 *   Founding-customer rate (case study + logo + named quote) = AED 2,500/mo.
 *
 * The setup fee is intentional — it filters tire-kickers without raising
 * the recurring number. Nick charges $5K USD/mo because his ICP is mid-
 * market US agencies; ours is UAE/KSA SMBs and the band is different.
 */
export const OFFER: Tier = {
  id: "core",
  name: "Project Agent",
  sub: "Your AI ops team — done for you",
  monthly_aed: 5000,
  setup_aed: 3500,
  popular: true,
  includes: [
    "Unlimited customers, conversations, voice notes",
    "All five agents — WhatsApp, Sales, Content, HR, Financial",
    "Native WhatsApp on your own number — we handle Meta verification",
    "Native Arabic + English, with Gulf-dialect voice notes",
    "Daily 9am owner brief on WhatsApp — text and voice",
    "Customer memory dashboard with VIP, at-risk, and lapsed segmentation",
    "Composio integrations — Foodics, Bayut, Tabby, Tamara, Google, Calendly, more",
    "Dedicated cloud computer per agent — true data isolation",
    "Infrastructure, monitoring, and security upgrades included",
    "Weekly workflow tuning — we adjust the agent as your business changes",
    "Direct line to the founders on WhatsApp",
  ],
};

// Backwards-compat: existing imports of TIERS still resolve to an array
// containing the single offer.
export const TIERS: Tier[] = [OFFER];

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

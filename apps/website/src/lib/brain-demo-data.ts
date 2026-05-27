// Synthetic brain dataset for the /brain visualization.
//
// Built to look like Saffron Kitchen's actual Najim Brain after ~3
// weeks of operation: ~25 customers, the menu, daily bookings, the
// internal vault notes the owner has scribbled to the agent, plus
// the nightly-enrichment insights the Dream Cycle has flagged.
//
// All names + facts are invented. No real customer data.

export type BrainCategory =
  | "customer"   // people the agent has talked to
  | "booking"    // reservations, viewings, orders
  | "knowledge"  // menu items, hours, policies — the public business knowledge
  | "vault"      // internal notes the owner wrote for the agent
  | "fact"       // FAQ entries, parsed once and re-served forever
  | "insight";   // nightly enrichment output — VIP / at-risk / contradiction

export interface BrainNode {
  id: string;
  label: string;
  category: BrainCategory;
  /** When this node was "ingested" (ms since brain start). Drives the
   * staggered entry animation. */
  ingestedAt: number;
  /** Optional tooltip — full text revealed on hover. */
  detail?: string;
}

export interface BrainEdge {
  source: string;
  target: string;
  /** Edge type — drives stroke styling. */
  kind: "knows" | "mentions" | "prefers" | "booked" | "complained" | "wrote";
}

export const CATEGORY_COLORS: Record<BrainCategory, string> = {
  customer: "#d4924b",   // saffron — the warm anchor
  booking: "#7da8d4",    // soft blue
  knowledge: "#5d8a4a",  // green — the public menu
  vault: "#9f87f0",      // purple — internal notes
  fact: "#c3a358",       // yellow — the agent's facts
  insight: "#c47373",    // muted red — Dream Cycle output
};

export const CATEGORY_LABELS: Record<BrainCategory, { en: string; ar: string }> = {
  customer: { en: "Customer memory", ar: "ذاكرة العميل" },
  booking: { en: "Booking events", ar: "أحداث الحجز" },
  knowledge: { en: "Business knowledge", ar: "معرفة العمل" },
  vault: { en: "The vault (owner notes)", ar: "الخزانة (ملاحظات المالك)" },
  fact: { en: "FAQ facts", ar: "حقائق الأسئلة الشائعة" },
  insight: { en: "Dream Cycle insights", ar: "رؤى دورة الحلم" },
};

// ─── Customers ────────────────────────────────────────────────
const CUSTOMERS = [
  "Ahmad Al Mansoori", "Fatima Al Hashimi", "Rashid Al Marri",
  "Mariam Al Suwaidi", "Khalid Al Nuaimi", "Hessa Al Falasi",
  "Omar Sharif", "Layla Karim", "Yousef Al Otaibi",
  "Noura Al Dosari", "Saif Al Hosani", "Aisha Al Mazrouei",
  "Tariq Hussein", "Reem Al Qubaisi", "Faisal Al Ghurair",
  "Sara Khoury", "Bandar Al Saud", "Dana Al Rashid",
  "Adel Khalifa", "Mona Salim", "Hamad Al Thani",
  "Lulu Al Maktoum", "Salem Al Nahyan", "Maya Hadid",
  "Ziad Akkad",
];

// ─── Menu / business knowledge ────────────────────────────────
const MENU = [
  "Lamb Mandi", "Saffron Rice", "Mezze Platter",
  "Hummus & Pita", "Grilled Halloumi", "Lentil Soup",
  "Chicken Mansaf", "Beef Kabsa", "Falafel Wrap",
  "Tabbouleh", "Baba Ghanoush", "Maqluba",
  "Knafeh", "Umm Ali", "Saffron Tea",
  "Karak Chai", "Date Smoothie", "Lemon-Mint",
];
const KNOWLEDGE_FACTS = [
  "Hours: 12pm – 11pm daily",
  "Open during Ramadan iftar to suhoor",
  "Halal certified",
  "Outdoor terrace seats 24",
  "Two private rooms, 8 + 12 seats",
  "Valet parking after 7pm",
];

// ─── Vault notes (internal — what the owner wrote to the agent) ───────
const VAULT = [
  "VIPs get the terrace by default",
  "No tahini for Mariam — allergy",
  "Card payments only — no cash after 10pm",
  "Ahmad calls the manager 'uncle' — be respectful",
  "Don't auto-confirm parties over 6 — call me",
  "Friday brunch is 1pm not noon — adjust hours dynamically",
  "Lamb Mandi sells out by 9pm Thursday-Saturday",
  "Suggest Karak after midnight — always lifts the bill",
];

// ─── FAQ facts (parsed once, served forever) ──────────────────
const FACTS = [
  "Saffron Kitchen has 1 outlet — Dubai Marina",
  "Average dinner spend: AED 180 / head",
  "We don't do delivery — pickup only",
  "Children allowed; no high chairs",
  "Live oud music Thursday & Saturday",
  "Founder: Chef Yousef Al-Sabbagh, since 2019",
];

// ─── Dream Cycle insights ────────────────────────────────────
const INSIGHTS = [
  "Ahmad → VIP (8 visits, AED 4,200 spend)",
  "Mariam → at-risk (no visit in 47 days)",
  "Saffron Rice → low-stock signal (Friday 8pm)",
  "Rashid + Khalid → group of 6 detected (recurring)",
  "Contradiction: hours say 12-11, Friday is 1pm-11",
  "Lamb Mandi mentioned 23× this week",
];

// ─── Build the graph ──────────────────────────────────────────
export function buildBrain(): { nodes: BrainNode[]; edges: BrainEdge[] } {
  const nodes: BrainNode[] = [];
  const edges: BrainEdge[] = [];

  // Stagger ingestion. Customers arrive first, then menu, then vault,
  // then FAQ, then insights. Within each batch, ~80ms apart so the
  // visualization feels like "watching it learn."
  let t = 0;
  const step = 90;

  CUSTOMERS.forEach((name, i) => {
    nodes.push({
      id: `cust-${i}`,
      label: name,
      category: "customer",
      ingestedAt: (t += step),
      detail: `Customer · ${name}`,
    });
  });

  KNOWLEDGE_FACTS.forEach((fact, i) => {
    nodes.push({
      id: `knw-${i}`,
      label: fact,
      category: "knowledge",
      ingestedAt: (t += step),
      detail: fact,
    });
  });

  MENU.forEach((dish, i) => {
    nodes.push({
      id: `menu-${i}`,
      label: dish,
      category: "knowledge",
      ingestedAt: (t += step),
      detail: `Menu · ${dish}`,
    });
  });

  // Booking events — one per ~half the customers
  const BOOKING_LABELS = ["Last Friday · 8pm · 4 ppl", "Two weeks ago · 7pm · 2 ppl", "Last night · 10pm · 6 ppl"];
  for (let i = 0; i < 12; i++) {
    const cust = i * 2;
    nodes.push({
      id: `book-${i}`,
      label: BOOKING_LABELS[i % BOOKING_LABELS.length],
      category: "booking",
      ingestedAt: (t += step),
      detail: `${CUSTOMERS[cust]} · ${BOOKING_LABELS[i % BOOKING_LABELS.length]}`,
    });
    edges.push({ source: `cust-${cust}`, target: `book-${i}`, kind: "booked" });
  }

  VAULT.forEach((note, i) => {
    nodes.push({
      id: `vault-${i}`,
      label: note,
      category: "vault",
      ingestedAt: (t += step),
      detail: `Vault · ${note}`,
    });
  });

  FACTS.forEach((fact, i) => {
    nodes.push({
      id: `fact-${i}`,
      label: fact,
      category: "fact",
      ingestedAt: (t += step),
      detail: fact,
    });
  });

  INSIGHTS.forEach((insight, i) => {
    nodes.push({
      id: `ins-${i}`,
      label: insight,
      category: "insight",
      ingestedAt: (t += step),
      detail: `Insight · ${insight}`,
    });
  });

  // ─── Edges: cross-link the categories so the graph isn't trivial ───
  // Customer → favorite menu item (every 2nd customer)
  for (let i = 0; i < CUSTOMERS.length; i += 2) {
    const menuIdx = i % MENU.length;
    edges.push({ source: `cust-${i}`, target: `menu-${menuIdx}`, kind: "prefers" });
  }
  // Vault notes → customer (vault notes about specific people)
  edges.push({ source: `vault-1`, target: `cust-3`, kind: "mentions" }); // Mariam tahini
  edges.push({ source: `vault-3`, target: `cust-0`, kind: "mentions" }); // Ahmad uncle
  // Insights → customer
  edges.push({ source: `ins-0`, target: `cust-0`, kind: "knows" }); // Ahmad VIP
  edges.push({ source: `ins-1`, target: `cust-3`, kind: "knows" }); // Mariam at-risk
  edges.push({ source: `ins-3`, target: `cust-2`, kind: "knows" });
  edges.push({ source: `ins-3`, target: `cust-4`, kind: "knows" });
  // Insights → menu (low-stock, mentioned often)
  edges.push({ source: `ins-2`, target: `menu-1`, kind: "mentions" });
  edges.push({ source: `ins-5`, target: `menu-0`, kind: "mentions" });
  // Knowledge cross-links (hours fact contradicts an insight)
  edges.push({ source: `ins-4`, target: `knw-0`, kind: "mentions" });
  // Customer → customer (Rashid + Khalid recurring group)
  edges.push({ source: `cust-2`, target: `cust-4`, kind: "knows" });
  // Vault → menu (lamb mandi sells out)
  edges.push({ source: `vault-6`, target: `menu-0`, kind: "mentions" });
  // FAQ → knowledge (founder anchors the brand)
  edges.push({ source: `fact-5`, target: `knw-2`, kind: "mentions" });

  // Random sprinkles to make the graph feel dense
  const rand = (n: number) => Math.floor(Math.random() * n);
  const seed = (s: number) => {
    let x = s;
    return () => {
      x = (x * 9301 + 49297) % 233280;
      return x / 233280;
    };
  };
  const rng = seed(42);
  for (let k = 0; k < 35; k++) {
    const a = nodes[Math.floor(rng() * nodes.length)];
    const b = nodes[Math.floor(rng() * nodes.length)];
    if (a.id !== b.id && !edges.some((e) => e.source === a.id && e.target === b.id)) {
      edges.push({ source: a.id, target: b.id, kind: "mentions" });
    }
    void rand;
  }

  return { nodes, edges };
}

export const TOTAL_24H_INGEST = 47; // The counter displayed at the top.

// Admin dashboard data — synthesized for the public-facing /admin marketing
// mockup. The real authed admin lives in apps/client-dashboard and is out of
// scope for this file. Mirrors /tmp/dcp-design/assets/admin.jsx (which used
// window.DCP_DATA.customers — a list that wasn't shipped in the design kit;
// we synthesize realistic UAE/KSA SMB names here instead).

export type AdminTier = "starter" | "growth" | "pro" | "enterprise";
export type AdminHealth = "ok" | "warn";
export type AdminRegion = "RUH" | "JED" | "DMM" | "AUH" | "DXB";

export interface AdminClient {
  id: number;
  name: string;
  region: AdminRegion;
  tier: AdminTier;
  mrr: number; // SAR
  convs: number; // conversations / day
  health: AdminHealth;
  since: number; // year
}

// Plausible Saudi/UAE SMB business names — restaurants, cafés, salons, clinics,
// retail. Deterministic so the page is stable across renders.
const CLIENT_NAMES: readonly string[] = [
  "Saffron Kitchen",
  "Al Baik Express",
  "Najd Coffee",
  "Maison Khoury",
  "Olaya Salon",
  "Roots Café",
  "Halia Spa",
  "Khaleej Dental",
  "Camel Step Roasters",
  "Layali Beirut",
  "Atelier Riyadh",
  "Bait Al Bahr",
  "The Press Studio",
  "Nahdi Wellness",
  "Sahel Bistro",
  "Tamr Coffee Co.",
  "Glow Aesthetic",
  "Yamama Grill",
  "Zaytouna Salon",
  "Mada Café",
  "Khobar Catering",
  "Hyatt Square Clinic",
  "Mokha & Co.",
  "Riyadh Glow",
];

const TIER_ROTATION: readonly AdminTier[] = ["starter", "growth", "pro", "enterprise"];
const REGION_ROTATION: readonly AdminRegion[] = ["RUH", "JED", "DMM", "AUH", "DXB"];

const TIER_MRR_SAR: Record<AdminTier, number> = {
  starter: 1530,
  growth: 3060,
  pro: 5100,
  enterprise: 8160,
};

export const ADMIN_CLIENTS: AdminClient[] = Array.from({ length: 24 }, (_, i) => {
  const tier = TIER_ROTATION[(i * 7) % 4];
  return {
    id: i,
    name: `${CLIENT_NAMES[i % CLIENT_NAMES.length]} ${i + 1}`,
    region: REGION_ROTATION[(i * 3) % 5],
    tier,
    mrr: TIER_MRR_SAR[tier],
    convs: 200 + ((i * 137) % 9000),
    health: i % 8 === 3 ? "warn" : "ok",
    since: 2024 + (i % 2),
  };
});

export interface AdminRegionStat {
  id: string;
  name: string;
  code: AdminRegion;
  lat: number;
  lon: number;
  count: number;
}

export const ADMIN_REGIONS: AdminRegionStat[] = [
  { id: "ruh", name: "Riyadh", code: "RUH", lat: 24.71, lon: 46.67, count: 184 },
  { id: "jed", name: "Jeddah", code: "JED", lat: 21.49, lon: 39.18, count: 92 },
  { id: "dmm", name: "Dammam", code: "DMM", lat: 26.42, lon: 50.1, count: 41 },
  { id: "auh", name: "Abu Dhabi", code: "AUH", lat: 24.45, lon: 54.38, count: 28 },
  { id: "dxb", name: "Dubai", code: "DXB", lat: 25.2, lon: 55.27, count: 37 },
];

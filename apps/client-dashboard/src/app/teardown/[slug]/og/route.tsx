// Dynamic OG share image for a teardown permalink.
//
// Renders to a 1200x630 PNG on every request. WhatsApp / X / LinkedIn
// share previews pull this URL via the og:image meta tag set in the
// permalink page's generateMetadata().
//
// Pure Edge-compatible — uses Next 15's built-in `next/og` (no
// @vercel/og dependency). Loads the package from public_teardowns,
// composes a branded card with the agent score, grade pill, business
// name, top badge, and the screenshot when available.

import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

interface TeardownPackage {
  business_name: string;
  url: string;
  agent_score?: {
    overall: number;
    grade: "A+" | "A" | "B" | "C" | "D" | "F";
  } | null;
  badges?: { emoji: string; label: string }[];
  screenshot_url?: string | null;
  reviews?: { sentiment?: { total: number }; avg_rating?: number | null } | null;
}

const GRADE_FG: Record<string, string> = {
  "A+": "#1e6d3d",
  A: "#1e6d3d",
  B: "#5d8a4a",
  C: "#a07232",
  D: "#a07232",
  F: "#a83a2b",
};
const GRADE_BG: Record<string, string> = {
  "A+": "#dfeede",
  A: "#dfeede",
  B: "#e9f0dd",
  C: "#f4e4cb",
  D: "#fdf3e3",
  F: "#f4d6cf",
};

export async function GET(_req: Request, ctx: RouteParams) {
  const { slug } = await ctx.params;
  let pkg: TeardownPackage | null = null;
  let business_name = "Unknown business";
  try {
    const sql = db();
    const rows = await sql<{ business_name: string; package: TeardownPackage }[]>`
      SELECT business_name, package FROM public_teardowns WHERE slug = ${slug} LIMIT 1
    `;
    if (rows[0]) {
      pkg = rows[0].package;
      business_name = rows[0].business_name;
    }
  } catch {
    // Fall through with default
  }

  const score = pkg?.agent_score?.overall ?? 0;
  const grade = pkg?.agent_score?.grade ?? "?";
  const gradeFg = GRADE_FG[grade] ?? "#837c69";
  const gradeBg = GRADE_BG[grade] ?? "#ece8db";
  const reviewCount = pkg?.reviews?.sentiment?.total ?? 0;
  const avgRating = pkg?.reviews?.avg_rating ?? null;
  const topBadge = pkg?.badges?.[0];

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#f6f3eb",
          padding: "60px 80px",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Top eyebrow */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#837c69",
            fontSize: 18,
            letterSpacing: "2.5px",
            textTransform: "uppercase",
          }}
        >
          <span>§ agents.dcp.sa · day-one teardown</span>
          <span>{new Date().toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" })}</span>
        </div>

        {/* Middle: title + score */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 40,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 720 }}>
            <div style={{ fontSize: 32, color: "#514c40", marginBottom: 16 }}>
              What an AI agent would do with
            </div>
            <div
              style={{
                fontSize: 72,
                lineHeight: 1.05,
                color: "#1d1c18",
                fontWeight: 400,
              }}
            >
              {business_name}
            </div>
            <div style={{ fontSize: 32, color: "#2d8e7d", marginTop: 16, fontStyle: "italic" }}>
              on day one.
            </div>
          </div>

          {/* Score gauge */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "center",
                width: 240,
                height: 240,
                borderRadius: "50%",
                background: "#fbfaf4",
                border: `12px solid ${gradeFg}`,
                color: gradeFg,
                fontSize: 96,
                fontWeight: 400,
              }}
            >
              {score}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 28px",
                background: gradeBg,
                color: gradeFg,
                fontSize: 44,
                borderRadius: 8,
                fontWeight: 400,
              }}
            >
              Grade {grade}
            </div>
          </div>
        </div>

        {/* Bottom: stats row */}
        <div
          style={{
            display: "flex",
            gap: 24,
            color: "#514c40",
            fontSize: 20,
            alignItems: "center",
          }}
        >
          {avgRating != null && reviewCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 26, color: "#2d8e7d" }}>★</span>
              <span style={{ fontWeight: 600 }}>{avgRating.toFixed(1)}</span>
              <span style={{ color: "#837c69" }}>across {reviewCount.toLocaleString()} reviews</span>
            </div>
          )}
          {topBadge && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                background: "#fbfaf4",
                border: "1px solid #d8d2bf",
                borderRadius: 999,
                fontSize: 18,
              }}
            >
              <span style={{ fontSize: 24 }}>{topBadge.emoji}</span>
              <span style={{ fontWeight: 600 }}>{topBadge.label}</span>
            </div>
          )}
          <div style={{ marginLeft: "auto", color: "#837c69", fontSize: 16 }}>
            free · no signup · agents.dcp.sa/teardown
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

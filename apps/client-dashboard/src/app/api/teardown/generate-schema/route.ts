// POST /api/teardown/generate-schema
//
// Public proxy to the prompt-builder /web/generate-schema endpoint.
// The SchemaAudit section calls this on click. Returns ready-to-paste
// <script type="application/ld+json"> blocks grounded in the teardown's
// already-collected facts (rating, address, hours, business context).
//
// Body: { slug: string, types: string[] }
// Returns: { blocks: [{type, html}], summary } or { error }

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 90;

const PROMPT_BUILDER_URL =
  process.env.PROMPT_BUILDER_URL || "https://n8n.dcp.sa";

interface TeardownPackage {
  business_name: string;
  url: string;
  gbp?: {
    rating?: number | null;
    user_ratings_total?: number | null;
    address?: string | null;
    phone?: string | null;
    hours?: string[];
  } | null;
  reviews?: {
    avg_rating?: number | null;
    sentiment?: { total: number };
  } | null;
  screenshot_url?: string | null;
}

interface RowShape {
  url: string;
  business_name: string;
  country: string | null;
  package: TeardownPackage;
}

interface Body {
  slug?: string;
  types?: string[];
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.slug || !Array.isArray(body.types) || body.types.length === 0) {
    return NextResponse.json({ error: "slug_and_types_required" }, { status: 400 });
  }

  // Cap requested types to a sensible upper bound — protects against
  // hostile callers asking for 100 entities. The SchemaAudit section
  // typically passes 3-6 missing critical types.
  const types = body.types.filter((t) => typeof t === "string" && t.length > 0).slice(0, 8);
  if (types.length === 0) {
    return NextResponse.json({ error: "no_valid_types" }, { status: 400 });
  }

  const sql = db();
  const rows = await sql<RowShape[]>`
    SELECT url, business_name, country, package
    FROM public_teardowns
    WHERE slug = ${body.slug}
    LIMIT 1
  `;
  if (!rows.length) {
    return NextResponse.json({ error: "slug_not_found" }, { status: 404 });
  }
  const row = rows[0];
  const pkg = row.package;

  // Best-available facts: prefer GBP-verified > review-aggregated > nothing.
  // The prompt-builder endpoint refuses to invent missing fields.
  const rating = pkg.gbp?.rating ?? pkg.reviews?.avg_rating ?? null;
  const rating_count = pkg.gbp?.user_ratings_total ?? pkg.reviews?.sentiment?.total ?? null;
  const address = pkg.gbp?.address ?? null;
  const phone = pkg.gbp?.phone ?? null;
  const hours = pkg.gbp?.hours && pkg.gbp.hours.length ? pkg.gbp.hours : null;

  // Compact business context — we don't need the full corpus; just a
  // condensed summary of what's known. Reduces prompt cost.
  const contextParts: string[] = [];
  contextParts.push(`Business: ${pkg.business_name}`);
  if (address) contextParts.push(`Address: ${address}`);
  if (phone) contextParts.push(`Phone: ${phone}`);
  if (hours) contextParts.push(`Hours: ${hours.join("; ")}`);
  if (rating && rating_count) contextParts.push(`Public rating: ${rating}★ across ${rating_count.toLocaleString()} reviews`);
  const businessContext = contextParts.join("\n");

  try {
    const res = await fetch(`${PROMPT_BUILDER_URL.replace(/\/$/, "")}/web/generate-schema`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_name: pkg.business_name,
        url: pkg.url,
        types,
        country: row.country || "AE",
        business_context: businessContext,
        address,
        phone,
        hours,
        rating,
        rating_count,
        image_url: pkg.screenshot_url || null,
      }),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `prompt_builder_http_${res.status}` },
        { status: 502 },
      );
    }
    const data = await res.json();
    if (data?.error) {
      return NextResponse.json({ error: data.error }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      slug: body.slug,
      blocks: data.blocks ?? [],
      summary: data.summary ?? "",
    });
  } catch (e) {
    console.error("[generate-schema] failed:", e);
    return NextResponse.json({ error: "request_failed" }, { status: 502 });
  }
}

// GET /api/teardown/[slug] — public lookup of a stored teardown by slug.
//
// Used by the onboarding wizard to pre-fill from a "Hire <FirstName>"
// click. Returns the same TeardownPackage that the slug page renders,
// without bumping the view_count (this is data fetch, not page view).
// Public surface — no auth gate. Already-public data.

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import type { TeardownPackage } from "@/app/teardown/teardown-report";

interface TeardownRow {
  url: string;
  business_name: string;
  created_at: string;
  package: TeardownPackage;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  if (!slug || slug.length > 60 || !/^[a-z0-9-]+$/i.test(slug)) {
    return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  }
  try {
    const sql = db();
    const rows = await sql<TeardownRow[]>`
      SELECT url, business_name, created_at, package
      FROM public_teardowns
      WHERE slug = ${slug}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(
      {
        url: row.url,
        business_name: row.business_name,
        created_at: row.created_at,
        package: row.package,
      },
      {
        headers: {
          // Light caching is fine — these are immutable until refresh.
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (e) {
    console.error(`[api/teardown/${slug}] lookup failed:`, e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

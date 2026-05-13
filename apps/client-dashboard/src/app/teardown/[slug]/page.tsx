// Public permalink page for a generated teardown.
//
// Server Component — fetches the package from public_teardowns by slug,
// bumps view_count + last_viewed_at, renders the same artifact layout
// the on-form result uses. No auth gate.
//
// 404 if the slug doesn't exist. The form page handles regeneration
// (POST /api/teardown with refresh:true).

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { TeardownReport } from "../teardown-report";
import type { TeardownPackage } from "../teardown-report";

interface PageParams {
  params: Promise<{ slug: string }>;
}

interface TeardownRow {
  url: string;
  business_name: string;
  created_at: string;
  view_count: number;
  package: TeardownPackage;
}

async function loadTeardown(slug: string, bumpView: boolean): Promise<TeardownRow | null> {
  if (!slug || slug.length > 60) return null;
  try {
    const sql = db();
    // The page render bumps view_count; generateMetadata reads without
    // bumping (otherwise every prerender doubles the counter).
    if (bumpView) {
      const rows = await sql<TeardownRow[]>`
        UPDATE public_teardowns
        SET view_count = view_count + 1,
            last_viewed_at = NOW()
        WHERE slug = ${slug}
        RETURNING url, business_name, created_at, view_count, package
      `;
      return rows[0] ?? null;
    }
    const rows = await sql<TeardownRow[]>`
      SELECT url, business_name, created_at, view_count, package
      FROM public_teardowns
      WHERE slug = ${slug}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (e) {
    console.error("[teardown/[slug]] load failed:", e);
    return null;
  }
}

export default async function TeardownPermalinkPage({ params }: PageParams) {
  const { slug } = await params;
  const row = await loadTeardown(slug, true);
  if (!row) notFound();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--paper, #f6f3eb)",
        color: "var(--paper-ink, #1d1c18)",
        padding: "60px 24px 120px",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <header style={{ marginBottom: 28 }}>
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--paper-mut, #837c69)",
            }}
          >
            § agents.dcp.sa · public teardown · view {row.view_count}
          </span>
          <h1
            style={{
              fontFamily: "Instrument Serif, Georgia, serif",
              fontSize: 48,
              fontWeight: 400,
              margin: "10px 0 12px",
              lineHeight: 1.1,
            }}
          >
            What an AI agent would do with{" "}
            <em style={{ color: "#2d8e7d" }}>{row.business_name}</em> on day one.
          </h1>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.55,
              color: "var(--paper-mut, #514c40)",
              margin: 0,
            }}
          >
            Generated{" "}
            <time dateTime={row.created_at}>
              {new Date(row.created_at).toLocaleString("en-AE", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </time>{" "}
            for{" "}
            <a
              href={row.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#2d8e7d", textDecoration: "underline" }}
            >
              {row.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
            . Share this URL to send the report to a colleague — they don&apos;t need to
            sign up to read it.
          </p>
        </header>

        <TeardownReport pkg={row.package} slug={slug} />

        <footer
          style={{
            marginTop: 32,
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 13,
            color: "var(--paper-mut, #837c69)",
          }}
        >
          <span>Want a teardown for your own business?</span>
          <a
            href="/teardown"
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 12,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "10px 16px",
              background: "#1d1c18",
              color: "#fbfaf4",
              border: "1px solid #1d1c18",
              borderRadius: 6,
              textDecoration: "none",
            }}
          >
            Generate one →
          </a>
        </footer>
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: PageParams) {
  const { slug } = await params;
  const row = await loadTeardown(slug, false);
  if (!row) {
    return { title: "Teardown not found · agents.dcp.sa" };
  }
  const desc =
    row.package.insight?.slice(0, 160) ||
    `AI-generated analysis of ${row.business_name}.`;
  // Dynamic OG image lives at /teardown/[slug]/og — Next renders a
  // branded 1200x630 PNG per share. The marketing-host rewrite proxies
  // /teardown/<slug>/og → DASHBOARD_HOST/app/teardown/<slug>/og.
  const ogUrl = `https://agents.dcp.sa/teardown/${slug}/og`;
  return {
    title: `${row.business_name} · day-one teardown · agents.dcp.sa`,
    description: desc,
    openGraph: {
      title: `What an AI agent would do with ${row.business_name} on day one`,
      description: desc,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${row.business_name} day-one teardown` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${row.business_name} · day-one teardown`,
      description: desc,
      images: [ogUrl],
    },
  };
}

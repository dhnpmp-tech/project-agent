// Public teardown page — no auth required, no /app gate logic, just a
// URL input that runs the day-one analysis on any prospect site.
//
// This is the viral acquisition wedge: prospects discover the report
// through Rami's outbound DMs or organic share, see all 4 hooks applied
// to their own business, then click signup. The "$5K-of-consulting for
// free" surface.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api-url";
import { TeardownReport, type TeardownPackage } from "./teardown-report";
import { LoadingShow } from "./loading-show";


export default function TeardownPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pkg, setPkg] = useState<TeardownPackage | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || pending) return;
    setError(null);
    setPkg(null);
    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/teardown"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(
          data?.detail || data?.error || "Couldn't analyze this site — try a different URL.",
        );
        return;
      }
      // On success we get a slug back — navigate to the permalink so the
      // result is shareable. Falls back to inline render if persistence
      // failed (slug missing) so we never lose the analysis on a slug
      // collision retry exhaustion.
      if (typeof data.slug === "string" && data.slug.length > 0) {
        // router.push auto-prefixes the basePath — don't wrap with apiUrl
        // here or we end up at /app/app/teardown/...
        router.push(`/teardown/${data.slug}`);
        return;
      }
      setPkg(data.package as TeardownPackage);
    } catch {
      setError("Network error — try again in a moment.");
    } finally {
      setPending(false);
    }
  };

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
        <header style={{ marginBottom: 32 }}>
          <span
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--paper-mut, #837c69)",
            }}
          >
            § Najim · 60-second hire preview · no signup
          </span>
          <h1
            style={{
              fontFamily: "Instrument Serif, Georgia, serif",
              fontSize: 56,
              fontWeight: 400,
              margin: "10px 0 18px",
              lineHeight: 1.05,
            }}
          >
            Watch a Najim hire{" "}
            <em style={{ color: "#d4924b" }}>read your business</em>{" "}
            in 60 seconds.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: "var(--paper-mut, #514c40)" }}>
            Paste any UAE or Saudi SMB URL. We send your site through the same agent stack
            that serves our paying tenants — and show you exactly what your future hire
            would notice on Day 1: the sharp first impression, the three customer questions
            your site doesn&apos;t answer, three on-brand Instagram captions, and a sample
            WhatsApp reply in your voice. Shareable permalink. No signup. ~60 seconds.
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          style={{
            display: "flex",
            gap: 12,
            background: "var(--paper-card, #fbfaf4)",
            padding: 16,
            border: "1px solid var(--paper-line, #d8d2bf)",
            borderRadius: 8,
            marginBottom: 40,
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="your-restaurant.com"
            disabled={pending}
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            style={{
              flex: "1 1 320px",
              minWidth: 0,
              fontSize: 16,
              padding: "12px 14px",
              background: "var(--paper, #f6f3eb)",
              border: "1px solid var(--paper-line, #d8d2bf)",
              borderRadius: 6,
              color: "var(--paper-ink, #1d1c18)",
              fontFamily: "inherit",
            }}
          />
          <button
            type="submit"
            disabled={pending || !url.trim()}
            style={{
              fontFamily: "var(--mono, ui-monospace)",
              fontSize: 13,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "12px 20px",
              background: pending ? "var(--paper-line, #d8d2bf)" : "#1d1c18",
              color: pending ? "var(--paper-mut, #837c69)" : "#fbfaf4",
              border: "1px solid #1d1c18",
              borderRadius: 6,
              cursor: pending ? "wait" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {pending ? "Reading your site…" : "Run hire preview"}
          </button>
        </form>

        {error && (
          <div
            style={{
              padding: 14,
              background: "#f4d6cf",
              border: "1px solid #b94a3b",
              borderRadius: 6,
              color: "#7a2620",
              marginBottom: 32,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {pending && !pkg && <LoadingShow targetUrl={url} />}

        {pkg && <TeardownReport pkg={pkg} />}

        {!pending && !pkg && !error && (
          <div
            style={{
              padding: 24,
              background: "var(--paper-card, #fbfaf4)",
              border: "1px dashed var(--paper-line, #d8d2bf)",
              borderRadius: 8,
              fontSize: 14,
              color: "var(--paper-mut, #514c40)",
              lineHeight: 1.55,
            }}
          >
            <strong>What this is.</strong> Najim is an AI staffing agency — we hire,
            train, and ship a bespoke AI teammate for your business in 10 working days.
            This page is a 60-second preview of how that hire would think about your site
            on Day 1. We crawl your public pages and route them through the same agent
            stack that serves our tenants. Real-time, no cache, nothing sold or shared.
            When you&apos;re ready: <a href="/kickoff" style={{ color: "#d4924b", textDecoration: "underline" }}>schedule a 20-minute kickoff call</a> and
            we put your hire on WhatsApp inside two weeks.
          </div>
        )}
      </div>
    </main>
  );
}


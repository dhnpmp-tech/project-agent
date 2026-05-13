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
        router.push(apiUrl(`/teardown/${data.slug}`));
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
            § agents.dcp.sa · public teardown
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
            See how an AI agent would{" "}
            <em style={{ color: "#2d8e7d" }}>think about your business</em> in 30 seconds.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: "var(--paper-mut, #514c40)" }}>
            Paste any UAE or Saudi SMB website and our agent will produce a free analysis:
            its sharp first impression, three customer questions your site doesn&apos;t answer
            yet, three on-brand Instagram captions, and a sample WhatsApp reply. No signup
            required. ~30 seconds.
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
            {pending ? "analyzing…" : "Generate teardown"}
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

        {pending && !pkg && (
          <div
            style={{
              padding: 40,
              background: "var(--paper-card, #fbfaf4)",
              border: "1px solid var(--paper-line, #d8d2bf)",
              borderRadius: 8,
              textAlign: "center",
              fontFamily: "Instrument Serif, serif",
              fontSize: 20,
              color: "var(--paper-mut, #837c69)",
              lineHeight: 1.4,
            }}
          >
            Crawling the site, then running 4 parallel AI tasks…
            <br />
            <span style={{ fontSize: 13, fontFamily: "var(--mono, ui-monospace)", color: "var(--paper-mut, #837c69)" }}>
              this usually takes 20–60 seconds
            </span>
          </div>
        )}

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
            <strong>How it works.</strong> We crawl your public pages (about, services, FAQ,
            contact, team) and route the content through our inference layer — the same agent
            that runs Saffron Kitchen (Dubai) and Jareed Coffee (Riyadh) in production. The
            report is generated in real time; we don&apos;t cache, sell, or share what we
            find. After the analysis, you can sign up to get a full 10-artifact day-one
            package, an owner WhatsApp channel, and the actual agent on your number.
          </div>
        )}
      </div>
    </main>
  );
}


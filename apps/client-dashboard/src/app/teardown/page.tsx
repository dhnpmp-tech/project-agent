// Public teardown page — no auth required, no /app gate logic, just a
// URL input that runs the day-one analysis on any prospect site.
//
// This is the viral acquisition wedge: prospects discover the report
// through Rami's outbound DMs or organic share, see all 4 hooks applied
// to their own business, then click signup. The "$5K-of-consulting for
// free" surface.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api-url";
import { TeardownReport, type TeardownPackage } from "./teardown-report";

/* ─── LoadingShow · ASCII animation while the agent thinks ─── */

interface Scene {
  art: string;
  title: string;
  fact: string;
}

function buildScenes(host: string): Scene[] {
  const h = host || "your-site.com";
  const hPad = h.length > 22 ? h.slice(0, 22) + "…" : h;
  return [
    {
      art: [
        `┌─ reading · ${hPad}${" ".repeat(Math.max(0, 22 - hPad.length))} ─┐`,
        `│                                          │`,
        `│   /            ▰▰▰▰▰▰▰▰░░░░░░░  72%      │`,
        `│   /menu        ▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰  100%     │`,
        `│   /about       ▰▰▰▰▰▰▰▰░░░░░░░  60%      │`,
        `│   /faq         ▰▰▰▰░░░░░░░░░░░  31%      │`,
        `│   /contact     ▰▰░░░░░░░░░░░░░  18%      │`,
        `│                                          │`,
        `└──────────────────────────────────────────┘`,
      ].join("\n"),
      title: "Step 1 · Reading your public pages",
      fact: "The same five pages a thoughtful new hire would read on day one.",
    },
    {
      art: [
        `    ┌── customer ───────────────────┐`,
        `    │  Hi! Table for 4 tonight at 9?│`,
        `    └───────────────────────────────┘`,
        `                       │`,
        `                       └──→  ◉`,
        `                                  ↳`,
        `         ┌── layla · ai ─────────────────┐`,
        `         │  Welcome back, Ahmed 👋       │`,
        `         │  Table 12, 9pm, party of 4 —  │`,
        `         │  same as last time? Want me   │`,
        `         │  to order your usual?         │`,
        `         └───────────────────────────────┘`,
      ].join("\n"),
      title: "Step 2 · Drafting the demo conversation",
      fact: "Every agent has a name and a backstory. Layla runs Saffron Kitchen, Dubai.",
    },
    {
      art: [
        `              [ whatsapp ]                 `,
        `                   │                       `,
        `                   │                       `,
        `   [ web ]──────[ ◉ brain ]──────[ insta ] `,
        `                   │                       `,
        `                   │                       `,
        `              [ voice notes ]              `,
        `                                           `,
        `       one persona · every surface         `,
      ].join("\n"),
      title: "Step 3 · Mapping your channels",
      fact: "Same memory, same voice, every channel — WhatsApp, voice notes, Instagram, web.",
    },
    {
      art: [
        `╔══ customer #847 · ahmed.dxb ═══════════╗`,
        `║                                         ║`,
        `║   ▸ allergy . . . . . nuts              ║`,
        `║   ▸ table   . . . . . 12 · by window    ║`,
        `║   ▸ visits  . . . . . 8 · since 2024    ║`,
        `║   ▸ loves   . . . . . the truffle pasta ║`,
        `║   ▸ status  . . . . . vip · 4.9★ avg    ║`,
        `║                                         ║`,
        `╚═════════════════════════════════════════╝`,
      ].join("\n"),
      title: "Step 4 · Mining reviews and memory",
      fact: "Persistent memory across years. The agent remembers what you'd forget.",
    },
    {
      art: [
        `   22:00 ── conversations close             `,
        `       │                                    `,
        `       ▼                                    `,
        `   02:00 ── new rules drafted               `,
        `       │                                    `,
        `       ▼                                    `,
        `   04:00 ── A/B verified on past chats      `,
        `       │                                    `,
        `       ▼                                    `,
        `   09:00 ── briefed to you over WhatsApp    `,
      ].join("\n"),
      title: "Step 5 · Self-improvement loop",
      fact: "The platform gets smarter every single night — without you touching it.",
    },
    {
      art: [
        `   ─── PROJECT AGENT ──────────────────── `,
        `                                          `,
        `   AI employees for UAE + Saudi SMBs.     `,
        `                                          `,
        `   ▸  WhatsApp · voice · IG · web         `,
        `   ▸  bilingual native · ar + en          `,
        `   ▸  memory that spans years             `,
        `   ▸  self-improving every night          `,
        `   ▸  live in 10 minutes · no devs        `,
        `                                          `,
        `   ── built in riyadh · ~$0.003/convo ──  `,
      ].join("\n"),
      title: "Almost there · finalizing your report",
      fact: "Less than the cost of one human employee. The output of a team of six.",
    },
  ];
}

function LoadingShow({ targetUrl }: { targetUrl: string }) {
  const host = (() => {
    try {
      return new URL(
        targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`,
      ).hostname.replace(/^www\./, "");
    } catch {
      return targetUrl.replace(/^https?:\/\//, "").replace(/\/.*/, "");
    }
  })();
  const SCENES = buildScenes(host);
  const [idx, setIdx] = useState(0);
  const [dotPhase, setDotPhase] = useState(0);
  useEffect(() => {
    const sceneTimer = setInterval(() => setIdx((x) => (x + 1) % SCENES.length), 4200);
    const dotTimer = setInterval(() => setDotPhase((d) => (d + 1) % 4), 380);
    return () => {
      clearInterval(sceneTimer);
      clearInterval(dotTimer);
    };
  }, [SCENES.length]);

  const scene = SCENES[idx];
  const dots = "·".repeat(dotPhase) + " ".repeat(3 - dotPhase);

  return (
    <div
      style={{
        padding: "36px 32px 28px",
        background: "var(--paper-card, #fbfaf4)",
        border: "1px solid var(--paper-line, #d8d2bf)",
        borderRadius: 8,
        color: "var(--paper-ink, #1d1c18)",
      }}
    >
      {/* ASCII frame */}
      <div
        style={{
          background: "#1d1c18",
          color: "#c9e2dc",
          padding: "22px 24px",
          borderRadius: 6,
          fontFamily:
            "ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, Consolas, monospace",
          fontSize: 13,
          lineHeight: 1.45,
          overflow: "auto",
        }}
      >
        <pre style={{ margin: 0, whiteSpace: "pre", fontFamily: "inherit" }}>{scene.art}</pre>
      </div>

      {/* Title + fact */}
      <div
        style={{
          marginTop: 22,
          fontFamily: "Instrument Serif, Georgia, serif",
          fontSize: 24,
          lineHeight: 1.25,
          color: "var(--paper-ink, #1d1c18)",
        }}
      >
        {scene.title}
        <span style={{ color: "#2d8e7d" }}>{dots}</span>
      </div>
      <p
        style={{
          marginTop: 8,
          fontSize: 15,
          lineHeight: 1.55,
          color: "var(--paper-mut, #514c40)",
        }}
      >
        {scene.fact}
      </p>

      {/* Progress strip */}
      <div
        style={{
          marginTop: 24,
          paddingTop: 18,
          borderTop: "1px dashed var(--paper-line, #d8d2bf)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            fontFamily:
              "ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, Consolas, monospace",
            fontSize: 14,
            color: "var(--paper-mut, #837c69)",
          }}
        >
          {SCENES.map((_, i) => (
            <span
              key={i}
              style={{
                color: i <= idx ? "#2d8e7d" : "var(--paper-line, #d8d2bf)",
                transition: "color 320ms ease",
              }}
            >
              ●
            </span>
          ))}
        </div>
        <div
          style={{
            fontFamily:
              "ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, Consolas, monospace",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--paper-mut, #837c69)",
            opacity: 0.7,
          }}
        >
          scene {idx + 1}/{SCENES.length} · usually 20–60s
        </div>
      </div>
    </div>
  );
}

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


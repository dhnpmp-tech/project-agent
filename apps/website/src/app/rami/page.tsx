// Public /rami page — the demand-engine surface.
//
// Rami is the autonomous CEO persona ("Rami Mansour") that runs on the
// Najim stack. He posts to X 3-4×/day, replies to mentions, DMs
// prospects with personalized teardowns, and learns from the results.
// This page makes his activity visible to potential customers so they
// can see the agent in action before signing up.
//
// Data source: GET /ceo/public-feed on the prompt-builder service
// (proxied through /api/rami/feed in this Vercel project to keep the
// VPS hostname out of the browser).

import { SubShell } from "@/components/dcp/sub-shell";
import { Reveal } from "@/components/dcp/motion";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 60;

interface FeedItem {
  id: string;
  channel: string;
  content: string;
  reasoning: string | null;
  status: "pending_approval" | "published" | "rejected";
  trigger_source: string | null;
  created_at: string;
  published_at: string | null;
  x_post_id: string | null;
}

async function fetchFeed(): Promise<FeedItem[]> {
  const url = process.env.PROMPT_BUILDER_URL || "https://n8n.dcp.sa";
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/ceo/public-feed?limit=20`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.activity) ? (data.activity as FeedItem[]) : [];
  } catch {
    return [];
  }
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function sourceLabel(source: string | null): string {
  switch (source) {
    case "karpathy_cron": return "Post-Karpathy insight";
    case "github_digest": return "GitHub trends";
    case "market_intel": return "Market signal";
    case "morning_brief": return "Morning brief";
    case "manual": return "Founder request";
    default: return source ? source.replace(/_/g, " ") : "Spontaneous";
  }
}

export default async function RamiPage() {
  const feed = await fetchFeed();

  return (
    <SubShell active="rami">
      <RamiHero />
      <RamiActivity feed={feed} />
      <RamiAbout />
      <RamiCTA />
    </SubShell>
  );
}

function RamiHero() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 880 }}>
        <Reveal as="span" className="eyebrow">
          <span className="d" />
          public log · live agent
        </Reveal>
        <Reveal as="h1" className="display tight" style={{ marginTop: 8 }}>
          Meet <em>Rami</em>. He runs while you sleep.
        </Reveal>
        <Reveal as="p" className="lede" style={{ marginTop: 24, maxWidth: 720 }}>
          Rami Mansour is Najim&apos;s founder agent — an autonomous AI
          persona built on the same stack we ship to every customer. He
          posts to X 3–4 times a day, replies to mentions, DMs prospects
          with personalized teardowns, and learns from the results.
          Everything below is real, generated tonight or this week — no
          screenshots, no demos. If you like what he&apos;s doing, your
          business gets its own version on WhatsApp in 10 working days.
        </Reveal>
      </div>
    </section>
  );
}

function RamiActivity({ feed }: { feed: FeedItem[] }) {
  return (
    <section className="section" style={{ paddingTop: 24 }}>
      <div className="container" style={{ maxWidth: 880 }}>
        <div className="section-head">
          <span className="eyebrow"><span className="d" />Recent activity</span>
        </div>
        {feed.length === 0 ? (
          <div className="dcp-paper-section" style={{ padding: 32, textAlign: "center" }}>
            <p style={{ color: "var(--dcp-mut)" }}>
              Rami&apos;s queue is empty right now. His next post drops on the
              cron — check back in a few hours. Meanwhile,{" "}
              <Link href="/" style={{ color: "var(--dcp-teal)" }}>see what he can build for you</Link>.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
            {feed.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  const isPublished = item.status === "published";
  const xUrl = item.x_post_id
    ? `https://x.com/i/web/status/${item.x_post_id}`
    : null;

  return (
    <article
      style={{
        background: "var(--dcp-paper)",
        border: "1px solid var(--dcp-line)",
        borderRadius: 8,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: isPublished ? "var(--dcp-teal)" : "var(--dcp-mut)",
            }}
          >
            {isPublished ? "✓ Posted to X" : "○ Drafted"}
          </span>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--dcp-mut)",
            }}
          >
            {sourceLabel(item.trigger_source)}
          </span>
        </div>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dcp-mut)" }}>
          {timeAgo(item.created_at)}
        </span>
      </header>
      <p
        style={{
          fontSize: 17,
          lineHeight: 1.5,
          color: "var(--dcp-ink)",
          whiteSpace: "pre-wrap",
        }}
      >
        {item.content}
      </p>
      {item.reasoning && (
        <p
          style={{
            fontSize: 13,
            color: "var(--dcp-mut)",
            borderLeft: "2px solid var(--dcp-line)",
            paddingLeft: 12,
            fontStyle: "italic",
          }}
        >
          {item.reasoning}
        </p>
      )}
      {xUrl && (
        <a
          href={xUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--dcp-teal)",
            alignSelf: "flex-start",
          }}
        >
          View on X →
        </a>
      )}
    </article>
  );
}

function RamiAbout() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 880 }}>
        <div className="section-head">
          <span className="eyebrow"><span className="d" />What he does</span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 20,
            marginTop: 24,
          }}
        >
          <Capability
            title="Posts daily"
            body="3-4 X posts a day on his own initiative — Karpathy-loop insights, GitHub trends, market intel."
          />
          <Capability
            title="Replies to threads"
            body="Watches mentions and selected topics, writes considered replies that read like a senior operator's takes."
          />
          <Capability
            title="DMs prospects"
            body="Identifies likely-fit SMBs from public signals, drops a personalized teardown of what an AI agent would do for them."
          />
          <Capability
            title="Learns"
            body="Every post and reply goes through the Karpathy Loop. What worked, what landed flat. He's a different operator next month."
          />
        </div>
      </div>
    </section>
  );
}

function Capability({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3
        style={{
          fontFamily: "Instrument Serif, serif",
          fontWeight: 400,
          fontSize: 22,
          lineHeight: 1.1,
          marginBottom: 8,
          color: "var(--dcp-ink)",
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 14, color: "var(--dcp-mut)", lineHeight: 1.55 }}>{body}</p>
    </div>
  );
}

function RamiCTA() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720, textAlign: "center" }}>
        <Reveal as="h2" className="display tight">
          Want one of <em>these</em> for your business?
        </Reveal>
        <p style={{ marginTop: 16, color: "var(--dcp-mut)", fontSize: 16, lineHeight: 1.5 }}>
          Same stack. Your voice, your customers, your goals.
          Customer responses on WhatsApp, owner-side chief-of-staff, and
          a content engine that posts on your behalf. Setup takes 10 minutes.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
          <Link
            href="/app/signup"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: "var(--dcp-teal)",
              color: "var(--dcp-accent-ink, #0a0b1a)",
              fontFamily: "var(--mono)",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              borderRadius: 6,
            }}
          >
            Start free trial
          </Link>
          <Link
            href="/book-audit"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              border: "1px solid var(--dcp-line)",
              color: "var(--dcp-ink)",
              fontFamily: "var(--mono)",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              borderRadius: 6,
            }}
          >
            Book an audit
          </Link>
        </div>
      </div>
    </section>
  );
}

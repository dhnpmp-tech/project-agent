"use client";

// /changelog — public ship log + ARR milestones.
//
// Why this page exists: Yasser at Chatbase made transparent ARR milestone
// posts on X part of his distribution moat. We do the same here. Every
// entry maps to a real commit on origin/main; the ARR_MILESTONES list
// is hand-maintained but kept short and honest.
//
// Curation policy:
// - Skip refactors, typecheck fixes, copy tweaks
// - Lead with new capabilities or visible product changes
// - One line per entry, no fluff
// - Keep it skim-able on mobile

import { SubShell } from "@/components/dcp/sub-shell";
import { Reveal } from "@/components/dcp/motion";
import { SectionMeta } from "@/components/dcp/chrome";
import { Arrow } from "@/components/dcp/icons";

interface ShipEntry {
  date: string; // YYYY-MM-DD
  tag: "feat" | "fix" | "infra" | "ux";
  title: string;
  body: string;
  commit?: string;
}

const SHIP_LOG: ShipEntry[] = [
  {
    date: "2026-05-19",
    tag: "feat",
    title: "Customer-memory wired to brief segmentation",
    body: "VIP / at-risk / lapsed counts on the morning brief now read from the live customer memory tags written by the nightly LLM analyzer, not RFM-by-activity. The agent sees what it learned.",
    commit: "44f9fe1",
  },
  {
    date: "2026-05-18",
    tag: "ux",
    title: "Owner brief rewritten for WhatsApp-native rendering",
    body: "Dropped ASCII borders, meta-AI metrics, and the 10-line command menu. Bold headings, italic eyebrow, voice-note version delivered alongside text. /help command now returns the full menu on demand.",
    commit: "f6252f0",
  },
  {
    date: "2026-05-17",
    tag: "feat",
    title: "Owner brief audio via on-device TTS",
    body: "Daily 9am brief now lands as text + voice note. Supertonic synthesizes the brief on the VPS — zero per-character cost. Sanitizes emojis and ASCII borders before synthesis.",
    commit: "898598d",
  },
  {
    date: "2026-05-16",
    tag: "feat",
    title: "Customer memory auto-refresh on every message",
    body: "Webhook fires fire-and-forget analyzer after each inbound message. Dashboard at /dashboard/customers updates live, no 2-hour cron lag.",
    commit: "fead059",
  },
  {
    date: "2026-05-16",
    tag: "feat",
    title: "Customer memory analyzer + dashboard",
    body: "Walks conversation history per customer, LLM-extracts name, language, preferences, sentiment, tags (vip / at_risk / lapsed). Three endpoints + a 2-hour safety-net cron.",
    commit: "e12ed48",
  },
  {
    date: "2026-05-16",
    tag: "feat",
    title: "On-device TTS endpoint",
    body: "POST /tts/synthesize returns WhatsApp-ready OGG opus from Supertonic v3. ~6× real-time on CPU, 31 languages, zero per-call cost.",
    commit: "17aef2b",
  },
  {
    date: "2026-05-15",
    tag: "fix",
    title: "Prompt-builder URL fallbacks corrected",
    body: "Onboarding submit + teardown routes were silently 404-ing on api.dcp.sa (reserved for DCP GPU) and the retired n8n.dcp.sa. Both now default to the actual prompt-builder.",
    commit: "a3e74a2",
  },
  {
    date: "2026-05-15",
    tag: "infra",
    title: "Phase 7: Supabase residue cleared",
    body: "Final 4 dashboard files cut over to the post-cutover API layer. New PATCH /api/agents/[id]/status. Stub libs deleted. Migration structurally complete.",
    commit: "2f499f0",
  },
  {
    date: "2026-05-15",
    tag: "feat",
    title: "Tenant-isolation audit suite",
    body: "23 tests assert no row leaks across tenants for every server-queries helper. Fixed a real leak in /api/owner/daily-pulse/send (URL-embedded clientId wasn't verified against session).",
    commit: "d54b4c9",
  },
  {
    date: "2026-05-15",
    tag: "feat",
    title: "Onboarding submit → live Kapso provisioning",
    body: "The wizard's last step now actually starts the WhatsApp setup. New tenant lands on /dashboard with status=provisioning and the WIA agent already wiring up.",
    commit: "6e6c425",
  },
  {
    date: "2026-05-14",
    tag: "feat",
    title: "Daily action queue with approval letters",
    body: "Each night the planner drafts 5–7 actions per tenant (replies, posts, outbound). Owner approves via WhatsApp reply (YES, NO, or 'A C E'). Executor drafts the deliverables in the morning.",
  },
  {
    date: "2026-05-13",
    tag: "feat",
    title: "Cron heartbeat + watchdog",
    body: "Every cron now reports start + finish to /cron/heartbeat. A 15-min watchdog pages the founder on Kapso when a critical cron misses its grace window.",
  },
  {
    date: "2026-05-12",
    tag: "feat",
    title: "Public teardown wedge live at /teardown",
    body: "Paste any UAE/Saudi SMB URL → 60-second AI-generated audit with screenshot, agent score, top 3 issues, sample WhatsApp reply, 3 IG captions. Shareable permalink.",
  },
];

function tagColor(tag: ShipEntry["tag"]): string {
  if (tag === "feat") return "#58c39c";
  if (tag === "fix") return "#c39c58";
  if (tag === "ux") return "#9f87f0";
  return "#7da8d4";
}

function ChangelogHero() {
  return (
    <section className="section hero-v2">
      <div className="container">
        <div className="hero-head">
          <span className="eyebrow">
            <span className="d" />
            Built in public · what shipped this week
          </span>
        </div>
        <Reveal as="h1" className="display tight">
          We ship every <em>day</em>.<br />
          Here is the receipt.
        </Reveal>
        <Reveal as="p" className="lede-strong" delay={120}>
          Every entry below maps to a commit on <a href="https://github.com/dhnpmp-tech/project-agent" target="_blank" rel="noreferrer">github.com/dhnpmp-tech/project-agent</a>. We dogfood the platform for Saffron Kitchen (our own restaurant) so the bugs surface before our customers see them. The agent on <code>+1 (205) 858-2516</code> runs the same code as this page.
        </Reveal>
        <Reveal as="div" className="cta-row tight" delay={200}>
          <a className="btn primary lg" href="/teardown">
            See it on your business · 60s <Arrow size={14} />
          </a>
          <a
            className="btn ghost lg"
            href="https://wa.me/12058582516?text=Hi"
            target="_blank"
            rel="noreferrer"
          >
            Text Nadia live →
          </a>
        </Reveal>
      </div>
    </section>
  );
}

function ChangelogList() {
  return (
    <section className="section section-tight">
      <div className="container">
        <SectionMeta idx="01" label="ship log" />
        <h2 className="display tight" style={{ marginBottom: 32 }}>
          The <em>last 14 days</em>
        </h2>
        <div className="ship-log">
          {SHIP_LOG.map((entry) => (
            <article key={`${entry.date}-${entry.title}`} className="ship-entry">
              <div className="ship-meta">
                <time>{entry.date}</time>
                <span
                  className="ship-tag"
                  style={{ color: tagColor(entry.tag), borderColor: tagColor(entry.tag) }}
                >
                  {entry.tag}
                </span>
                {entry.commit && (
                  <a
                    className="ship-commit"
                    href={`https://github.com/dhnpmp-tech/project-agent/commit/${entry.commit}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {entry.commit}
                  </a>
                )}
              </div>
              <h3>{entry.title}</h3>
              <p>{entry.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ChangelogPage() {
  return (
    <SubShell>
      <ChangelogHero />
      <ChangelogList />
    </SubShell>
  );
}

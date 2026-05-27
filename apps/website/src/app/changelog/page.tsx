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
    date: "2026-05-27",
    tag: "ux",
    title: "Cut the drift pages · tight navigation only",
    body: "Deleted 7 routes that didn't fit the staffing-agency narrative: /admin (marketing mockup of internal ops dashboard), /book-audit (duplicated /kickoff), and 5× /preview/* (design exploration variants). Rebranded the keepers — /privacy now reads \"Najim (operated by Project Agent FZ-LLC)\", /rami body copy reframes him as \"Najim's founder agent\", and the Ask-Rami greeting widget now answers \"Ask me anything about Najim\". Inspired by workshq.com.au — they ship five focused routes, no drift, every link earns its slot.",
    commit: "f581083",
  },
  {
    date: "2026-05-26",
    tag: "ux",
    title: "Brand rollout · Najim live across the site + /kickoff form",
    body: "Najim wordmark replaces the DCP·sa lockup in the nav (with a ★ glyph in saffron gradient). Marquee header rewritten to lead with the staffing-agency pitch in both EN and AR. \"Project Agent\" → \"Najim\" across consumer copy on homepage, pricing, /vs/chatbase, and onboarding (legal entity \"Project Agent FZ-LLC\" stays on the pricing-page signature footer). New /kickoff intake page wires every \"Schedule kickoff\" CTA into a 3-field form that opens WhatsApp with a pre-filled message to the founders — no Calendly needed yet.",
    commit: "ec2f510",
  },
  {
    date: "2026-05-26",
    tag: "ux",
    title: "Najim — the staffing-agency restructure",
    body: "Marketing site rebuilt around the verb HIRE. New hero (\"Hire your first AI employee\"), \"The Math\" section comparing AED 25,500 (three-hire status quo) vs AED 5K+3.5K (us), per-agent CV pages at /team/nadia · /team/omar · /team/layla, and a /pricing page rebuilt as a literal job-offer letter (letterhead, salary block, benefits package, founding-customer rate, signature). First appearance of the proposed brand name Najim (نجم — \"star employee\" in Riyadh dialect).",
    commit: "1e5241e",
  },
  {
    date: "2026-05-25",
    tag: "feat",
    title: "Per-language voice routing · Saudi-Arabic voice ready for Nadia",
    body: "voice_id now carries a primary + Arabic-override pair (Jessica for English, Heba Mansuri for Saudi-accent Arabic). When the reply language is detected as Arabic, the agent speaks in a native Saudi customer-care voice. Falls back to the English voice + multilingual model when library voices are tier-gated. Activates instantly the moment the ElevenLabs subscription clears.",
    commit: "3aa2286",
  },
  {
    date: "2026-05-24",
    tag: "feat",
    title: "Nadia gets a face and a voice · ElevenLabs wired per business",
    body: "Saffron's customer agent now has a real face (Recraft-generated portrait) and a real voice (ElevenLabs Jessica · warm, conversational). voice.py routes by provider prefix — el: for ElevenLabs, mm: for MiniMax. The architecture supports a unique voice per tenant — every business hires their own Nadia, not a shared template.",
    commit: "a74fbcd",
  },
  {
    date: "2026-05-23",
    tag: "infra",
    title: "Production deployment moved into git · 9 files recovered",
    body: "/opt/prompt-builder on the VPS is now a symlink to a real git checkout — future deploys are 'git pull + systemctl restart' instead of scp. Recovered voice.py, ai_video.py, arabic_tts.py, video_maker.py, requirements.txt, and 4 cron wrappers that had only ever lived on the production disk. Stripped two hardcoded Supabase JWTs left over from the pre-cutover era while we were in there.",
    commit: "cf1e3c7",
  },
  {
    date: "2026-05-22",
    tag: "ux",
    title: "Agent board · watch your teammates work in real time",
    body: "/dashboard/agent-queue is now a four-column assignment board (Awaiting your nod · Doing now · Drafts ready · Skipped). Cards move across as the cron loop picks them up and drafts the work. Auto-refreshes every 30s while the tab is visible. Same approve/skip API as before — pure presentation upgrade.",
    commit: "33687e4",
  },
  {
    date: "2026-05-22",
    tag: "fix",
    title: "Owner brain stopped treating questions as commands",
    body: "\"are you working?\" used to come back as a confused refusal. Now the brain has three new intent branches (status check, brief resend, chitchat) and the LLM fallback is reframed as a 4-way classifier — update / query / chitchat / unknown — that responds like a teammate, never like a parser. Reactive WhatsApp replies also synthesize a voice note now, mirroring the daily brief.",
    commit: "32b7b5e",
  },
  {
    date: "2026-05-20",
    tag: "feat",
    title: "Property-scraper showcase + DLD public data ingester",
    body: "Pluggable real-estate scraping service. Pydantic ListingRecord schema, async fan-out registry, SSE streaming, per-row auth_basis governance. First registered source: Dubai Land Department open data. Bayut + Property Finder slots documented as future partnership work — not shipped without explicit data-feed authorization.",
    commit: "9ec1622",
  },
  {
    date: "2026-05-20",
    tag: "feat",
    title: "Real-estate vertical teardown + Gmail OAuth dashboard",
    body: "Teardown now detects Bayut / Property Finder / Dubizzle Property URLs and produces broker-shaped audits (search profile, viewings, RERA schema, mortgage). New /dashboard/integrations/gmail OAuth page unblocks the Gmail-triage cron.",
    commit: "149fefb",
  },
  {
    date: "2026-05-20",
    tag: "feat",
    title: "Gmail triage wired into the owner brief + DAQ",
    body: "9am brief now folds in '📧 Email queue: N urgent · M hot leads'. Hot-lead threads with needs_reply auto-queue email_reply_draft rows in the daily action queue — owner approves via WhatsApp letter codes.",
    commit: "9ab6cd3",
  },
  {
    date: "2026-05-20",
    tag: "feat",
    title: "Composio Gmail triage agent",
    body: "Reads the tenant's existing Gmail every morning, classifies threads into 8 buckets (urgent / hot lead / supplier / receipt / etc.). FastAPI endpoints + cron + migration. Cost ~$0.18/month/tenant.",
    commit: "48eadb0",
  },
  {
    date: "2026-05-19",
    tag: "feat",
    title: "Real-estate teardown scaffold",
    body: "TeardownCategory union with real_estate first-class. URL detection for Bayut, Property Finder, Dubizzle Property, Propspace, .realtor.ae. RealEstateAgent + RealEstateListing schema audit. Broker-tuned B2B prompt examples.",
    commit: "13b13a7",
  },
  {
    date: "2026-05-19",
    tag: "ux",
    title: "Pricing collapsed to one offer · AED 5K/mo + AED 3.5K setup",
    body: "No tiers, no friction. Cost-comparison panel anchored against verified UAE salary medians (GulfTalent, Indeed, PayScale). Founding-customer rate AED 2.5K/mo for case-study trade.",
    commit: "e02ee62",
  },
  {
    date: "2026-05-19",
    tag: "feat",
    title: "WhatsApp-native hero · /vs/chatbase · /changelog · sticky CTA",
    body: "Hero rewritten to lead with the structural wedges (WhatsApp-native, Arabic-first, done-for-you). New comparison page targeting the chatbase-alternative long tail. Public ship-log page. Floating WhatsApp-demo CTA on every page.",
    commit: "f047577",
  },
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
          The <em>last 21 days</em>
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

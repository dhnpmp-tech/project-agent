"use client";

// /vs/chatbase — programmatic SEO comparison page.
//
// The Chatbase team won the English horizontal AI-chatbot brand keyword.
// We can't out-rank them on "chatbase" itself, but we can own the long
// tail of "chatbase vs X" + "chatbase alternative WhatsApp" + UAE/KSA-
// specific intent. Every comparison row below maps to a real structural
// gap in Chatbase's product (1 phone number per agent, $1.2K/yr white
// label, no Arabic-native, no Foodics/Tabby/Tamara). Don't soften the
// claims — every one is verifiable in their public docs.

import { SubShell } from "@/components/dcp/sub-shell";
import { Reveal } from "@/components/dcp/motion";
import { SectionMeta } from "@/components/dcp/chrome";
import { Arrow, Check } from "@/components/dcp/icons";

interface CompareRow {
  label: string;
  us: string;
  them: string;
  wins: "us" | "them" | "tie";
}

const COMPARE: CompareRow[] = [
  {
    label: "WhatsApp as a primary channel",
    us: "Native. We provision the number, handle Meta verification, and ship voice notes out of the box.",
    them: "Bolt-on integration. One Meta phone number per agent, BYO verification, 12+ step setup.",
    wins: "us",
  },
  {
    label: "Arabic language",
    us: "Native Gulf Arabic on inbound and outbound. Voice notes synthesized in Saudi-accent female voice. RTL UI throughout.",
    them: "Multi-language auto-detect via the LLM. No dialect awareness. English-first UI.",
    wins: "us",
  },
  {
    label: "Named agent · face · voice",
    us: "Every business gets a bespoke teammate — name, face, voice, and a one-page CV. The agent sends WhatsApp voice notes in her own voice. Owner can text the founder line to retune her tone in plain language.",
    them: "A chatbot with your logo. No persona, no face, no voice. The end user types into a generic widget and gets generic replies.",
    wins: "us",
  },
  {
    label: "Done-for-you onboarding",
    us: "AED 3K setup includes Meta verification, knowledge-base seeding, voice persona, and integrations.",
    them: "Self-serve only. You configure everything. Premium support reportedly slow.",
    wins: "us",
  },
  {
    label: "Multi-tenant for agencies",
    us: "Built multi-tenant from day one. Agency-friendly white label without per-tenant licensing surcharges.",
    them: "$1,188/year per workspace to remove branding. No native agency dashboard.",
    wins: "us",
  },
  {
    label: "Restaurant + retail integrations",
    us: "Foodics, SevenRooms, Tabby, Tamara, Fresha — wired to the booking and payment flow.",
    them: "Generic via Zapier. No direct integrations with UAE / KSA local SaaS.",
    wins: "us",
  },
  {
    label: "Pricing model",
    us: "Flat per-agent + setup fee. You always know what next month costs.",
    them: "Message credits across multiple tiers. Model choice changes consumption rate. Users routinely complain about unpredictable bills.",
    wins: "us",
  },
  {
    label: "Owner-side AI (proactive)",
    us: "Daily 9am owner brief on WhatsApp — text + voice note — with VIP / at-risk segmentation pulled from customer memory. Approval letters (A C E) to authorize tomorrow's actions.",
    them: "Inbox-style customer-only. No owner-channel agent.",
    wins: "us",
  },
  {
    label: "Customer memory dashboard",
    us: "Every customer gets a live profile — sentiment, preferences, key events. Updates after every message.",
    them: "Conversation history per chat. No cross-conversation customer profile.",
    wins: "us",
  },
  {
    label: "Self-improvement loop",
    us: "Nightly Karpathy loop — agent analyzes its own conversations, writes new behavioral rules, A/B tests them.",
    them: "Manual prompt tuning by the customer.",
    wins: "us",
  },
  {
    label: "Web chat widget for your site",
    us: "Included. Same agent, same memory, same persona — across WhatsApp, IG DM, and the website widget.",
    them: "Their original strength. Mature widget, lots of customization options.",
    wins: "them",
  },
  {
    label: "Function calling / API actions",
    us: "Yes — restaurant bookings, payment links, invoice creation, calendar holds.",
    them: "Mature. 5–12 actions per agent depending on tier.",
    wins: "tie",
  },
  {
    label: "English-language SEO presence",
    us: "Specialized for UAE + KSA. We do not try to outrank them on generic English keywords.",
    them: "Category-defining brand keyword. ~86K monthly searches on 'chatbase' alone.",
    wins: "them",
  },
];

function pillFor(wins: CompareRow["wins"]): { label: string; cls: string } {
  if (wins === "us") return { label: "Us", cls: "vs-pill-us" };
  if (wins === "them") return { label: "Them", cls: "vs-pill-them" };
  return { label: "Tie", cls: "vs-pill-tie" };
}

function VsHero() {
  return (
    <section className="section hero-v2">
      <div className="container">
        <div className="hero-head">
          <span className="eyebrow">
            <span className="d" />
            Project Agent vs Chatbase · honest comparison
          </span>
        </div>
        <Reveal as="h1" className="display tight">
          When does <em>Chatbase</em> stop being<br />
          the right choice?
        </Reveal>
        <Reveal as="p" className="lede-strong" delay={120}>
          Chatbase built a great <b>English horizontal AI chatbot</b> and hit $10M ARR riding the first ChatGPT wave. We built a <b>WhatsApp-native, Arabic-first, done-for-you agent platform for UAE &amp; Saudi SMBs</b>. The right answer depends on where your customers actually live. Here is the honest breakdown.
        </Reveal>
        <Reveal as="div" className="cta-row tight" delay={200}>
          <a className="btn primary lg" href="/teardown">
            See what we&apos;d do with your business · 60s <Arrow size={14} />
          </a>
          <a
            className="btn ghost lg"
            href="https://wa.me/12058582516?text=Hi"
            target="_blank"
            rel="noreferrer"
          >
            Text Nadia live on WhatsApp →
          </a>
        </Reveal>
      </div>
    </section>
  );
}

function VsTable() {
  return (
    <section className="section section-tight">
      <div className="container">
        <SectionMeta idx="01" label="the comparison" />
        <h2 className="display tight" style={{ marginBottom: 24 }}>
          Where each platform <em>wins</em>
        </h2>
        <div className="vs-table">
          {COMPARE.map((row) => {
            const pill = pillFor(row.wins);
            return (
              <div key={row.label} className="vs-row">
                <div className="vs-label">
                  <span className={`vs-pill ${pill.cls}`}>{pill.label}</span>
                  <h4>{row.label}</h4>
                </div>
                <div className="vs-cell vs-us">
                  <div className="vs-cell-h">Project Agent</div>
                  <p>{row.us}</p>
                </div>
                <div className="vs-cell vs-them">
                  <div className="vs-cell-h">Chatbase</div>
                  <p>{row.them}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function VsVerdict() {
  return (
    <section className="section section-dark">
      <div className="container">
        <SectionMeta idx="02" label="the honest verdict" />
        <h2 className="display tight" style={{ marginBottom: 24 }}>
          When to pick <em>each</em>
        </h2>
        <div className="vs-verdict">
          <div className="vs-verdict-card">
            <h3>Pick Chatbase if…</h3>
            <ul>
              <li><Check size={14} /> Your customers are English-speaking, mostly in the US or Europe.</li>
              <li><Check size={14} /> WhatsApp is a nice-to-have, not the channel where your business lives.</li>
              <li><Check size={14} /> You have an engineer to wire it up and tune prompts.</li>
              <li><Check size={14} /> You want a website chat widget first, messaging channels second.</li>
            </ul>
          </div>
          <div className="vs-verdict-card vs-verdict-us">
            <h3>Pick Project Agent if…</h3>
            <ul>
              <li><Check size={14} /> Your customers are in the UAE or Saudi Arabia and message in Arabic or both.</li>
              <li><Check size={14} /> WhatsApp <em>is</em> where the business runs — voice notes, bookings, complaints, the lot.</li>
              <li><Check size={14} /> You want a done-for-you setup, not a self-serve config marathon.</li>
              <li><Check size={14} /> You run a restaurant, salon, clinic, or retail brand using Foodics, Fresha, Tabby, or Tamara.</li>
              <li><Check size={14} /> You expect the agent to <em>also</em> brief you every morning, not just answer customers.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function VsCta() {
  return (
    <section className="section section-tight">
      <div className="container">
        <div className="vs-cta">
          <h2 className="display tight">
            Want to see what <em>your</em> business<br />looks like through our agent?
          </h2>
          <p className="lede-strong">
            Paste your URL. We crawl it, score it, draft a sample WhatsApp reply, find 5 gaps your site doesn&apos;t cover, and write the first three Instagram captions. 60 seconds, no signup.
          </p>
          <div className="cta-row tight">
            <a className="btn primary lg" href="/teardown">
              Free 60-second teardown <Arrow size={14} />
            </a>
            <a className="btn ghost lg" href="/pricing">
              See pricing
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function VsChatbasePage() {
  return (
    <SubShell>
      <VsHero />
      <VsTable />
      <VsVerdict />
      <VsCta />
    </SubShell>
  );
}

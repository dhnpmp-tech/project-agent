"use client";

// Three narrative spines for the 8-agents homepage section, stacked on one
// page so they can be compared side by side. Each section is self-contained
// (its own hero treatment + its own framing of the other 7 agents).

import { Fragment, type ReactNode } from "react";
import { SubShell } from "@/components/dcp/sub-shell";
import { AGENTS_EN as AGENTS } from "@/lib/agents-data";

const ACCENT_BY_TIER: Record<string, string> = {
  starter: "var(--info)",
  growth: "var(--teal)",
  pro: "var(--orange)",
  enterprise: "var(--err)",
};

const byId = (id: string) => AGENTS.find((a) => a.id === id)!;
const fmtHour = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

/* ─────────────────────────  Sticky compare nav  ───────────────────────── */

function PreviewNav() {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "color-mix(in oklab, var(--bg) 88%, transparent)",
        borderBottom: "1px solid var(--hair)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          gap: 28,
          alignItems: "center",
          padding: "14px 32px",
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: "var(--mut)",
        }}
      >
        <span>Compare narratives →</span>
        <a href="#a" style={{ color: "var(--ink)", textDecoration: "none" }}>
          A · Front door
        </a>
        <a href="#b" style={{ color: "var(--ink)", textDecoration: "none" }}>
          B · Day in the life
        </a>
        <a href="#c" style={{ color: "var(--ink)", textDecoration: "none" }}>
          C · Before / after
        </a>
      </div>
    </div>
  );
}

/* ─────────────────────────  Reusable section header  ───────────────────────── */

function SectionEyebrow({
  tag,
  title,
  lede,
}: {
  tag: string;
  title: ReactNode;
  lede: string;
}) {
  return (
    <div style={{ marginBottom: 56 }}>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: ".18em",
          color: "var(--mut)",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        {tag}
      </div>
      <h2
        style={{
          fontFamily: "var(--serif)",
          fontSize: 64,
          lineHeight: 1.02,
          letterSpacing: "-.02em",
          margin: "0 0 20px",
          maxWidth: "16ch",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          color: "var(--ink-2)",
          fontSize: 18,
          lineHeight: 1.6,
          maxWidth: "62ch",
          margin: 0,
        }}
      >
        {lede}
      </p>
    </div>
  );
}

/* ═════════════════════  NARRATIVE A — One front door  ═════════════════════ */

function WAChat() {
  const incoming = "#202c33";
  const outgoing = "#005c4b";
  const bg = "#0b141a";
  return (
    <div
      style={{
        background: bg,
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid var(--hair)",
        display: "flex",
        flexDirection: "column",
        minHeight: 560,
      }}
    >
      <div
        style={{
          background: "#202c33",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: "1px solid #2a3942",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--teal), var(--orange))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--mono)",
            color: "#0b141a",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: ".05em",
          }}
        >
          SK
        </div>
        <div>
          <div style={{ color: "#e9edef", fontSize: 15, fontWeight: 500 }}>
            Saffron Kitchen
          </div>
          <div style={{ color: "#8696a0", fontSize: 12 }}>online</div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: "20px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: bg,
        }}
      >
        <div style={{ alignSelf: "flex-start", maxWidth: "78%" }}>
          <div
            style={{
              background: incoming,
              color: "#e9edef",
              padding: "8px 12px 6px",
              borderRadius: "0 8px 8px 8px",
              fontSize: 14.5,
              lineHeight: 1.4,
            }}
          >
            Hi, table for 4 tonight at 7pm under Mohammed?
            <span
              style={{
                display: "block",
                textAlign: "right",
                color: "#8696a0",
                fontSize: 11,
                marginTop: 2,
              }}
            >
              19:40
            </span>
          </div>
        </div>

        <div style={{ alignSelf: "flex-end", maxWidth: "82%" }}>
          <div
            style={{
              background: outgoing,
              color: "#e9edef",
              padding: "10px 14px 8px",
              borderRadius: "8px 0 8px 8px",
              fontSize: 14.5,
              lineHeight: 1.45,
            }}
          >
            Welcome back, Mohammed Al-Qahtani — table 12 by the window, same as
            last time. Booked. Want me to set up your usual (kabsa + tamr
            hindi)?
            <span
              style={{
                display: "block",
                textAlign: "right",
                color: "#a8d4c8",
                fontSize: 11,
                marginTop: 4,
                fontFamily: "var(--mono)",
              }}
            >
              19:41 ✓✓
            </span>
          </div>
        </div>

        <div style={{ alignSelf: "flex-start", maxWidth: "78%" }}>
          <div
            style={{
              background: incoming,
              color: "#e9edef",
              padding: "8px 12px 6px",
              borderRadius: "0 8px 8px 8px",
              fontSize: 14.5,
              lineHeight: 1.4,
            }}
          >
            Yes please, you&apos;re a lifesaver.
            <span
              style={{
                display: "block",
                textAlign: "right",
                color: "#8696a0",
                fontSize: 11,
                marginTop: 2,
              }}
            >
              19:41
            </span>
          </div>
        </div>

        <div
          style={{
            alignSelf: "flex-end",
            maxWidth: "82%",
          }}
        >
          <div
            style={{
              background: outgoing,
              color: "#e9edef",
              padding: "10px 14px 8px",
              borderRadius: "8px 0 8px 8px",
              fontSize: 14.5,
              lineHeight: 1.45,
            }}
          >
            Locked in. I&apos;ll send Owner a heads-up so the kitchen prepares
            yours first.
            <span
              style={{
                display: "block",
                textAlign: "right",
                color: "#a8d4c8",
                fontSize: 11,
                marginTop: 4,
                fontFamily: "var(--mono)",
              }}
            >
              19:41 ✓✓
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Attribution() {
  const items = [
    { id: "whatsapp", contribution: "Spoke to him in your brand voice, Gulf-tuned" },
    { id: "owner", contribution: "Confirmed table 12 was free, queued the kitchen heads-up" },
    { id: "multi", contribution: "Pulled context from his Instagram DM last week" },
    { id: "content", contribution: "Knew kabsa is on tonight's menu (read today's plan)" },
  ];
  return (
    <div
      style={{
        background: "var(--paper)",
        border: "1px solid var(--hair)",
        borderRadius: 16,
        padding: 36,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: ".18em",
          color: "var(--teal)",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        Behind that one reply
      </div>
      <h3
        style={{
          fontFamily: "var(--serif)",
          fontSize: 32,
          lineHeight: 1.1,
          margin: "0 0 28px",
          letterSpacing: "-.01em",
        }}
      >
        Four specialists collaborated.
      </h3>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {items.map((it) => {
          const a = byId(it.id);
          const accent = ACCENT_BY_TIER[a.tier];
          return (
            <li
              key={it.id}
              style={{ display: "flex", gap: 14, alignItems: "flex-start" }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  border: `1px solid ${accent}`,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  color: accent,
                  background: `color-mix(in oklab, ${accent} 8%, transparent)`,
                }}
              >
                {a.monogram}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--ink)",
                    marginBottom: 2,
                  }}
                >
                  {a.name}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--ink-2)",
                    lineHeight: 1.45,
                  }}
                >
                  {it.contribution}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div
        style={{
          marginTop: "auto",
          paddingTop: 28,
          borderTop: "1px solid var(--hair)",
          fontSize: 13.5,
          color: "var(--mut)",
          lineHeight: 1.55,
          marginInlineStart: 0,
        }}
      >
        The customer never sees the seam. To them it&apos;s one person. To you
        it&apos;s a team that never sleeps and never forgets.
      </div>
    </div>
  );
}

function FrontDoorStrip() {
  const seven = AGENTS.filter((a) => a.id !== "whatsapp");
  return (
    <div style={{ marginTop: 72 }}>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: ".16em",
          color: "var(--mut)",
          textTransform: "uppercase",
          marginBottom: 18,
        }}
      >
        The other 7 specialists behind the door
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        {seven.map((a) => {
          const accent = ACCENT_BY_TIER[a.tier];
          return (
            <article
              key={a.id}
              style={{
                background: "var(--paper)",
                border: "1px solid var(--hair)",
                borderRadius: 12,
                padding: "22px 22px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    border: `1px solid ${accent}`,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    color: accent,
                    background: `color-mix(in oklab, ${accent} 8%, transparent)`,
                    flexShrink: 0,
                  }}
                >
                  {a.monogram}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      letterSpacing: ".14em",
                      color: "var(--mut)",
                      textTransform: "uppercase",
                    }}
                  >
                    {a.code} · {a.tier}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--serif)",
                      fontSize: 19,
                      lineHeight: 1.2,
                    }}
                  >
                    {a.name}
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  color: "var(--ink)",
                  fontWeight: 600,
                  lineHeight: 1.4,
                }}
              >
                {a.pitch}
              </div>
            </article>
          );
        })}
        <a
          href="/services"
          style={{
            background:
              "color-mix(in oklab, var(--teal) 10%, var(--paper))",
            border: "1px solid var(--teal)",
            borderRadius: 12,
            padding: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            color: "var(--teal)",
            fontFamily: "var(--mono)",
            fontSize: 12,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          See all 8 in detail →
        </a>
      </div>
    </div>
  );
}

function NarrativeA() {
  return (
    <section
      id="a"
      className="section"
      style={{ borderBottom: "1px solid var(--hair)" }}
    >
      <div className="container">
        <SectionEyebrow
          tag="Narrative A · One front door"
          title={
            <>
              <em>One front door.</em>
              <br /> A team behind it.
            </>
          }
          lede="Customers reach you on WhatsApp — that is the front door. Behind that one number, eight specialists work in concert, sharing memory and splitting jobs, so no customer ever has to repeat themselves."
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 1fr",
            gap: 28,
            alignItems: "stretch",
          }}
        >
          <WAChat />
          <Attribution />
        </div>
        <FrontDoorStrip />
      </div>
    </section>
  );
}

/* ═════════════════════  NARRATIVE B — Day in the life  ═════════════════════ */

const SCENES = [
  {
    hour: 6,
    agent: "content",
    title: "Today's reel publishes",
    desc: "The photo Owner snapped last night becomes a 9-second reel, an Instagram post, and a story.",
  },
  {
    hour: 9,
    agent: "owner",
    title: "Morning brief lands",
    desc: "Situation, complication, key question, recommended action — on Owner's WhatsApp. 90 seconds to read.",
  },
  {
    hour: 11,
    agent: "hr",
    title: "23 CVs scored, 4 worth interviewing",
    desc: "Decline emails sent in your tone. The four interviews are already booked into your real calendar.",
  },
  {
    hour: 14,
    agent: "voice",
    title: "Voice note from a Saudi regular",
    desc: "Transcribed in native Gulf Arabic, replied in matching warmth — in the agent's own voice.",
  },
  {
    hour: 17,
    agent: "sales",
    title: "Hot lead flagged",
    desc: "Score 91. Personalized outreach drafted. Owner replies one word: send.",
  },
  {
    hour: 19.7,
    agent: "whatsapp",
    title: "Mohammed's table booked",
    desc: "WhatsApp Agent recognized his number, confirmed table 12, queued his usual. He never had to ask.",
  },
  {
    hour: 22.5,
    agent: "multi",
    title: "Late-night DM picks up where it left off",
    desc: "Customer DM'd Instagram at noon, switched to WhatsApp at night. One thread. One memory.",
  },
];

function HourRail() {
  const hours = [6, 9, 12, 15, 18, 21, 24];
  return (
    <div
      style={{
        position: "relative",
        height: 56,
        marginBottom: 32,
        background: "var(--bg-2)",
        border: "1px solid var(--hair)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "2%",
          right: "2%",
          top: "50%",
          height: 1,
          background:
            "linear-gradient(90deg, transparent, var(--hair) 8%, var(--hair) 92%, transparent)",
        }}
      />
      {hours.map((h) => {
        const left = ((h - 6) / 18) * 96 + 2;
        return (
          <div
            key={h}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 1,
                height: 12,
                background: "var(--mut)",
                opacity: 0.4,
              }}
            />
            <div
              style={{
                marginInlineStart: 6,
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "var(--mut)",
                letterSpacing: ".05em",
              }}
            >
              {h === 24 ? "00:00" : `${String(h).padStart(2, "0")}:00`}
            </div>
          </div>
        );
      })}
      {SCENES.map((s, i) => {
        const left = ((s.hour - 6) / 18) * 96 + 2;
        const a = byId(s.agent);
        const accent = ACCENT_BY_TIER[a.tier];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(${left}% - 6px)`,
              top: "50%",
              transform: "translateY(-50%)",
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: accent,
              boxShadow: `0 0 0 4px color-mix(in oklab, ${accent} 22%, transparent)`,
            }}
          />
        );
      })}
    </div>
  );
}

function DayTimeline() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "92px 1fr",
        columnGap: 24,
        rowGap: 0,
      }}
    >
      {SCENES.map((s, i) => {
        const a = byId(s.agent);
        const accent = ACCENT_BY_TIER[a.tier];
        return (
          <Fragment key={i}>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 14,
                color: "var(--mut)",
                paddingTop: 26,
                textAlign: "right",
                letterSpacing: ".02em",
              }}
            >
              {fmtHour(s.hour)}
            </div>
            <article
              style={{
                background: "var(--paper)",
                border: "1px solid var(--hair)",
                borderInlineStart: `3px solid ${accent}`,
                borderRadius: 10,
                padding: "22px 26px",
                marginBottom: 14,
                display: "flex",
                gap: 18,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  border: `1px solid ${accent}`,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--mono)",
                  fontSize: 13,
                  color: accent,
                  background: `color-mix(in oklab, ${accent} 8%, transparent)`,
                  flexShrink: 0,
                }}
              >
                {a.monogram}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10.5,
                    letterSpacing: ".14em",
                    color: "var(--mut)",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  {a.name} · {a.code}
                </div>
                <h4
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: 24,
                    lineHeight: 1.15,
                    letterSpacing: "-.01em",
                    margin: "0 0 8px",
                  }}
                >
                  {s.title}
                </h4>
                <p
                  style={{
                    fontSize: 14.5,
                    color: "var(--ink-2)",
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {s.desc}
                </p>
              </div>
            </article>
          </Fragment>
        );
      })}
    </div>
  );
}

function NarrativeB() {
  return (
    <section
      id="b"
      className="section"
      style={{ borderBottom: "1px solid var(--hair)" }}
    >
      <div className="container">
        <SectionEyebrow
          tag="Narrative B · Day in the life"
          title={
            <>
              <em>From 6am to midnight,</em>
              <br /> your business runs itself.
            </>
          }
          lede="One day at Saffron Kitchen. From the 06:00 reel to the 22:30 last-order rush, every agent on the team is firing — and they all share the same memory of every customer who walked in, called, or messaged."
        />
        <HourRail />
        <DayTimeline />
        <div
          style={{
            marginTop: 32,
            padding: "20px 24px",
            background: "var(--paper)",
            border: "1px solid var(--hair)",
            borderRadius: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 14.5,
              color: "var(--ink-2)",
              lineHeight: 1.5,
            }}
          >
            All 8 agents firing in parallel. One owner. One shared brain. One
            continuous workday.
          </div>
          <a
            href="/process"
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              letterSpacing: ".14em",
              color: "var(--teal)",
              textTransform: "uppercase",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            How a day gets set up →
          </a>
        </div>
      </div>
    </section>
  );
}

/* ═════════════════════  NARRATIVE C — Before / after  ═════════════════════ */

const BEFORE_ITEMS = [
  "27 unanswered WhatsApp messages from today",
  "4 missed calls, no callbacks",
  "3 negative Google reviews still unresponded after 48h",
  "11 Instagram DMs from leads gone cold",
  "Tomorrow's content not planned",
  "No idea what last week's revenue actually was",
  "12 CVs piling in the inbox, no time to read",
];
const AFTER_ITEMS = [
  "All 27 replied — average response 38 seconds",
  "Calls greeted, callbacks scheduled in your calendar",
  "Reviews answered in your tone within 2 hours",
  "Each DM scored 1–100, hot ones converted, cold ones nurtured",
  "Tomorrow's reel and 3 stories already queued",
  "Sunday brief: revenue up 12%, seafood spike flagged",
  "23 CVs screened, 4 interviews booked into your calendar",
];

const BEFORE_AFTER: Record<string, { before: string; after: string }> = {
  owner: {
    before:
      "Open laptop at 9am, dig through 6 dashboards to know what's going on.",
    after:
      "9am brief on WhatsApp. Situation, complication, recommendation. 90 seconds.",
  },
  sales: {
    before:
      "Hot lead emails you Friday 7pm. You see it Monday 11am. Lead is gone.",
    after:
      "Lead scored in 12 seconds, personalized outreach sent in 3 minutes.",
  },
  content: {
    before: "Last social post: 11 days ago. You meant to. You didn't.",
    after:
      "Daily reel + 3 stories live. You snap one photo. Captions write themselves.",
  },
  hr: {
    before:
      "23 CVs in the weekend pile. You skim 5, stop. Hiring stalls another week.",
    after:
      "All 23 read by Monday 6am. 4 interviews already in your calendar.",
  },
  finance: {
    before:
      "Month closes. Accountant calls. Seafood spiked 18% three weeks ago.",
    after:
      "Sunday brief flagged it the morning it happened. Supplier already swapped.",
  },
  voice: {
    before:
      "Saudi regular sends a 38-second voice note. You skip it. You forget.",
    after:
      "Transcribed, understood, replied in matching warmth — in Gulf Arabic.",
  },
  multi: {
    before:
      "Customer DMs Instagram at noon, WhatsApp at 8pm. Two strangers.",
    after:
      "One conversation. One memory. The agent picks up mid-thought.",
  },
};

function PanelBefore() {
  return (
    <div
      style={{
        background:
          "color-mix(in oklab, var(--err) 5%, var(--bg-2))",
        border:
          "1px solid color-mix(in oklab, var(--err) 28%, var(--hair))",
        borderRadius: 16,
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: ".18em",
          color: "var(--err)",
          textTransform: "uppercase",
        }}
      >
        Before · Friday 23:41
      </div>
      <h3
        style={{
          fontFamily: "var(--serif)",
          fontSize: 30,
          lineHeight: 1.15,
          letterSpacing: "-.01em",
          margin: 0,
          color: "color-mix(in oklab, var(--ink) 78%, transparent)",
        }}
      >
        The pile that ruins your weekend.
      </h3>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {BEFORE_ITEMS.map((it) => (
          <li
            key={it}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              fontSize: 14.5,
              lineHeight: 1.5,
              color: "color-mix(in oklab, var(--ink-2) 92%, transparent)",
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                background:
                  "color-mix(in oklab, var(--err) 18%, transparent)",
                border:
                  "1px solid color-mix(in oklab, var(--err) 60%, transparent)",
                flexShrink: 0,
                marginTop: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--err)",
                fontFamily: "var(--mono)",
                fontSize: 12,
                lineHeight: 1,
              }}
            >
              ×
            </span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PanelAfter() {
  return (
    <div
      style={{
        background: "color-mix(in oklab, var(--teal) 4%, var(--paper))",
        border:
          "1px solid color-mix(in oklab, var(--teal) 35%, var(--hair))",
        borderRadius: 16,
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 95% 5%, color-mix(in oklab, var(--teal) 14%, transparent), transparent 55%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: ".18em",
            color: "var(--teal)",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Now · Friday 23:41 with agents
        </div>
        <h3
          style={{
            fontFamily: "var(--serif)",
            fontSize: 30,
            lineHeight: 1.15,
            letterSpacing: "-.01em",
            margin: 0,
          }}
        >
          You closed your laptop at 6pm.
        </h3>
      </div>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          position: "relative",
          zIndex: 1,
        }}
      >
        {AFTER_ITEMS.map((it) => (
          <li
            key={it}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              fontSize: 14.5,
              lineHeight: 1.5,
              color: "var(--ink)",
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                background:
                  "color-mix(in oklab, var(--teal) 22%, transparent)",
                border: "1px solid var(--teal)",
                flexShrink: 0,
                marginTop: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--teal)",
                fontFamily: "var(--mono)",
                fontSize: 11,
                lineHeight: 1,
              }}
            >
              ✓
            </span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniBeforeAfter({ id }: { id: string }) {
  const a = byId(id);
  const accent = ACCENT_BY_TIER[a.tier];
  const ba = BEFORE_AFTER[id];
  if (!ba) return null;
  return (
    <article
      style={{
        background: "var(--paper)",
        border: "1px solid var(--hair)",
        borderRadius: 12,
        padding: "22px 24px",
        display: "grid",
        gridTemplateColumns: "44px 1fr",
        gap: 18,
        alignItems: "start",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          border: `1px solid ${accent}`,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--mono)",
          fontSize: 13,
          color: accent,
          background: `color-mix(in oklab, ${accent} 8%, transparent)`,
        }}
      >
        {a.monogram}
      </div>
      <div>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            letterSpacing: ".14em",
            color: "var(--mut)",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          {a.name}
        </div>
        <div
          style={{
            fontSize: 14.5,
            lineHeight: 1.5,
            color: "var(--ink-2)",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              color: "var(--err)",
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              marginInlineEnd: 8,
              letterSpacing: ".14em",
            }}
          >
            BEFORE
          </span>
          {ba.before}
        </div>
        <div
          style={{
            fontSize: 14.5,
            lineHeight: 1.5,
            color: "var(--ink)",
          }}
        >
          <span
            style={{
              color: "var(--teal)",
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              marginInlineEnd: 8,
              letterSpacing: ".14em",
            }}
          >
            NOW
          </span>
          {ba.after}
        </div>
      </div>
    </article>
  );
}

function NarrativeC() {
  const seven = AGENTS.filter((a) => a.id !== "whatsapp");
  return (
    <section id="c" className="section">
      <div className="container">
        <SectionEyebrow
          tag="Narrative C · Before / after"
          title={
            <>
              <em>What you used to do.</em>
              <br /> What now does it for you.
            </>
          }
          lede="Friday night, 23:41. The before: a notification list that ruins your weekend. The after: silence. Same business, same volume — different operator."
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
          }}
        >
          <PanelBefore />
          <PanelAfter />
        </div>
        <div style={{ marginTop: 72 }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: ".16em",
              color: "var(--mut)",
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            One agent at a time
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 16,
            }}
          >
            {seven.map((a) => (
              <MiniBeforeAfter key={a.id} id={a.id} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────  Page export  ───────────────────────── */

export default function PreviewAgentsNarrativesPage() {
  return (
    <SubShell>
      <PreviewNav />
      <NarrativeA />
      <NarrativeB />
      <NarrativeC />
    </SubShell>
  );
}

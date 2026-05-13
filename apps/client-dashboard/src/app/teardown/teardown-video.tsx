// Animated teardown summary — frame-driven Remotion composition that
// plays the score reveal, badges, top complaint, and CTA. Embedded
// in the permalink page as an in-browser <Player>.
//
// 10s at 30fps = 300 frames total.
//   00-30  business name fades up
//   30-90  score gauge counts 0 → final, ring fills
//   90-120 grade pill drops in
//   120-180 top 3 badges slide in
//   180-260 top complaint with typed-out drafted reply
//   260-300 CTA + agent signoff
//
// Pure client-side render via @remotion/player — no FFmpeg, no server-
// side render. Server-side MP4 export is queued for next push.

"use client";

import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import type { TeardownPackage } from "./teardown-report";

const GRADE_FG: Record<string, string> = {
  "A+": "#1e6d3d",
  A: "#1e6d3d",
  B: "#5d8a4a",
  C: "#a07232",
  D: "#a07232",
  F: "#a83a2b",
};
const GRADE_BG: Record<string, string> = {
  "A+": "#dfeede",
  A: "#dfeede",
  B: "#e9f0dd",
  C: "#f4e4cb",
  D: "#fdf3e3",
  F: "#f4d6cf",
};

export const TEARDOWN_VIDEO_FPS = 30;
export const TEARDOWN_VIDEO_DURATION = 300; // 10 seconds

export function TeardownVideoComposition({ pkg }: { pkg: TeardownPackage }) {
  return (
    <AbsoluteFill style={{ background: "#f6f3eb", fontFamily: "Georgia, serif" }}>
      <Sequence from={0} durationInFrames={300}>
        <BusinessNameIntro pkg={pkg} />
      </Sequence>
      <Sequence from={30} durationInFrames={270}>
        <ScoreReveal pkg={pkg} />
      </Sequence>
      <Sequence from={120} durationInFrames={180}>
        <BadgesFlyIn pkg={pkg} />
      </Sequence>
      <Sequence from={180} durationInFrames={120}>
        <ComplaintReveal pkg={pkg} />
      </Sequence>
      <Sequence from={260} durationInFrames={40}>
        <CtaOutro pkg={pkg} />
      </Sequence>
    </AbsoluteFill>
  );
}

function BusinessNameIntro({ pkg }: { pkg: TeardownPackage }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Fade in over the first 30 frames, then linger
  const opacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const translateY = spring({ frame, fps, config: { damping: 100 } }) * 0 +
    interpolate(frame, [0, 25], [20, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 60,
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "ui-monospace, SF Mono, monospace",
            fontSize: 14,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#837c69",
            marginBottom: 12,
          }}
        >
          § agents.dcp.sa · day-one teardown
        </div>
        <div style={{ fontSize: 28, color: "#514c40", marginBottom: 8 }}>
          What an AI agent would do with
        </div>
        <div
          style={{
            fontSize: 56,
            lineHeight: 1.05,
            color: "#1d1c18",
            maxWidth: 800,
          }}
        >
          {pkg.business_name}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function ScoreReveal({ pkg }: { pkg: TeardownPackage }) {
  const frame = useCurrentFrame();
  const score = pkg.agent_score?.overall ?? 0;
  const grade = pkg.agent_score?.grade ?? "?";

  // Frame 0-60 (local to this sequence): score counts 0 → final
  const counted = Math.round(
    interpolate(frame, [0, 60], [0, score], { extrapolateRight: "clamp" })
  );
  // Ring growth from 0 to score
  const ringProgress = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" });
  const C = 2 * Math.PI * 76;
  const ringOffset = C - C * ringProgress * (score / 100);

  // Grade pill drops in around frame 60
  const gradeOpacity = interpolate(frame, [60, 75], [0, 1], { extrapolateRight: "clamp" });
  const gradeY = interpolate(frame, [60, 75], [-30, 0], { extrapolateRight: "clamp" });

  const palette = { fg: GRADE_FG[grade] || "#837c69", bg: GRADE_BG[grade] || "#ece8db" };

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 240,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <svg width="200" height="200" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="76" fill="none" stroke="#d8d2bf" strokeWidth="12" />
          <circle
            cx="100"
            cy="100"
            r="76"
            fill="none"
            stroke={palette.fg}
            strokeWidth="12"
            strokeDasharray={C}
            strokeDashoffset={ringOffset}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
          />
          <text
            x="100"
            y="108"
            textAnchor="middle"
            style={{ fontFamily: "Georgia, serif", fontSize: 52, fill: palette.fg }}
          >
            {counted}
          </text>
          <text
            x="100"
            y="132"
            textAnchor="middle"
            style={{
              fontFamily: "ui-monospace, SF Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.14em",
              fill: "#837c69",
            }}
          >
            AGENT SCORE
          </text>
        </svg>
        <div
          style={{
            opacity: gradeOpacity,
            transform: `translateY(${gradeY}px)`,
            padding: "10px 26px",
            background: palette.bg,
            color: palette.fg,
            fontSize: 36,
            lineHeight: 1,
            borderRadius: 8,
          }}
        >
          Grade {grade}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function BadgesFlyIn({ pkg }: { pkg: TeardownPackage }) {
  const frame = useCurrentFrame();
  const badges = pkg.badges?.slice(0, 4) ?? [];
  if (badges.length === 0) return null;
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: 120,
      }}
    >
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", maxWidth: 760 }}>
        {badges.map((b, i) => {
          const start = i * 8;
          const opacity = interpolate(frame, [start, start + 16], [0, 1], { extrapolateRight: "clamp" });
          const tx = interpolate(frame, [start, start + 16], [80, 0], { extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                opacity,
                transform: `translateX(${tx}px)`,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                background: "#fbfaf4",
                border: "1px solid #d8d2bf",
                borderRadius: 999,
              }}
            >
              <span style={{ fontSize: 20 }}>{b.emoji}</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#1d1c18" }}>{b.label}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function ComplaintReveal({ pkg }: { pkg: TeardownPackage }) {
  const frame = useCurrentFrame();
  const complaint = pkg.reviews?.top_complaints?.[0];
  if (!complaint) return null;

  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const draftChars = Math.floor(interpolate(frame, [25, 100], [0, complaint.draft_response.length]));
  const draftText = complaint.draft_response.slice(0, draftChars);

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 100,
        paddingLeft: 60,
        paddingRight: 60,
        opacity,
      }}
    >
      <div style={{ maxWidth: 800 }}>
        <div
          style={{
            fontFamily: "ui-monospace, SF Mono, monospace",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#a83a2b",
            marginBottom: 10,
          }}
        >
          your customers say
        </div>
        <div
          style={{
            fontSize: 24,
            fontStyle: "italic",
            color: "#1d1c18",
            marginBottom: 18,
            paddingLeft: 14,
            borderLeft: "3px solid #d8d2bf",
          }}
        >
          &ldquo;{complaint.sample_quote}&rdquo;
        </div>
        <div
          style={{
            fontFamily: "ui-monospace, SF Mono, monospace",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#1e6d3d",
            marginBottom: 6,
          }}
        >
          your agent will reply
        </div>
        <div style={{ fontSize: 18, lineHeight: 1.5, color: "#1d1c18" }}>
          {draftText}
          {draftChars < complaint.draft_response.length && <span style={{ opacity: 0.5 }}>▌</span>}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function CtaOutro({ pkg: _pkg }: { pkg: TeardownPackage }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          transform: `scale(${scale})`,
          background: "#1d1c18",
          color: "#fbfaf4",
          padding: "20px 32px",
          borderRadius: 12,
          fontSize: 22,
          textAlign: "center",
          maxWidth: 600,
        }}
      >
        <div style={{ fontSize: 16, color: "#837c69", marginBottom: 8, letterSpacing: "0.06em" }}>
          this was 60 seconds of agent work
        </div>
        Get me running 30 days of this for your business →
      </div>
    </AbsoluteFill>
  );
}

// ============================================================================
// Player wrapper — lazy-loaded client component embedded in the report.
// ============================================================================

export function TeardownVideoPlayer({ pkg }: { pkg: TeardownPackage }) {
  const [mounted, setMounted] = useState(false);
  const [Player, setPlayer] = useState<React.ComponentType<{
    component: React.ComponentType<{ pkg: TeardownPackage }>;
    inputProps: { pkg: TeardownPackage };
    durationInFrames: number;
    compositionWidth: number;
    compositionHeight: number;
    fps: number;
    style?: React.CSSProperties;
    controls?: boolean;
    autoPlay?: boolean;
    loop?: boolean;
  }> | null>(null);

  useEffect(() => {
    setMounted(true);
    // Dynamic import keeps the Player out of the initial bundle —
    // ~80KB only loads when an agent_score is present.
    import("@remotion/player").then((mod) => {
      setPlayer(() => mod.Player as never);
    });
  }, []);

  if (!mounted || !Player || !pkg.agent_score) return null;

  return (
    <section
      style={{
        background: "var(--paper-card, #fbfaf4)",
        border: "1px solid var(--paper-line, #d8d2bf)",
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontFamily: "var(--mono, ui-monospace)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--paper-mut, #837c69)",
          marginBottom: 10,
        }}
      >
        § the 10-second summary
      </div>
      <Player
        component={TeardownVideoComposition}
        inputProps={{ pkg }}
        durationInFrames={TEARDOWN_VIDEO_DURATION}
        compositionWidth={1200}
        compositionHeight={630}
        fps={TEARDOWN_VIDEO_FPS}
        style={{
          width: "100%",
          aspectRatio: "1200/630",
          borderRadius: 6,
          overflow: "hidden",
        }}
        controls
        autoPlay
        loop
      />
    </section>
  );
}

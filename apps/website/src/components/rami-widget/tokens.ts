/**
 * Design tokens for the Ask Rami widget.
 *
 * Sourced from the dark/emerald site theme — keep these synced with
 * `tailwind.config.ts` if any color shifts upstream.
 */
export const tokens = {
  color: {
    bg: "#0a0a0a",
    panel: "#18181b",
    panelHover: "#27272a",
    text: "#fafafa",
    textMuted: "#a1a1aa",
    accent: "#10b981",
    accentHover: "#059669",
    border: "#27272a",
    userBubble: "#064e3b",
  },
  size: {
    pill: 56,
    cardWidth: 380,
    cardHeight: 600,
    headerHeight: 56,
    footerHeight: 36,
    edgeGap: 16,
  },
  motion: {
    pulseDurationMs: 2000,
    fadeMs: 180,
    slideMs: 220,
  },
} as const;

export type RamiTokens = typeof tokens;

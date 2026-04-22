"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { tokens } from "./tokens";

const DWELL_MS = 60_000;

const LABEL = {
  en: "Ask Rami — chat with the CEO",
  ar: "اسأل رامي — تحدث مع الرئيس التنفيذي",
} as const;

export interface PillProps {
  onClick: () => void;
  lang: "en" | "ar";
}

/**
 * Closed-state floating pill. Pulses gently after 60s of dwell on the page,
 * unless the user has `prefers-reduced-motion` set.
 */
export function Pill({ onClick, lang }: PillProps) {
  const reduceMotion = useReducedMotion();
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setPulsing(true), DWELL_MS);
    return () => window.clearTimeout(id);
  }, []);

  const shouldAnimate = pulsing && !reduceMotion;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={LABEL[lang]}
      data-pulsing={pulsing}
      animate={
        shouldAnimate
          ? { scale: [1, 1.06, 1], boxShadow: [
              `0 0 0 0 ${tokens.color.accent}66`,
              `0 0 0 12px ${tokens.color.accent}00`,
              `0 0 0 0 ${tokens.color.accent}00`,
            ] }
          : { scale: 1 }
      }
      transition={
        shouldAnimate
          ? {
              duration: tokens.motion.pulseDurationMs / 1000,
              repeat: Infinity,
              ease: "easeInOut",
            }
          : { duration: 0 }
      }
      style={{
        position: "fixed",
        bottom: tokens.size.edgeGap,
        insetInlineEnd: tokens.size.edgeGap,
        width: tokens.size.pill,
        height: tokens.size.pill,
        borderRadius: "9999px",
        background: tokens.color.accent,
        color: tokens.color.text,
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </motion.button>
  );
}

"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { tokens } from "./tokens";
import { detectDir } from "./dir-rtl-detect";

export interface InputProps {
  lang: "en" | "ar";
  onLangChange: (lang: "en" | "ar") => void;
  onSubmit: (text: string) => void;
  disabled: boolean;
}

const MAX_LINES = 4;
const LINE_HEIGHT_PX = 20;
const PADDING_Y = 16; // 8 top + 8 bottom

const PLACEHOLDER = {
  en: "Ask Rami…",
  ar: "اسأل رامي…",
} as const;

export function Input({ lang, onLangChange, onSubmit, disabled }: InputProps) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const dir = detectDir(text);

  // Auto-grow up to MAX_LINES
  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    const max = MAX_LINES * LINE_HEIGHT_PX + PADDING_Y;
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`;
  }, [text]);

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const trimmed = text.trim();
      if (!trimmed || disabled) return;
      onSubmit(trimmed);
      setText("");
    }
  }

  return (
    <div
      style={{
        borderTop: `1px solid ${tokens.color.border}`,
        background: tokens.color.bg,
        padding: 12,
        display: "flex",
        gap: 8,
        alignItems: "flex-end",
      }}
    >
      <button
        type="button"
        onClick={() => onLangChange(lang === "en" ? "ar" : "en")}
        aria-label={lang === "en" ? "Switch to Arabic" : "Switch to English"}
        style={{
          flexShrink: 0,
          height: 32,
          padding: "0 10px",
          borderRadius: 6,
          border: `1px solid ${tokens.color.border}`,
          background: tokens.color.panel,
          color: tokens.color.textMuted,
          fontSize: 11,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {lang === "en" ? "AR" : "EN"}
      </button>
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled}
        rows={1}
        dir={dir}
        placeholder={PLACEHOLDER[lang]}
        aria-label={PLACEHOLDER[lang]}
        style={{
          flex: 1,
          resize: "none",
          padding: "8px 12px",
          background: tokens.color.panel,
          color: tokens.color.text,
          border: `1px solid ${tokens.color.border}`,
          borderRadius: 8,
          fontSize: 14,
          lineHeight: `${LINE_HEIGHT_PX}px`,
          fontFamily: "inherit",
          outline: "none",
        }}
      />
    </div>
  );
}

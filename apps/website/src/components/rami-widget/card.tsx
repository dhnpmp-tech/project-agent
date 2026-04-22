"use client";

import { type ReactNode } from "react";
import { tokens } from "./tokens";

export interface CardProps {
  lang: "en" | "ar";
  onLangChange: (lang: "en" | "ar") => void;
  onMinimize: () => void;
  onClose: () => void;
  onShowIdentity: () => void;
  children: ReactNode;
}

export function Card({
  lang,
  onMinimize,
  onClose,
  onShowIdentity,
  children,
}: CardProps) {
  return (
    <div
      role="dialog"
      aria-label="Ask Rami"
      style={{
        position: "fixed",
        bottom: tokens.size.edgeGap,
        insetInlineEnd: tokens.size.edgeGap,
        width: tokens.size.cardWidth,
        height: tokens.size.cardHeight,
        maxWidth: `calc(100vw - ${tokens.size.edgeGap * 2}px)`,
        maxHeight: `calc(100vh - ${tokens.size.edgeGap * 2}px)`,
        background: tokens.color.bg,
        color: tokens.color.text,
        border: `1px solid ${tokens.color.border}`,
        borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <header
        style={{
          height: tokens.size.headerHeight,
          padding: "0 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: `1px solid ${tokens.color.border}`,
          background: tokens.color.panel,
        }}
      >
        <div
          aria-hidden
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: tokens.color.accent,
            color: tokens.color.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          R
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, lineHeight: 1.2 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Rami Mansour</span>
          <span style={{ fontSize: 11, color: tokens.color.textMuted }}>
            AI co-founder · live data
          </span>
        </div>
        <button
          type="button"
          onClick={onShowIdentity}
          aria-label="What Rami remembers"
          style={{
            background: "transparent",
            border: "none",
            color: tokens.color.textMuted,
            cursor: "pointer",
            padding: 4,
            fontSize: 14,
          }}
        >
          ⓘ
        </button>
        <button
          type="button"
          onClick={onMinimize}
          aria-label="Minimize"
          style={{
            background: "transparent",
            border: "none",
            color: tokens.color.textMuted,
            cursor: "pointer",
            padding: 4,
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          –
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            background: "transparent",
            border: "none",
            color: tokens.color.textMuted,
            cursor: "pointer",
            padding: 4,
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </header>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
        {children}
      </div>
    </div>
  );
}

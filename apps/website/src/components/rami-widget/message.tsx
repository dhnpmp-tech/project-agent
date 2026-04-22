"use client";

import { Fragment } from "react";
import { tokens } from "./tokens";

export type MessageRole = "user" | "assistant" | "tool";

export interface MessageProps {
  role: MessageRole;
  content: string;
}

const NUMBER_RE = /(\d[\d,]*(?:\.\d+)?%?|AED\s?\d[\d,]*(?:\.\d+)?)/g;

function renderWithMonoNumbers(text: string) {
  const parts = text.split(NUMBER_RE);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <span
          key={i}
          data-mono
          style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}
        >
          {part}
        </span>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function Message({ role, content }: MessageProps) {
  if (role === "tool") {
    return (
      <div
        data-role="tool"
        style={{
          alignSelf: "flex-start",
          padding: "4px 10px",
          borderRadius: 999,
          border: `1px solid ${tokens.color.border}`,
          background: tokens.color.panel,
          color: tokens.color.textMuted,
          fontSize: 12,
          fontStyle: "italic",
        }}
      >
        🔍 {content}
      </div>
    );
  }

  if (role === "user") {
    return (
      <div
        data-role="user"
        style={{
          alignSelf: "flex-end",
          maxWidth: "85%",
          padding: "8px 12px",
          borderRadius: 12,
          background: tokens.color.userBubble,
          color: tokens.color.text,
          fontSize: 14,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {renderWithMonoNumbers(content)}
      </div>
    );
  }

  // assistant
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        alignSelf: "flex-start",
        maxWidth: "100%",
      }}
    >
      <div
        data-avatar
        aria-hidden
        style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: tokens.color.accent,
          color: tokens.color.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        R
      </div>
      <div
        data-role="assistant"
        style={{
          alignSelf: "flex-start",
          maxWidth: "85%",
          padding: "8px 12px",
          borderRadius: 12,
          background: tokens.color.panel,
          color: tokens.color.text,
          fontSize: 14,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {renderWithMonoNumbers(content)}
      </div>
    </div>
  );
}

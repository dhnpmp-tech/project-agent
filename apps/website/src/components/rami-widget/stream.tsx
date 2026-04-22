"use client";

import { useEffect, useRef } from "react";
import { Message, type MessageRole } from "./message";
import { tokens } from "./tokens";

export interface StreamMessage {
  id: string;
  role: MessageRole;
  content: string;
}

export interface StreamProps {
  messages: StreamMessage[];
  streamingText: string;
  streaming: boolean;
}

export function Stream({ messages, streamingText, streaming }: StreamProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, streamingText]);

  return (
    <div
      ref={ref}
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "8px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {messages.map((m) => (
        <Message key={m.id} role={m.role} content={m.content} />
      ))}
      {streaming && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div
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
            style={{
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
            {streamingText}
            <span
              data-testid="stream-cursor"
              style={{
                display: "inline-block",
                width: 7,
                height: 14,
                marginInlineStart: 2,
                background: tokens.color.accent,
                verticalAlign: "middle",
                animation: "rami-blink 1s steps(2, start) infinite",
              }}
            />
          </div>
        </div>
      )}
      <style>{`@keyframes rami-blink { to { visibility: hidden; } }`}</style>
    </div>
  );
}

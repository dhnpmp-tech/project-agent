"use client";

import { useEffect, useState } from "react";
import { tokens } from "./tokens";
import { detectBrowserLang, hasSessionCookie } from "./lang";

export interface GreetingProps {
  path: string;
  onChip: (text: string) => void;
  /** When set, overrides browser language detection. */
  langOverride?: "en" | "ar";
}

interface GreetingPayload {
  greeting: string;
  chips?: string[];
}

const FALLBACK: GreetingPayload = {
  greeting: "I'm Rami. Ask me anything about Project Agent.",
  chips: [],
};

export function Greeting({ path, onChip, langOverride }: GreetingProps) {
  const [data, setData] = useState<GreetingPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const lang = langOverride ?? detectBrowserLang();
    const url = `/api/rami/greeting?path=${encodeURIComponent(path)}&lang=${lang}`;
    const init: RequestInit = { method: "GET" };
    if (hasSessionCookie()) init.credentials = "include";

    let cancelled = false;
    setLoading(true);
    fetch(url, init)
      .then((r) => (r.ok ? (r.json() as Promise<GreetingPayload>) : FALLBACK))
      .catch(() => FALLBACK)
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [path, langOverride]);

  if (loading || !data) {
    return (
      <div
        style={{ padding: 16, color: tokens.color.textMuted, fontSize: 14 }}
        aria-live="polite"
      >
        …
      </div>
    );
  }

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ margin: 0, color: tokens.color.text, fontSize: 15, lineHeight: 1.5 }}>
        {data.greeting}
      </p>
      {data.chips && data.chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {data.chips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onChip(chip)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${tokens.color.border}`,
                background: tokens.color.panel,
                color: tokens.color.text,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

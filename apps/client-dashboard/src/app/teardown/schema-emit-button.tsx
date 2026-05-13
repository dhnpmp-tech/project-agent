// Client component embedded in the SchemaAudit section.
// Click "Show me the markup" → POST /api/teardown/generate-schema with
// the missing types → render the JSON-LD blocks with copy-to-clipboard.

"use client";

import { useState } from "react";
import { apiUrl } from "@/lib/api-url";

interface SchemaBlock {
  type: string;
  html: string;
}

interface Props {
  slug: string;
  missingTypes: string[];
}

export function SchemaEmitButton({ slug, missingTypes }: Props) {
  const [pending, setPending] = useState(false);
  const [blocks, setBlocks] = useState<SchemaBlock[] | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const onClick = async () => {
    if (pending || missingTypes.length === 0) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/teardown/generate-schema"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Cap at first 6 missing types — keeps LLM budget bounded.
        body: JSON.stringify({ slug, types: missingTypes.slice(0, 6) }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error || "Couldn't generate markup. Try again.");
        return;
      }
      setBlocks(data.blocks || []);
      setSummary(data.summary || "");
    } catch {
      setError("Network error.");
    } finally {
      setPending(false);
    }
  };

  const onCopy = async (text: string, i: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(i);
      setTimeout(() => setCopiedIndex((cur) => (cur === i ? null : cur)), 2200);
    } catch {
      // older browsers — fall back to textarea select
    }
  };

  if (blocks) {
    return (
      <div style={{ marginTop: 16 }}>
        {summary && (
          <p
            style={{
              fontSize: 12.5,
              lineHeight: 1.55,
              color: "var(--paper-mut, #514c40)",
              fontStyle: "italic",
              margin: "0 0 12px",
              padding: 10,
              background: "#eef5e9",
              border: "1px solid #bdd7af",
              borderRadius: 4,
            }}
          >
            {summary}
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {blocks.map((b, i) => (
            <div
              key={i}
              style={{
                background: "#1d1c18",
                color: "#fbfaf4",
                borderRadius: 6,
                padding: 12,
                fontFamily: "var(--mono, ui-monospace)",
                fontSize: 11,
                lineHeight: 1.5,
                overflow: "auto",
                maxHeight: 320,
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                  fontFamily: "var(--mono, ui-monospace)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#7ad6c0",
                }}
              >
                <span>§ {b.type} · paste in &lt;head&gt;</span>
                <button
                  type="button"
                  onClick={() => onCopy(b.html, i)}
                  style={{
                    fontFamily: "var(--mono, ui-monospace)",
                    fontSize: 10,
                    padding: "4px 10px",
                    background: copiedIndex === i ? "#2d8e7d" : "#3a3936",
                    color: "#fbfaf4",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                  }}
                >
                  {copiedIndex === i ? "✓ copied" : "copy"}
                </button>
              </div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {b.html}
              </pre>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending || missingTypes.length === 0}
        style={{
          fontFamily: "var(--mono, ui-monospace)",
          fontSize: 12,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          padding: "10px 18px",
          background: pending ? "var(--paper-line, #d8d2bf)" : "#1d1c18",
          color: pending ? "var(--paper-mut, #837c69)" : "#fbfaf4",
          border: "1px solid #1d1c18",
          borderRadius: 6,
          cursor: pending ? "wait" : "pointer",
        }}
      >
        {pending
          ? "generating…"
          : missingTypes.length === 0
            ? "no markup to add"
            : `show me the ${Math.min(missingTypes.length, 6)} blocks →`}
      </button>
      {error && (
        <span style={{ fontSize: 11.5, color: "#a83a2b" }}>{error}</span>
      )}
    </div>
  );
}

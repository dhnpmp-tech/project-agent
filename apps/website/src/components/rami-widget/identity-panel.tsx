"use client";

import { tokens } from "./tokens";

export interface Identity {
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
}

export interface IdentityPanelProps {
  identity: Identity;
  onForget: () => void;
  onClose: () => void;
}

const FIELDS: Array<{ key: keyof Identity; label: string }> = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "company", label: "Company" },
  { key: "phone", label: "Phone" },
];

export function IdentityPanel({ identity, onForget, onClose }: IdentityPanelProps) {
  const hasAny = FIELDS.some((f) => identity[f.key]);

  function handleForget() {
    const ok = window.confirm(
      "This drops Rami's memory of you on this device. Confirm?",
    );
    if (!ok) return;
    onForget();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-label="What Rami remembers"
      style={{
        position: "absolute",
        inset: 0,
        background: tokens.color.bg,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        padding: 16,
        gap: 12,
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, color: tokens.color.text, fontSize: 14 }}>
          What Rami remembers
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            background: "transparent",
            border: "none",
            color: tokens.color.textMuted,
            cursor: "pointer",
            fontSize: 18,
            padding: 4,
          }}
        >
          ×
        </button>
      </header>

      {hasAny ? (
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 12px", margin: 0 }}>
          {FIELDS.filter((f) => identity[f.key]).map((f) => (
            <div key={f.key} style={{ display: "contents" }}>
              <dt style={{ color: tokens.color.textMuted, fontSize: 12 }}>{f.label}</dt>
              <dd style={{ color: tokens.color.text, fontSize: 13, margin: 0 }}>
                {identity[f.key]}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p style={{ color: tokens.color.textMuted, fontSize: 13 }}>Nothing yet.</p>
      )}

      <button
        type="button"
        onClick={handleForget}
        style={{
          marginTop: "auto",
          padding: "10px 12px",
          borderRadius: 8,
          border: `1px solid ${tokens.color.border}`,
          background: tokens.color.panel,
          color: "#fca5a5",
          fontSize: 13,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Forget me
      </button>
      <a
        href="/privacy"
        style={{ color: tokens.color.textMuted, fontSize: 12, textAlign: "center" }}
      >
        Privacy
      </a>
    </div>
  );
}

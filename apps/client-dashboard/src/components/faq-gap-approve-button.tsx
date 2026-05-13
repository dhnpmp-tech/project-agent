"use client";

// Small interactive client component used inside the otherwise
// server-rendered DayOneCard. Posts to /api/onboarding/approve-faq when
// the owner approves a single FAQ gap, then refreshes the route data
// so the parent server component re-renders with the new approved state.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api-url";

interface Props {
  question: string;
  draftAnswer: string;
}

export function FaqGapApproveButton({ question, draftAnswer }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onApprove = async () => {
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/onboarding/approve-faq"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, draft_answer: draftAnswer }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "failed");
        return;
      }
      // Re-render the page with the updated day_one.faq_gaps[*].approved
      startTransition(() => router.refresh());
    } catch {
      setError("network");
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
      <button
        type="button"
        onClick={onApprove}
        disabled={pending}
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: pending ? "var(--paper-line, #d8d2bf)" : "#1d1c18",
          color: pending ? "var(--paper-mut, #837c69)" : "#fbfaf4",
          border: "1px solid #1d1c18",
          borderRadius: 4,
          padding: "6px 12px",
          cursor: pending ? "wait" : "pointer",
        }}
      >
        {pending ? "approving…" : "approve · teach the agent"}
      </button>
      {error && (
        <span style={{ fontSize: 11, color: "#a83a2b" }}>
          {error === "unauthorized"
            ? "please log in again"
            : error === "knowledge_not_found"
              ? "knowledge base missing"
              : "couldn't save — try again"}
        </span>
      )}
    </div>
  );
}

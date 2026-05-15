// Agent action queue dashboard.
//
// Owner-facing view of the daily-plan loop: pending approvals, approved
// rows waiting for the executor, drafted deliverables awaiting send,
// and recently executed/rejected rows for transparency.
//
// Companion to the WhatsApp brief — owners who prefer the dashboard can
// see exactly what the agent intends to do, what it already drafted,
// and what they skipped, with one-tap approve/reject per row.

import Link from "next/link";
import { db } from "@/lib/db";
import { getClient } from "@/lib/server-queries";

interface ActionRow {
  id: string;
  agent: string;
  action_type: string;
  target: string;
  description: string | null;
  payload: Record<string, unknown> | null;
  status: string;
  blocked_reason: string | null;
  for_date: string | null;
  approval_token: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  executed_at: string | null;
}

async function fetchActions(clientId: string | null): Promise<ActionRow[]> {
  if (!clientId) return [];
  try {
    const rows = await db()<ActionRow[]>`
      SELECT id, agent, action_type, target, description, payload, status,
             blocked_reason, for_date, approval_token, approved_at,
             approved_by, created_at, executed_at
      FROM agent_action_queue
      WHERE client_id = ${clientId}
        AND (
          for_date >= CURRENT_DATE - INTERVAL '7 days'
          OR for_date IS NULL
        )
      ORDER BY
        CASE status
          WHEN 'pending_approval' THEN 0
          WHEN 'approved' THEN 1
          WHEN 'executed' THEN 2
          WHEN 'rejected' THEN 3
          WHEN 'blocked' THEN 4
          ELSE 5
        END,
        COALESCE(for_date, CURRENT_DATE) DESC,
        approval_token ASC NULLS LAST,
        created_at DESC
      LIMIT 200
    `;
    return rows;
  } catch (e) {
    console.error("[agent-queue] fetch", e);
    return [];
  }
}

export default async function AgentQueuePage() {
  const client = await getClient();
  const clientId = client?.id ?? null;
  const rows = await fetchActions(clientId);

  const pending = rows.filter((r) => r.status === "pending_approval");
  const approved = rows.filter((r) => r.status === "approved");
  const executed = rows.filter((r) => r.status === "executed");
  const rejected = rows.filter((r) => r.status === "rejected" || r.status === "blocked");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
            &larr; Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Agent Queue</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {client?.company_name || "Your business"} · everything the agent has planned,
          approved, drafted, or skipped for you in the last 7 days.
        </p>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Stat strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat k="awaiting your nod" v={pending.length} color="amber" />
          <Stat k="approved · drafting" v={approved.length} color="blue" />
          <Stat k="drafts ready" v={executed.length} color="emerald" />
          <Stat k="skipped" v={rejected.length} color="gray" />
        </div>

        {pending.length > 0 && (
          <Section
            title="Awaiting your nod"
            subtitle="Reply on WhatsApp with YES, NO, or letter codes (e.g. A C E) — or approve here."
            accent="amber"
          >
            {pending.map((r) => (
              <PendingCard key={r.id} row={r} />
            ))}
          </Section>
        )}

        {executed.length > 0 && (
          <Section
            title="Drafts ready for your review"
            subtitle="The agent did its part. Read the draft, edit if needed, send when you're ready."
            accent="emerald"
          >
            {executed.map((r) => (
              <ExecutedCard key={r.id} row={r} />
            ))}
          </Section>
        )}

        {approved.length > 0 && (
          <Section
            title="Approved · drafting now"
            subtitle="You approved these on WhatsApp. The agent picks them up every 30 minutes."
            accent="blue"
          >
            {approved.map((r) => (
              <CompactRow key={r.id} row={r} />
            ))}
          </Section>
        )}

        {rejected.length > 0 && (
          <Section
            title="Skipped"
            subtitle="You said no — these won't run."
            accent="gray"
          >
            {rejected.map((r) => (
              <CompactRow key={r.id} row={r} muted />
            ))}
          </Section>
        )}

        {rows.length === 0 && (
          <div className="bg-white rounded-lg border border-dashed border-gray-200 p-8 text-center">
            <p className="text-gray-500 text-sm">
              No actions in the queue yet. The nightly planner runs at 22:00 UTC and
              fills tomorrow&apos;s board automatically once your agent is live.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── Sections + cards ─── */

function Section({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  accent: "amber" | "blue" | "emerald" | "gray";
  children: React.ReactNode;
}) {
  const accentColor =
    accent === "amber" ? "#a07232" :
    accent === "blue" ? "#1f6b9a" :
    accent === "emerald" ? "#1e6d3d" :
    "#837c69";
  return (
    <section>
      <div className="mb-3">
        <div
          className="text-[10px] uppercase tracking-widest mb-1 font-semibold"
          style={{ color: accentColor }}
        >
          {title}
        </div>
        <h2 className="text-lg font-serif text-gray-900">{subtitle}</h2>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function PendingCard({ row }: { row: ActionRow }) {
  const cat = (row.agent || "").toUpperCase();
  const catColor =
    cat === "INBOUND" ? "#2d8e7d" :
    cat === "PROACTIVE" ? "#a07232" :
    cat === "OUTBOUND" ? "#5d8a4a" :
    "#837c69";
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex gap-3 items-start">
      {row.approval_token && (
        <div
          className="w-9 h-9 rounded-full bg-amber-50 border-2 border-amber-400 flex items-center justify-center font-mono font-bold text-amber-700"
        >
          {row.approval_token}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span
            className="text-[10px] uppercase tracking-widest font-semibold"
            style={{ color: catColor }}
          >
            {cat}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-gray-400">
            {row.action_type}
          </span>
        </div>
        <div className="text-sm text-gray-900 leading-snug">
          {row.description || row.action_type}
        </div>
        {row.target && row.target !== "—" && (
          <div className="text-xs text-gray-500 mt-1">→ {row.target}</div>
        )}
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <ApproveButton id={row.id} mode="approve" />
        <ApproveButton id={row.id} mode="reject" />
      </div>
    </div>
  );
}

function ExecutedCard({ row }: { row: ActionRow }) {
  const draft = (row.payload?.draft as string | undefined) ?? "";
  const draftedAt = (row.payload?.drafted_at as string | undefined) ?? row.executed_at;
  const cat = (row.agent || "").toUpperCase();
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] uppercase tracking-widest text-emerald-700 font-semibold"
          >
            ● Drafted
          </span>
          <span className="text-[10px] uppercase tracking-widest text-gray-400">
            {cat} · {row.action_type}
          </span>
        </div>
        <span className="text-[10px] font-mono text-gray-400">
          {(draftedAt || "").slice(0, 16).replace("T", " ")}
        </span>
      </div>
      <div className="text-xs text-gray-500 mb-2">
        {row.description || row.action_type}
        {row.target && row.target !== "—" && <> → {row.target}</>}
      </div>
      {draft ? (
        <pre
          className="bg-gray-50 border border-gray-100 rounded p-3 text-sm text-gray-800 whitespace-pre-wrap font-serif italic leading-relaxed"
          style={{ maxHeight: 240, overflow: "auto" }}
        >
          {draft}
        </pre>
      ) : (
        <p className="text-xs text-gray-400 italic">
          Operational action — no customer-facing draft (e.g. KB refresh).
        </p>
      )}
    </div>
  );
}

function CompactRow({ row, muted = false }: { row: ActionRow; muted?: boolean }) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 px-4 py-2.5 flex justify-between items-center gap-3 ${muted ? "opacity-60" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">
          {(row.agent || "").toUpperCase()} · {row.action_type}
        </div>
        <div className="text-sm text-gray-700 truncate">
          {row.description || row.action_type}
        </div>
      </div>
      {row.approval_token && (
        <span className="text-xs font-mono text-gray-400 flex-shrink-0">
          {row.approval_token}
        </span>
      )}
    </div>
  );
}

function Stat({
  k,
  v,
  color,
}: {
  k: string;
  v: number;
  color: "amber" | "blue" | "emerald" | "gray";
}) {
  const c =
    color === "amber" ? "#a07232" :
    color === "blue" ? "#1f6b9a" :
    color === "emerald" ? "#1e6d3d" :
    "#837c69";
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <div className="text-2xl font-serif tabular-nums" style={{ color: c }}>
        {v.toLocaleString()}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">
        {k}
      </div>
    </div>
  );
}

function ApproveButton({
  id,
  mode,
}: {
  id: string;
  mode: "approve" | "reject";
}) {
  // Client form posts to a Next.js route handler that updates the row.
  // Kept as a simple form (no JS bundle) so it works without hydration.
  return (
    <form
      method="POST"
      action={`/app/api/agent-queue/${id}/${mode}`}
      className="flex-shrink-0"
    >
      <button
        type="submit"
        className={
          mode === "approve"
            ? "px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
            : "px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
        }
      >
        {mode === "approve" ? "Approve" : "Skip"}
      </button>
    </form>
  );
}

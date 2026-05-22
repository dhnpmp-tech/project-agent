// Agent action queue — assignment-board (Kanban) layout.
//
// Owner sees the day's plan as four live columns: awaiting their nod →
// doing now → drafts ready → skipped. Cards move across the board as
// the cron loop picks them up, drafts the work, and the owner approves
// or skips. Mirrors the "real teammate" framing on the marketing site:
// the agent is doing the work; the board shows them doing it.
//
// Read-only by default; approval still uses the existing letter-code
// flow on WhatsApp, plus the inline Approve/Skip buttons on each
// pending card (HTML form post, no JS bundle for actions).
//
// Auto-refreshes every 30s via the <BoardLive/> client island so the
// board feels alive without a websocket.

import Link from "next/link";
import { db } from "@/lib/db";
import { getClient } from "@/lib/server-queries";
import { BoardLive } from "./board-live";

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

  const toApprove = rows.filter(
    (r) => r.status === "pending_approval" || r.status === "pending",
  );
  const inProgress = rows.filter((r) => r.status === "approved");
  const drafted = rows.filter((r) => r.status === "executed");
  const skipped = rows.filter(
    (r) => r.status === "rejected" || r.status === "blocked",
  );

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <BoardLive />
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            &larr; Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Agent Board</h1>
          <span className="ml-auto text-[10px] uppercase tracking-widest text-gray-400 font-mono">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 align-middle mr-1.5 animate-pulse" />
            live · refreshes every 30s
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {client?.company_name || "Your business"} · what your agent is
          planning, doing, and waiting on right now.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <div className="bg-white rounded-lg border border-dashed border-gray-200 p-10">
            <p className="text-gray-600 text-sm">
              No actions in the queue yet. The nightly planner runs at 22:00
              local time and fills tomorrow&apos;s board automatically once
              your agent is live.
            </p>
          </div>
        </div>
      ) : (
        <main className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Column
              title="Awaiting your nod"
              count={toApprove.length}
              accent="amber"
              subtitle="Approve on WhatsApp (YES / NO / A C E) or here."
            >
              {toApprove.map((r) => (
                <PendingCard key={r.id} row={r} />
              ))}
              {toApprove.length === 0 && <EmptyState text="All clear." />}
            </Column>

            <Column
              title="Doing now"
              count={inProgress.length}
              accent="blue"
              subtitle="Approved — agent picks these up every 30 minutes."
            >
              {inProgress.map((r) => (
                <CompactCard key={r.id} row={r} />
              ))}
              {inProgress.length === 0 && (
                <EmptyState text="Nothing in flight." />
              )}
            </Column>

            <Column
              title="Drafts ready"
              count={drafted.length}
              accent="emerald"
              subtitle="Done. Review, edit, send when you're ready."
            >
              {drafted.map((r) => (
                <DraftCard key={r.id} row={r} />
              ))}
              {drafted.length === 0 && <EmptyState text="No drafts yet." />}
            </Column>

            <Column
              title="Skipped"
              count={skipped.length}
              accent="gray"
              subtitle="You said no — these won't run."
            >
              {skipped.map((r) => (
                <CompactCard key={r.id} row={r} muted />
              ))}
              {skipped.length === 0 && (
                <EmptyState text="Nothing skipped." />
              )}
            </Column>
          </div>
        </main>
      )}
    </div>
  );
}

/* ─── Column + cards ─── */

const ACCENT: Record<
  "amber" | "blue" | "emerald" | "gray",
  { fg: string; bg: string; border: string }
> = {
  amber: { fg: "#a07232", bg: "#fdf6e7", border: "#e8d9a8" },
  blue: { fg: "#1f6b9a", bg: "#eaf3f9", border: "#bcd6e8" },
  emerald: { fg: "#1e6d3d", bg: "#e9f5ec", border: "#bcdcc6" },
  gray: { fg: "#837c69", bg: "#f1efe9", border: "#dcd6c6" },
};

function Column({
  title,
  count,
  accent,
  subtitle,
  children,
}: {
  title: string;
  count: number;
  accent: keyof typeof ACCENT;
  subtitle: string;
  children: React.ReactNode;
}) {
  const c = ACCENT[accent];
  return (
    <section
      className="rounded-lg border bg-white/60 backdrop-blur-sm overflow-hidden flex flex-col min-h-[60vh]"
      style={{ borderColor: c.border }}
    >
      <header
        className="px-4 py-3 border-b"
        style={{ background: c.bg, borderColor: c.border }}
      >
        <div className="flex items-baseline justify-between gap-2">
          <div
            className="text-[11px] uppercase tracking-widest font-semibold"
            style={{ color: c.fg }}
          >
            {title}
          </div>
          <div
            className="text-xs font-mono tabular-nums px-1.5 rounded"
            style={{ color: c.fg, background: "rgba(255,255,255,0.6)" }}
          >
            {count}
          </div>
        </div>
        <div className="text-[11px] text-gray-500 mt-1 leading-snug">
          {subtitle}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-8 text-center text-[11px] text-gray-400 italic">
      {text}
    </div>
  );
}

function AgentBadge({ agent }: { agent: string }) {
  const cat = (agent || "").toUpperCase();
  const c =
    cat === "INBOUND"
      ? "#2d8e7d"
      : cat === "PROACTIVE"
      ? "#a07232"
      : cat === "OUTBOUND"
      ? "#5d8a4a"
      : cat === "EXECUTOR"
      ? "#7e5dc7"
      : "#837c69";
  return (
    <span
      className="text-[9px] uppercase tracking-widest font-semibold"
      style={{ color: c }}
    >
      {cat || "AGENT"}
    </span>
  );
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.floor((now - then) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function PendingCard({ row }: { row: ActionRow }) {
  return (
    <article className="bg-white rounded-md border border-gray-200 px-3 py-2.5 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-start gap-2.5">
        {row.approval_token && (
          <div className="w-8 h-8 rounded-full bg-amber-50 border-2 border-amber-400 flex items-center justify-center font-mono font-bold text-amber-700 text-sm flex-shrink-0">
            {row.approval_token}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <AgentBadge agent={row.agent} />
            <span className="text-[9px] uppercase tracking-widest text-gray-400">
              {row.action_type}
            </span>
            <span className="text-[9px] font-mono text-gray-400 ml-auto">
              {relativeTime(row.created_at)}
            </span>
          </div>
          <div className="text-sm text-gray-900 leading-snug line-clamp-3">
            {row.description || row.action_type}
          </div>
          {row.target && row.target !== "—" && (
            <div className="text-[11px] text-gray-500 mt-1 truncate">
              → {row.target}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-1.5 mt-2.5 justify-end">
        <ApproveButton id={row.id} mode="reject" />
        <ApproveButton id={row.id} mode="approve" />
      </div>
    </article>
  );
}

function DraftCard({ row }: { row: ActionRow }) {
  const draft = (row.payload?.draft as string | undefined) ?? "";
  return (
    <article className="bg-white rounded-md border border-gray-200 px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[9px] uppercase tracking-widest text-emerald-700 font-semibold">
          ● drafted
        </span>
        <AgentBadge agent={row.agent} />
        <span className="text-[9px] uppercase tracking-widest text-gray-400">
          {row.action_type}
        </span>
        <span className="text-[9px] font-mono text-gray-400 ml-auto">
          {relativeTime(row.executed_at)}
        </span>
      </div>
      <div className="text-[11px] text-gray-500 mb-1.5 line-clamp-1">
        {row.description || row.action_type}
        {row.target && row.target !== "—" && <> → {row.target}</>}
      </div>
      {draft ? (
        <pre
          className="bg-gray-50 border border-gray-100 rounded p-2 text-xs text-gray-800 whitespace-pre-wrap font-serif italic leading-relaxed"
          style={{ maxHeight: 180, overflow: "auto" }}
        >
          {draft.length > 600 ? draft.slice(0, 600) + "…" : draft}
        </pre>
      ) : (
        <p className="text-[11px] text-gray-400 italic">
          Operational — no customer-facing draft.
        </p>
      )}
    </article>
  );
}

function CompactCard({ row, muted = false }: { row: ActionRow; muted?: boolean }) {
  return (
    <article
      className={`bg-white rounded-md border border-gray-200 px-3 py-2 ${
        muted ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
        <AgentBadge agent={row.agent} />
        <span className="text-[9px] uppercase tracking-widest text-gray-400">
          {row.action_type}
        </span>
        {row.approval_token && (
          <span className="text-[10px] font-mono text-gray-400 ml-auto">
            {row.approval_token}
          </span>
        )}
      </div>
      <div className="text-[13px] text-gray-700 leading-snug line-clamp-2">
        {row.description || row.action_type}
      </div>
      {row.blocked_reason && (
        <div className="text-[10px] text-amber-700 mt-1">
          ⚠ {row.blocked_reason}
        </div>
      )}
    </article>
  );
}

function ApproveButton({
  id,
  mode,
}: {
  id: string;
  mode: "approve" | "reject";
}) {
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
            ? "px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
            : "px-2.5 py-1 text-[11px] font-semibold bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
        }
      >
        {mode === "approve" ? "Approve" : "Skip"}
      </button>
    </form>
  );
}

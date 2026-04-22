"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";

/* ------------------------------------------------------------------ */
/*  API base + helpers                                                 */
/* ------------------------------------------------------------------ */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://n8n.srv1328172.hstgr.cloud";

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  TypeScript interfaces                                              */
/* ------------------------------------------------------------------ */

type LeadTemperature = "hot" | "warm" | "cold";

interface PipelineLead {
  id: string;
  name: string;
  phone: string;
  score: number;
  temperature: LeadTemperature;
  deal_type: string;
  deal_value: number;
  days_in_stage: number;
  stage: string;
}

interface PipelineStage {
  key: string;
  label: string;
  count: number;
  total_value: number;
  leads: PipelineLead[];
}

interface PipelineResponse {
  stages: PipelineStage[];
}

interface HotLead {
  id: string;
  name: string;
  phone: string;
  score: number;
  temperature: LeadTemperature;
  signals: string[];
  suggested_action: string;
}

interface HotLeadsResponse {
  leads: HotLead[];
}

interface DigestResponse {
  total_pipeline_value: number;
  win_rate: number;
  avg_deal_size: number;
  active_leads: number;
  digest_text: string;
}

interface SalesEvent {
  id: string;
  type: "lead_scored" | "stage_changed" | "follow_up_sent" | "deal_won" | "deal_lost";
  description: string;
  lead_name: string;
  timestamp: string;
}

interface WinLossResponse {
  recent_events: SalesEvent[];
  wins: number;
  losses: number;
}

/* ------------------------------------------------------------------ */
/*  Stage column config                                                */
/* ------------------------------------------------------------------ */

const STAGE_COLUMNS = [
  { key: "new", label: "New", accent: "bg-zinc-500" },
  { key: "qualified", label: "Qualified", accent: "bg-blue-500" },
  { key: "proposal_sent", label: "Proposal Sent", accent: "bg-amber-500" },
  { key: "negotiating", label: "Negotiating", accent: "bg-purple-500" },
  { key: "won", label: "Won", accent: "bg-emerald-500" },
  { key: "lost", label: "Lost", accent: "bg-red-500" },
];

/* ------------------------------------------------------------------ */
/*  Utility                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`;
  return `AED ${value.toLocaleString()}`;
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ScoreBadge({ temperature, score }: { temperature: LeadTemperature; score: number }) {
  const config: Record<LeadTemperature, { bg: string; text: string; label: string }> = {
    hot:  { bg: "bg-red-500/20", text: "text-red-400", label: "HOT" },
    warm: { bg: "bg-amber-500/20", text: "text-amber-400", label: "WARM" },
    cold: { bg: "bg-blue-500/20", text: "text-blue-400", label: "COLD" },
  };
  const c = config[temperature];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c.bg} ${c.text}`}>
      {c.label} {score}
    </span>
  );
}

function StatCard({
  label,
  value,
  prefix,
  suffix,
}: {
  label: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-surface-700 bg-surface-800 p-5">
      <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">
        {label}
      </p>
      <p className="text-2xl font-bold text-surface-0">
        {prefix && <span className="text-sm font-normal text-surface-400 mr-0.5">{prefix}</span>}
        {typeof value === "number" ? value.toLocaleString() : value}
        {suffix && <span className="text-sm font-normal text-surface-400 ml-1">{suffix}</span>}
      </p>
    </div>
  );
}

function LeadCard({ lead }: { lead: PipelineLead }) {
  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800/80 p-3 space-y-2 hover:border-surface-600 transition-colors cursor-default">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-surface-100 truncate">{lead.name}</p>
          <p className="text-xs text-surface-500 font-mono">{lead.phone}</p>
        </div>
        <ScoreBadge temperature={lead.temperature} score={lead.score} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-surface-400">{lead.deal_type}</span>
        <span className="text-brand-400 font-semibold">{formatCurrency(lead.deal_value)}</span>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-surface-500">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {lead.days_in_stage}d in stage
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  accent,
  leads,
  count,
  totalValue,
}: {
  stage: string;
  accent: string;
  leads: PipelineLead[];
  count: number;
  totalValue: number;
}) {
  return (
    <div className="flex flex-col min-w-[260px] max-w-[300px]">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
        <span className="text-sm font-semibold text-surface-200">{stage}</span>
        <span className="ml-auto rounded-full bg-surface-700 px-2 py-0.5 text-[11px] font-bold text-surface-300">
          {count}
        </span>
      </div>
      <p className="text-xs text-surface-500 mb-3">{formatCurrency(totalValue)}</p>
      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[420px] pr-1 scrollbar-thin">
        {leads.length > 0 ? (
          leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
        ) : (
          <div className="rounded-lg border border-dashed border-surface-700 p-4 text-center">
            <p className="text-xs text-surface-500">No leads</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EventIcon({ type }: { type: SalesEvent["type"] }) {
  const icons: Record<SalesEvent["type"], { color: string; path: string }> = {
    lead_scored: {
      color: "text-amber-400",
      path: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
    },
    stage_changed: {
      color: "text-blue-400",
      path: "M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4",
    },
    follow_up_sent: {
      color: "text-purple-400",
      path: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    },
    deal_won: {
      color: "text-emerald-400",
      path: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    deal_lost: {
      color: "text-red-400",
      path: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
    },
  };
  const icon = icons[type] || icons.lead_scored;
  return (
    <svg className={`h-4 w-4 ${icon.color} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={icon.path} />
    </svg>
  );
}

function EventTypeLabel({ type }: { type: SalesEvent["type"] }) {
  const labels: Record<SalesEvent["type"], string> = {
    lead_scored: "Lead Scored",
    stage_changed: "Stage Changed",
    follow_up_sent: "Follow-up Sent",
    deal_won: "Deal Won",
    deal_lost: "Deal Lost",
  };
  return <span className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">{labels[type] || type}</span>;
}

/* ------------------------------------------------------------------ */
/*  Skeleton / loading states                                          */
/* ------------------------------------------------------------------ */

function SkeletonBar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-700 ${className || "h-4 w-24"}`} />;
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-surface-700 bg-surface-800 p-5 space-y-3">
      <SkeletonBar className="h-3 w-20" />
      <SkeletonBar className="h-7 w-28" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

export default function SalesRepPage() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [hotLeads, setHotLeads] = useState<HotLead[]>([]);
  const [digest, setDigest] = useState<DigestResponse | null>(null);
  const [events, setEvents] = useState<SalesEvent[]>([]);

  // Resolve client_id from Supabase session
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setClientId(uid);
    });
  }, []);

  // Fetch all sales data once we have client_id
  const fetchData = useCallback(async (cid: string) => {
    setLoading(true);
    setError(null);

    const [pipelineRes, hotRes, digestRes, winLossRes] = await Promise.all([
      apiFetch<PipelineResponse>(`/sales/pipeline/${cid}`),
      apiFetch<HotLeadsResponse>(`/sales/hot-leads/${cid}`),
      apiFetch<DigestResponse>(`/sales/digest/${cid}`),
      apiFetch<WinLossResponse>(`/sales/win-loss/${cid}`),
    ]);

    if (pipelineRes) setPipeline(pipelineRes.stages);
    if (hotRes) setHotLeads(hotRes.leads);
    if (digestRes) setDigest(digestRes);
    if (winLossRes) setEvents(winLossRes.recent_events?.slice(0, 10) ?? []);

    // If all endpoints failed, show error
    if (!pipelineRes && !hotRes && !digestRes && !winLossRes) {
      setError("Could not reach the sales API. Check that the prompt-builder is running.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (clientId) fetchData(clientId);
  }, [clientId, fetchData]);

  /* ---------------------------------------------------------------- */
  /*  Build stage map (merge API data with fixed column order)         */
  /* ---------------------------------------------------------------- */

  const stageMap = new Map<string, PipelineStage>();
  for (const s of pipeline) {
    stageMap.set(s.key, s);
  }

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <header className="border-b border-surface-800 bg-surface-900 px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-surface-500 hover:text-surface-300 transition-colors"
            >
              &larr; Back
            </Link>
            <div>
              <h1 className="text-xl font-bold text-surface-0">Sales Pipeline</h1>
              <p className="text-sm text-surface-500">
                Track leads, monitor pipeline, close deals
              </p>
            </div>
          </div>
          <button
            onClick={() => clientId && fetchData(clientId)}
            disabled={loading || !clientId}
            className="rounded-lg border border-surface-700 bg-surface-800 px-4 py-2 text-xs font-medium text-surface-300 hover:bg-surface-700 hover:text-surface-100 disabled:opacity-40 transition-colors"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
        {/* Error banner */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/*  Stats Bar                                                    */}
        {/* ------------------------------------------------------------ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                label="Total Pipeline Value"
                value={formatCurrency(digest?.total_pipeline_value ?? 0)}
              />
              <StatCard
                label="Win Rate"
                value={`${(digest?.win_rate ?? 0).toFixed(1)}`}
                suffix="%"
              />
              <StatCard
                label="Avg Deal Size"
                value={formatCurrency(digest?.avg_deal_size ?? 0)}
              />
              <StatCard
                label="Active Leads"
                value={digest?.active_leads ?? 0}
              />
            </>
          )}
        </section>

        {/* ------------------------------------------------------------ */}
        {/*  Pipeline Kanban                                              */}
        {/* ------------------------------------------------------------ */}
        <section>
          <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
            Pipeline
          </h2>
          <div className="rounded-xl border border-surface-800 bg-surface-900 p-5 overflow-x-auto">
            {loading ? (
              <div className="flex gap-4">
                {STAGE_COLUMNS.map((col) => (
                  <div key={col.key} className="min-w-[260px] space-y-3">
                    <SkeletonBar className="h-4 w-24" />
                    <SkeletonBar className="h-3 w-16" />
                    <SkeletonBar className="h-24 w-full" />
                    <SkeletonBar className="h-24 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-4">
                {STAGE_COLUMNS.map((col) => {
                  const stage = stageMap.get(col.key);
                  return (
                    <KanbanColumn
                      key={col.key}
                      stage={col.label}
                      accent={col.accent}
                      leads={stage?.leads ?? []}
                      count={stage?.count ?? 0}
                      totalValue={stage?.total_value ?? 0}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Two-column: Hot Leads + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ---------------------------------------------------------- */}
          {/*  Hot Leads Panel                                            */}
          {/* ---------------------------------------------------------- */}
          <section>
            <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
              Hot Leads
              <span className="ml-2 text-brand-400 text-xs font-normal normal-case">
                Score 70+
              </span>
            </h2>
            <div className="rounded-xl border border-surface-800 bg-surface-900 divide-y divide-surface-800">
              {loading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <SkeletonBar className="h-8 w-8 rounded-full" />
                      <div className="space-y-1 flex-1">
                        <SkeletonBar className="h-3 w-32" />
                        <SkeletonBar className="h-3 w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : hotLeads.length > 0 ? (
                hotLeads
                  .sort((a, b) => b.score - a.score)
                  .map((lead) => (
                    <div key={lead.id} className="px-4 py-3 hover:bg-surface-800/50 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-surface-100 truncate">
                            {lead.name}
                          </p>
                          <p className="text-xs text-surface-500 font-mono">{lead.phone}</p>
                        </div>
                        <ScoreBadge temperature={lead.temperature} score={lead.score} />
                      </div>
                      {/* Signals */}
                      {lead.signals.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {lead.signals.map((signal, i) => (
                            <span
                              key={i}
                              className="rounded-full bg-surface-800 border border-surface-700 px-2 py-0.5 text-[10px] text-surface-400"
                            >
                              {signal}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Suggested action */}
                      <div className="flex items-center gap-1.5">
                        <svg className="h-3 w-3 text-brand-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="text-xs text-brand-400 font-medium">
                          {lead.suggested_action}
                        </span>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-surface-500">No hot leads right now</p>
                  <p className="text-xs text-surface-600 mt-1">
                    Leads scoring 70+ will appear here automatically
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ---------------------------------------------------------- */}
          {/*  Recent Activity                                            */}
          {/* ---------------------------------------------------------- */}
          <section>
            <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
              Recent Activity
            </h2>
            <div className="rounded-xl border border-surface-800 bg-surface-900 divide-y divide-surface-800">
              {loading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <SkeletonBar className="h-4 w-4 rounded" />
                      <div className="space-y-1 flex-1">
                        <SkeletonBar className="h-3 w-40" />
                        <SkeletonBar className="h-2 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : events.length > 0 ? (
                events.map((event) => (
                  <div key={event.id} className="px-4 py-3 hover:bg-surface-800/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <EventIcon type={event.type} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-sm text-surface-200 truncate">
                            <span className="font-medium text-surface-100">{event.lead_name}</span>
                            {" "}
                            {event.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <EventTypeLabel type={event.type} />
                          <span className="text-[10px] text-surface-600">
                            {timeAgo(event.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-surface-500">No recent activity</p>
                  <p className="text-xs text-surface-600 mt-1">
                    Sales events will appear here as they happen
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

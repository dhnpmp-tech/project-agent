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

async function apiPost<T>(path: string, body?: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  TypeScript interfaces                                              */
/* ------------------------------------------------------------------ */

interface ProfileCheck {
  passed: boolean;
  weight: number;
  score: number;
  label_en: string;
  label_ar: string;
  current_value: string;
}

interface AuditResponse {
  client_id: string;
  company_name: string;
  score: number;
  max_score: number;
  grade: string;
  checks: Record<string, ProfileCheck>;
  recommendations_en: { field: string; priority: number; recommendation: string }[];
  recommendations_ar: { field: string; priority: number; recommendation: string }[];
  profile_data: Record<string, unknown>;
  composio_connected: boolean;
  audited_at: string;
}

interface Fix {
  field: string;
  action: string;
  content: unknown;
  label: string;
  instruction: string;
}

interface AutoFixResponse {
  client_id: string;
  company_name: string;
  score_before: number;
  score_after: number;
  improvement: number;
  fixes_applied: Fix[];
  fixes_count: number;
  grade_before: string;
  grade_after: string;
  generated_at: string;
}

interface PhotoShot {
  category: string;
  shot: string;
  subject: string;
  composition: string;
  file_name: string;
  alt_text: string;
  why: string;
}

interface CalendarPost {
  week: number;
  scheduled_date: string;
  scheduled_time: string;
  post_type: string;
  title: string;
  body: string;
  cta_type: string;
  cta_url: string;
  image_suggestion: string;
  estimated_reach: string;
}

interface ReviewStrategy {
  company_name: string;
  review_link: string;
  ask_timing: string;
  weekly_target: number;
  whatsapp_templates: {
    en: { name: string; timing: string; message: string; note: string }[];
    ar: { name: string; timing: string; message: string; note: string }[];
  };
  qr_code_text: { en: string; ar: string; placement: string[] };
  response_templates: Record<
    string,
    { en: string; ar: string; timing: string; auto_send: boolean }
  >;
  do_nots: string[];
  pro_tips: string[];
}

interface ChecklistItem {
  id: number;
  category: string;
  action: string;
  status: string;
  priority: string;
  how_to: string;
  impact: string;
  platforms?: { name: string; url: string; priority: string }[];
}

interface SEOChecklist {
  client_id: string;
  company_name: string;
  current_score: number;
  items: ChecklistItem[];
  summary: {
    total_items: number;
    done: number;
    needed: number;
    partial: number;
    estimated_score_after: number;
  };
}

interface InsightsResponse {
  views: number;
  searches: number;
  calls: number;
  directions: number;
  website_clicks: number;
  photo_views: number;
  review_count: number;
  avg_rating: number;
  data_source: string;
}

/* ------------------------------------------------------------------ */
/*  Utility                                                            */
/* ------------------------------------------------------------------ */

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function scoreRingColor(score: number): string {
  if (score >= 70) return "#34d399";
  if (score >= 40) return "#fbbf24";
  return "#f87171";
}

function priorityBadge(priority: string) {
  const map: Record<string, { bg: string; text: string }> = {
    critical: { bg: "bg-red-500/20", text: "text-red-400" },
    high: { bg: "bg-amber-500/20", text: "text-amber-400" },
    medium: { bg: "bg-blue-500/20", text: "text-blue-400" },
    low: { bg: "bg-zinc-500/20", text: "text-zinc-400" },
  };
  const c = map[priority] || map.medium;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c.bg} ${c.text}`}
    >
      {priority}
    </span>
  );
}

function postTypeBadge(type: string) {
  const map: Record<string, { bg: string; text: string }> = {
    OFFER: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
    UPDATE: { bg: "bg-blue-500/20", text: "text-blue-400" },
    EVENT: { bg: "bg-purple-500/20", text: "text-purple-400" },
    PRODUCT: { bg: "bg-amber-500/20", text: "text-amber-400" },
  };
  const c = map[type] || map.UPDATE;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c.bg} ${c.text}`}
    >
      {type}
    </span>
  );
}

function statusIcon(status: string) {
  if (status === "done")
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  if (status === "partial")
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
      </span>
    );
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-red-400">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreRingColor(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-zinc-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-bold ${scoreColor(score)}`}>{score}</span>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">/ 100</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-zinc-100">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
    >
      {copied ? (
        <>
          <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function SkeletonBar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-800 ${className || "h-4 w-24"}`} />;
}

/* ------------------------------------------------------------------ */
/*  Section components                                                 */
/* ------------------------------------------------------------------ */

function ProfileScoreSection({ audit, loading }: { audit: AuditResponse | null; loading: boolean }) {
  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <SkeletonBar className="h-5 w-32 mb-6" />
        <div className="flex items-center justify-center py-8">
          <SkeletonBar className="h-36 w-36 rounded-full" />
        </div>
      </section>
    );
  }

  if (!audit) return null;

  const checks = Object.entries(audit.checks).sort(
    ([, a], [, b]) => b.weight - a.weight
  );

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-6">
        Profile Score
      </h2>
      <div className="flex flex-col lg:flex-row items-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <ScoreRing score={audit.score} />
          <span
            className={`text-sm font-bold ${scoreColor(audit.score)}`}
          >
            Grade: {audit.grade}
          </span>
          {audit.composio_connected && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Google Connected
            </span>
          )}
        </div>
        <div className="flex-1 w-full space-y-2">
          {checks.map(([field, check]) => (
            <div key={field} className="flex items-center gap-3">
              {check.passed ? (
                <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
              )}
              <span className="text-xs text-zinc-400 w-28 shrink-0 truncate">
                {check.label_en}
              </span>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    check.passed ? "bg-emerald-500" : "bg-red-500/40"
                  }`}
                  style={{ width: `${check.passed ? 100 : 0}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-600 w-10 text-right">
                {check.score}/{check.weight}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AutoFixSection({
  clientId,
  autoFix,
  setAutoFix,
  loading,
}: {
  clientId: string | null;
  autoFix: AutoFixResponse | null;
  setAutoFix: (fix: AutoFixResponse | null) => void;
  loading: boolean;
}) {
  const [running, setRunning] = useState(false);
  const [expandedFix, setExpandedFix] = useState<string | null>(null);

  const runAutoFix = async () => {
    if (!clientId) return;
    setRunning(true);
    const result = await apiFetch<AutoFixResponse>(
      `/gbp/auto-fix/${clientId}`
    );
    if (result) setAutoFix(result);
    setRunning(false);
  };

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          Auto-Fix Panel
        </h2>
        <button
          onClick={runAutoFix}
          disabled={running || loading || !clientId}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {running ? (
            <span className="inline-flex items-center gap-2">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Optimizing...
            </span>
          ) : (
            "Optimize My Profile"
          )}
        </button>
      </div>

      {autoFix ? (
        <div className="space-y-4">
          {/* Score improvement banner */}
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-zinc-500">{autoFix.score_before}</p>
              <p className="text-[10px] text-zinc-600">Before</p>
            </div>
            <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="text-center">
              <p className={`text-2xl font-bold ${scoreColor(autoFix.score_after)}`}>
                {autoFix.score_after}
              </p>
              <p className="text-[10px] text-zinc-600">After</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-emerald-400 font-semibold">
                +{autoFix.improvement} points
              </p>
              <p className="text-[10px] text-zinc-500">
                {autoFix.fixes_count} fixes generated
              </p>
            </div>
          </div>

          {/* Fixes list */}
          <div className="space-y-2">
            {autoFix.fixes_applied.map((fix) => (
              <div
                key={fix.field}
                className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedFix(
                      expandedFix === fix.field ? null : fix.field
                    )
                  }
                  className="w-full flex items-center justify-between p-3 hover:bg-zinc-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-sm font-medium text-zinc-200">
                      {fix.label}
                    </span>
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                      {fix.action}
                    </span>
                  </div>
                  <svg
                    className={`h-4 w-4 text-zinc-500 transition-transform ${
                      expandedFix === fix.field ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedFix === fix.field && (
                  <div className="border-t border-zinc-800 p-4 space-y-3">
                    <p className="text-xs text-zinc-500">{fix.instruction}</p>
                    <div className="rounded-md bg-zinc-900 p-3 text-sm text-zinc-300 max-h-60 overflow-y-auto">
                      {typeof fix.content === "string" ? (
                        <p>{fix.content}</p>
                      ) : (
                        <pre className="text-xs whitespace-pre-wrap font-mono">
                          {JSON.stringify(fix.content, null, 2)}
                        </pre>
                      )}
                    </div>
                    <CopyButton
                      text={
                        typeof fix.content === "string"
                          ? fix.content
                          : JSON.stringify(fix.content, null, 2)
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center">
          <p className="text-sm text-zinc-500">
            Click &ldquo;Optimize My Profile&rdquo; to auto-generate fixes for every
            incomplete field.
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            We will write your description, suggest categories, generate Q&A, create a
            photo shot list, and more.
          </p>
        </div>
      )}
    </section>
  );
}

function PhotoShotListSection({
  shots,
  loading,
}: {
  shots: PhotoShot[];
  loading: boolean;
}) {
  const [checkedPhotos, setCheckedPhotos] = useState<Set<number>>(new Set());

  const togglePhoto = (index: number) => {
    setCheckedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <SkeletonBar className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonBar key={i} className="h-16 w-full" />
          ))}
        </div>
      </section>
    );
  }

  if (!shots.length) return null;

  const doneCount = checkedPhotos.size;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          Photo Shot List
        </h2>
        <span className="text-xs text-zinc-500">
          {doneCount}/{shots.length} done
        </span>
      </div>
      <div className="space-y-2">
        {shots.map((shot, i) => (
          <div
            key={i}
            className={`rounded-lg border p-3 transition-colors cursor-pointer ${
              checkedPhotos.has(i)
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
            }`}
            onClick={() => togglePhoto(i)}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <div
                  className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                    checkedPhotos.has(i)
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-zinc-600"
                  }`}
                >
                  {checkedPhotos.has(i) && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400 uppercase">
                    {shot.category}
                  </span>
                  <span className="text-sm font-medium text-zinc-200 truncate">
                    {shot.shot}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mb-1">{shot.subject}</p>
                <p className="text-xs text-zinc-600 italic">{shot.composition}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-zinc-600 font-mono">
                    {shot.file_name}
                  </span>
                  <CopyButton text={shot.file_name} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PostCalendarSection({
  calendar,
  loading,
}: {
  calendar: CalendarPost[];
  loading: boolean;
}) {
  const [expandedPost, setExpandedPost] = useState<number | null>(null);

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <SkeletonBar className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonBar key={i} className="h-20 w-full" />
          ))}
        </div>
      </section>
    );
  }

  if (!calendar.length) return null;

  // Group by week
  const weeks = new Map<number, CalendarPost[]>();
  for (const post of calendar) {
    const week = post.week || 1;
    if (!weeks.has(week)) weeks.set(week, []);
    weeks.get(week)!.push(post);
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">
        Post Calendar
      </h2>
      <div className="space-y-6">
        {[...weeks.entries()].map(([week, posts]) => (
          <div key={week}>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Week {week}
            </h3>
            <div className="space-y-2">
              {posts.map((post, i) => {
                const globalIdx = calendar.indexOf(post);
                return (
                  <div
                    key={i}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedPost(
                          expandedPost === globalIdx ? null : globalIdx
                        )
                      }
                      className="w-full flex items-center justify-between p-3 hover:bg-zinc-900/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-center shrink-0 w-12">
                          <p className="text-[10px] text-zinc-600 uppercase">
                            {post.scheduled_date
                              ? new Date(
                                  post.scheduled_date + "T00:00:00"
                                ).toLocaleDateString("en-US", {
                                  weekday: "short",
                                })
                              : "TBD"}
                          </p>
                          <p className="text-xs font-bold text-zinc-400">
                            {post.scheduled_date
                              ? new Date(
                                  post.scheduled_date + "T00:00:00"
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "--"}
                          </p>
                        </div>
                        {postTypeBadge(post.post_type)}
                        <span className="text-sm font-medium text-zinc-200 truncate">
                          {post.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
                          {post.cta_type}
                        </span>
                        <svg
                          className={`h-4 w-4 text-zinc-500 transition-transform ${
                            expandedPost === globalIdx ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </button>
                    {expandedPost === globalIdx && (
                      <div className="border-t border-zinc-800 p-4 space-y-3">
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                          {post.body}
                        </p>
                        {post.image_suggestion && (
                          <div className="rounded-md bg-zinc-900 p-3">
                            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">
                              Suggested Image
                            </p>
                            <p className="text-xs text-zinc-400">
                              {post.image_suggestion}
                            </p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <CopyButton text={post.body} />
                          <CopyButton text={post.title} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReviewStrategySection({
  strategy,
  loading,
}: {
  strategy: ReviewStrategy | null;
  loading: boolean;
}) {
  const [showArabic, setShowArabic] = useState(false);
  const [expandedRating, setExpandedRating] = useState<string | null>(null);

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <SkeletonBar className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonBar key={i} className="h-16 w-full" />
          ))}
        </div>
      </section>
    );
  }

  if (!strategy) return null;

  const templates = showArabic
    ? strategy.whatsapp_templates.ar
    : strategy.whatsapp_templates.en;

  const ratingOrder = ["5_star", "4_star", "3_star", "2_star", "1_star"];

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          Review Strategy
        </h2>
        <button
          onClick={() => setShowArabic(!showArabic)}
          className="rounded-md border border-zinc-700 px-2 py-1 text-[10px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {showArabic ? "English" : "Arabic"}
        </button>
      </div>

      {/* Timing and target */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">
            Best Time to Ask
          </p>
          <p className="text-xs text-zinc-300">{strategy.ask_timing}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">
            Weekly Target
          </p>
          <p className="text-xs text-zinc-300">
            {strategy.weekly_target}+ new reviews per week
          </p>
        </div>
      </div>

      {/* WhatsApp Templates */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-zinc-400 mb-2">
          WhatsApp Review Request Templates
        </h3>
        <div className="space-y-2">
          {templates.map((tmpl, i) => (
            <div
              key={i}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-200">
                  {tmpl.name}
                </span>
                <span className="text-[10px] text-zinc-600">{tmpl.timing}</span>
              </div>
              <p
                className="text-xs text-zinc-400 whitespace-pre-wrap mb-2"
                dir={showArabic ? "rtl" : "ltr"}
              >
                {tmpl.message}
              </p>
              <div className="flex items-center gap-2">
                <CopyButton text={tmpl.message} />
                <span className="text-[10px] text-zinc-600 italic">
                  {tmpl.note}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Response Templates */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-zinc-400 mb-2">
          Review Response Templates
        </h3>
        <div className="space-y-1">
          {ratingOrder.map((key) => {
            const tmpl = strategy.response_templates[key];
            if (!tmpl) return null;
            const stars = parseInt(key);
            return (
              <div
                key={key}
                className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedRating(expandedRating === key ? null : key)
                  }
                  className="w-full flex items-center justify-between p-3 hover:bg-zinc-900/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {"*".repeat(stars)}{"*".repeat(0)}
                    </span>
                    <span className="text-xs text-zinc-300">
                      {key.replace("_", " ").replace("star", " Star")}
                    </span>
                    {tmpl.auto_send && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                        auto-send
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-600">
                    {tmpl.timing}
                  </span>
                </button>
                {expandedRating === key && (
                  <div className="border-t border-zinc-800 p-3 space-y-2">
                    <p className="text-xs text-zinc-300 whitespace-pre-wrap">
                      {showArabic ? tmpl.ar : tmpl.en}
                    </p>
                    <CopyButton text={showArabic ? tmpl.ar : tmpl.en} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Do Nots */}
      <div>
        <h3 className="text-xs font-semibold text-red-400 mb-2">
          Never Do This
        </h3>
        <div className="space-y-1">
          {strategy.do_nots.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-zinc-500"
            >
              <svg className="h-3 w-3 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SEOChecklistSection({
  checklist,
  loading,
}: {
  checklist: SEOChecklist | null;
  loading: boolean;
}) {
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<number, string>>(
    {}
  );

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <SkeletonBar className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonBar key={i} className="h-12 w-full" />
          ))}
        </div>
      </section>
    );
  }

  if (!checklist) return null;

  const toggleDone = (id: number, current: string) => {
    setLocalStatuses((prev) => ({
      ...prev,
      [id]: current === "done" ? "needed" : "done",
    }));
  };

  // Group by category
  const categories = new Map<string, ChecklistItem[]>();
  for (const item of checklist.items) {
    if (!categories.has(item.category)) categories.set(item.category, []);
    categories.get(item.category)!.push(item);
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          Local SEO Checklist
        </h2>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-emerald-400">
            {checklist.summary.done} done
          </span>
          <span className="text-amber-400">
            {checklist.summary.partial} partial
          </span>
          <span className="text-red-400">
            {checklist.summary.needed} needed
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {[...categories.entries()].map(([category, items]) => (
          <div key={category}>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              {category}
            </h3>
            <div className="space-y-1">
              {items.map((item) => {
                const currentStatus =
                  localStatuses[item.id] ?? item.status;
                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden"
                  >
                    <div className="flex items-center gap-3 p-3">
                      <button
                        onClick={() => toggleDone(item.id, currentStatus)}
                        className="shrink-0"
                      >
                        {statusIcon(currentStatus)}
                      </button>
                      <button
                        onClick={() =>
                          setExpandedItem(
                            expandedItem === item.id ? null : item.id
                          )
                        }
                        className="flex-1 text-left flex items-center justify-between gap-2"
                      >
                        <span
                          className={`text-xs ${
                            currentStatus === "done"
                              ? "text-zinc-500 line-through"
                              : "text-zinc-300"
                          }`}
                        >
                          {item.action}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {priorityBadge(item.priority)}
                          <svg
                            className={`h-3 w-3 text-zinc-600 transition-transform ${
                              expandedItem === item.id ? "rotate-180" : ""
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </button>
                    </div>
                    {expandedItem === item.id && (
                      <div className="border-t border-zinc-800 p-3 space-y-2">
                        <p className="text-xs text-zinc-400">{item.how_to}</p>
                        {item.impact && (
                          <p className="text-[10px] text-emerald-400/80 italic">
                            Impact: {item.impact}
                          </p>
                        )}
                        {item.platforms && item.platforms.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {item.platforms.map((p) => (
                              <a
                                key={p.name}
                                href={p.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
                              >
                                {p.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function GoogleBusinessPage() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [autoFix, setAutoFix] = useState<AutoFixResponse | null>(null);
  const [shots, setShots] = useState<PhotoShot[]>([]);
  const [calendar, setCalendar] = useState<CalendarPost[]>([]);
  const [strategy, setStrategy] = useState<ReviewStrategy | null>(null);
  const [checklist, setChecklist] = useState<SEOChecklist | null>(null);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);

  // Active tab for mobile
  const [activeTab, setActiveTab] = useState<string>("score");

  // Resolve client_id
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setClientId(uid);
    });
  }, []);

  // Fetch all data
  const fetchData = useCallback(async (cid: string) => {
    setLoading(true);
    setError(null);

    const [auditRes, shotsRes, calendarRes, strategyRes, checklistRes, insightsRes] =
      await Promise.all([
        apiFetch<AuditResponse>(`/gbp/audit/${cid}`),
        apiFetch<PhotoShot[]>(`/gbp/photo-shots/${cid}`),
        apiFetch<CalendarPost[]>(`/gbp/post-calendar/${cid}`),
        apiFetch<ReviewStrategy>(`/gbp/review-strategy/${cid}`),
        apiFetch<SEOChecklist>(`/gbp/seo-checklist/${cid}`),
        apiFetch<InsightsResponse>(`/gbp/insights/${cid}`),
      ]);

    if (auditRes) setAudit(auditRes);
    if (shotsRes && Array.isArray(shotsRes)) setShots(shotsRes);
    if (calendarRes && Array.isArray(calendarRes)) setCalendar(calendarRes);
    if (strategyRes) setStrategy(strategyRes);
    if (checklistRes) setChecklist(checklistRes);
    if (insightsRes) setInsights(insightsRes);

    if (!auditRes && !shotsRes && !calendarRes && !strategyRes && !checklistRes && !insightsRes) {
      setError(
        "Could not reach the GBP API. Check that the prompt-builder is running."
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (clientId) fetchData(clientId);
  }, [clientId, fetchData]);

  const tabs = [
    { key: "score", label: "Score" },
    { key: "fix", label: "Auto-Fix" },
    { key: "photos", label: "Photos" },
    { key: "posts", label: "Posts" },
    { key: "reviews", label: "Reviews" },
    { key: "seo", label: "SEO" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              &larr; Back
            </Link>
            <div>
              <h1 className="text-xl font-bold text-zinc-100">
                Google Business Profile
              </h1>
              <p className="text-sm text-zinc-500">
                Optimize your local presence and attract more customers
              </p>
            </div>
          </div>
          <button
            onClick={() => clientId && fetchData(clientId)}
            disabled={loading || !clientId}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-40 transition-colors"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </header>

      {/* Mobile tab bar */}
      <div className="lg:hidden border-b border-zinc-800 bg-zinc-900 px-4 overflow-x-auto">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Error banner */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Quick Stats */}
        {insights && (
          <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard label="Views" value={insights.views} icon="&#128065;" />
            <StatCard label="Searches" value={insights.searches} icon="&#128269;" />
            <StatCard label="Calls" value={insights.calls} icon="&#128222;" />
            <StatCard label="Directions" value={insights.directions} icon="&#128506;" />
            <StatCard label="Website" value={insights.website_clicks} icon="&#127760;" />
            <StatCard
              label="Reviews"
              value={insights.review_count}
              icon="&#11088;"
            />
            <StatCard
              label="Avg Rating"
              value={insights.avg_rating ? `${insights.avg_rating}/5` : "N/A"}
              icon="&#127942;"
            />
          </section>
        )}

        {insights?.data_source === "estimated_from_conversations" && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <p className="text-[11px] text-amber-400">
              Numbers are estimates from conversation data. Connect Google
              Business via Composio for real metrics.
            </p>
          </div>
        )}

        {/* Desktop: all sections visible. Mobile: tab-based. */}
        <div className="space-y-6">
          {/* Profile Score */}
          <div className={`${activeTab !== "score" ? "hidden lg:block" : ""}`}>
            <ProfileScoreSection audit={audit} loading={loading} />
          </div>

          {/* Auto-Fix */}
          <div className={`${activeTab !== "fix" ? "hidden lg:block" : ""}`}>
            <AutoFixSection
              clientId={clientId}
              autoFix={autoFix}
              setAutoFix={setAutoFix}
              loading={loading}
            />
          </div>

          {/* Two-column layout for photos + posts */}
          <div
            className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${
              activeTab !== "photos" && activeTab !== "posts"
                ? "hidden lg:grid"
                : ""
            }`}
          >
            <div
              className={`${activeTab !== "photos" ? "hidden lg:block" : ""}`}
            >
              <PhotoShotListSection shots={shots} loading={loading} />
            </div>
            <div
              className={`${activeTab !== "posts" ? "hidden lg:block" : ""}`}
            >
              <PostCalendarSection calendar={calendar} loading={loading} />
            </div>
          </div>

          {/* Review Strategy */}
          <div
            className={`${activeTab !== "reviews" ? "hidden lg:block" : ""}`}
          >
            <ReviewStrategySection strategy={strategy} loading={loading} />
          </div>

          {/* SEO Checklist */}
          <div className={`${activeTab !== "seo" ? "hidden lg:block" : ""}`}>
            <SEOChecklistSection checklist={checklist} loading={loading} />
          </div>
        </div>
      </main>
    </div>
  );
}

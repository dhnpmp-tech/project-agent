"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";

/* ------------------------------------------------------------------ */
/*  API base                                                           */
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
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DayActivity {
  date: string;
  label: string;
  messages: number;
  bookings: number;
  conversations: number;
}

interface FunnelStep {
  label: string;
  count: number;
  rate: number;
}

interface ChannelStat {
  channel: string;
  count: number;
  percentage: number;
  color: string;
}

interface AIPerformance {
  name_capture_rate: number;
  avg_messages_per_conversation: number;
  avg_response_time_ms: number;
  booking_completion_rate: number;
}

interface Insight {
  label: string;
  value: string;
  icon: "question" | "clock" | "menu" | "alert";
}

interface DashboardData {
  overview: {
    total_messages: number;
    total_bookings: number;
    total_conversations: number;
    active_guests: number;
  };
  trends: DayActivity[];
  funnel: FunnelStep[];
}

interface ChannelData {
  channels: ChannelStat[];
}

interface LearningData {
  ai_performance: AIPerformance;
  insights: Insight[];
}

/* ------------------------------------------------------------------ */
/*  Seed data (used when API returns nothing)                          */
/* ------------------------------------------------------------------ */

function seedTrends(): DayActivity[] {
  const days: DayActivity[] = [];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString().split("T")[0],
      label: dayNames[d.getDay() === 0 ? 6 : d.getDay() - 1],
      messages: Math.floor(Math.random() * 40) + 10,
      bookings: Math.floor(Math.random() * 8) + 1,
      conversations: Math.floor(Math.random() * 15) + 5,
    });
  }
  return days;
}

function seedFunnel(): FunnelStep[] {
  return [
    { label: "Conversations", count: 124, rate: 100 },
    { label: "Menu Views", count: 87, rate: 70.2 },
    { label: "Booking Started", count: 34, rate: 27.4 },
    { label: "Booking Completed", count: 21, rate: 16.9 },
  ];
}

function seedChannels(): ChannelStat[] {
  return [
    { channel: "WhatsApp", count: 312, percentage: 68, color: "#10b981" },
    { channel: "Widget", count: 98, percentage: 21, color: "#3b82f6" },
    { channel: "Telegram", count: 48, percentage: 11, color: "#8b5cf6" },
  ];
}

function seedAIPerformance(): AIPerformance {
  return {
    name_capture_rate: 78,
    avg_messages_per_conversation: 6.4,
    avg_response_time_ms: 1200,
    booking_completion_rate: 62,
  };
}

function seedInsights(): Insight[] {
  return [
    { label: "Most Asked Question", value: "Do you have outdoor seating?", icon: "question" },
    { label: "Best Performing Time", value: "7:00 PM - 9:00 PM", icon: "clock" },
    { label: "Most Popular Item", value: "Wagyu Burger", icon: "menu" },
    { label: "At-Risk Customers", value: "3 inactive 14+ days", icon: "alert" },
  ];
}

/* ------------------------------------------------------------------ */
/*  SVG Charts                                                         */
/* ------------------------------------------------------------------ */

function ActivityBarChart({ data }: { data: DayActivity[] }) {
  const maxVal = Math.max(...data.flatMap((d) => [d.messages, d.bookings, d.conversations]), 1);
  const chartW = 700;
  const chartH = 200;
  const barGroupW = chartW / data.length;
  const barW = barGroupW * 0.22;
  const gap = 4;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${chartW} ${chartH + 40}`} className="w-full min-w-[500px]" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = chartH - frac * chartH;
          return (
            <g key={frac}>
              <line x1={0} y1={y} x2={chartW} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={-4} y={y + 4} fill="#9ca3af" fontSize={10} textAnchor="end">
                {Math.round(frac * maxVal)}
              </text>
            </g>
          );
        })}

        {data.map((day, i) => {
          const x = i * barGroupW + barGroupW * 0.15;
          const hMsg = (day.messages / maxVal) * chartH;
          const hBook = (day.bookings / maxVal) * chartH;
          const hConv = (day.conversations / maxVal) * chartH;

          return (
            <g key={day.date}>
              {/* Messages bar - emerald */}
              <rect
                x={x}
                y={chartH - hMsg}
                width={barW}
                height={hMsg}
                rx={2}
                fill="#10b981"
                opacity={0.9}
              />
              {/* Bookings bar - blue */}
              <rect
                x={x + barW + gap}
                y={chartH - hBook}
                width={barW}
                height={hBook}
                rx={2}
                fill="#3b82f6"
                opacity={0.9}
              />
              {/* Conversations bar - amber */}
              <rect
                x={x + (barW + gap) * 2}
                y={chartH - hConv}
                width={barW}
                height={hConv}
                rx={2}
                fill="#f59e0b"
                opacity={0.9}
              />
              {/* Day label */}
              <text
                x={x + barW * 1.5 + gap}
                y={chartH + 16}
                fill="#6b7280"
                fontSize={11}
                textAnchor="middle"
                fontWeight={500}
              >
                {day.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3">
        <LegendDot color="#10b981" label="Messages" />
        <LegendDot color="#3b82f6" label="Bookings" />
        <LegendDot color="#f59e0b" label="Conversations" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

function ConversionFunnel({ steps }: { steps: FunnelStep[] }) {
  const maxCount = Math.max(...steps.map((s) => s.count), 1);

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const widthPct = Math.max((step.count / maxCount) * 100, 12);
        const colors = [
          "bg-emerald-500",
          "bg-emerald-400",
          "bg-blue-400",
          "bg-blue-500",
        ];
        return (
          <div key={step.label} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 font-medium">{step.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{step.count}</span>
                {i > 0 && (
                  <span className="text-xs text-gray-400">
                    ({step.rate}%)
                  </span>
                )}
              </div>
            </div>
            <div className="h-7 bg-gray-100 rounded-md overflow-hidden">
              <div
                className={`h-full ${colors[i]} rounded-md transition-all duration-500`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChannelBreakdown({ channels }: { channels: ChannelStat[] }) {
  const total = channels.reduce((sum, c) => sum + c.count, 0) || 1;

  // SVG donut chart
  const size = 160;
  const strokeW = 28;
  const radius = (size - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg width={size} height={size} className="shrink-0">
        {channels.map((ch) => {
          const pct = ch.count / total;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={ch.channel}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={ch.color}
              strokeWidth={strokeW}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        })}
        <text
          x={size / 2}
          y={size / 2 - 6}
          textAnchor="middle"
          fill="#111827"
          fontSize={20}
          fontWeight={700}
        >
          {total}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 12}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize={11}
        >
          total
        </text>
      </svg>

      <div className="space-y-3 flex-1 w-full">
        {channels.map((ch) => (
          <div key={ch.channel} className="flex items-center gap-3">
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: ch.color }}
            />
            <span className="text-sm text-gray-700 flex-1">{ch.channel}</span>
            <span className="text-sm font-semibold text-gray-900">{ch.count}</span>
            <span className="text-xs text-gray-400 w-10 text-right">{ch.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AI Performance Cards                                               */
/* ------------------------------------------------------------------ */

function AIPerformanceCards({ perf }: { perf: AIPerformance }) {
  const cards = [
    {
      label: "Name Capture Rate",
      value: `${perf.name_capture_rate}%`,
      sub: "of conversations",
      accent: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Avg Messages / Convo",
      value: perf.avg_messages_per_conversation.toFixed(1),
      sub: "messages",
      accent: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Response Time",
      value: perf.avg_response_time_ms < 1000
        ? `${perf.avg_response_time_ms}ms`
        : `${(perf.avg_response_time_ms / 1000).toFixed(1)}s`,
      sub: "average",
      accent: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Booking Completion",
      value: `${perf.booking_completion_rate}%`,
      sub: "of started bookings",
      accent: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-lg ${c.bg} p-4`}>
          <p className={`text-2xl font-bold ${c.accent}`}>{c.value}</p>
          <p className="text-xs text-gray-600 mt-1 font-medium">{c.label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Insights Cards                                                     */
/* ------------------------------------------------------------------ */

const INSIGHT_ICONS: Record<string, React.ReactNode> = {
  question: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
  ),
  clock: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  menu: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  ),
  alert: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
};

function InsightCards({ insights }: { insights: Insight[] }) {
  const accents: Record<string, { text: string; bg: string }> = {
    question: { text: "text-emerald-600", bg: "bg-emerald-50" },
    clock: { text: "text-blue-600", bg: "bg-blue-50" },
    menu: { text: "text-amber-600", bg: "bg-amber-50" },
    alert: { text: "text-red-600", bg: "bg-red-50" },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {insights.map((ins) => {
        const a = accents[ins.icon] || accents.question;
        return (
          <div key={ins.label} className="rounded-lg border border-gray-200 bg-white p-4 flex items-start gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${a.bg} ${a.text} shrink-0`}>
              {INSIGHT_ICONS[ins.icon]}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">{ins.label}</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{ins.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Period Selector                                                    */
/* ------------------------------------------------------------------ */

function PeriodSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const options = [
    { label: "7 days", value: 7 },
    { label: "14 days", value: 14 },
    { label: "30 days", value: 30 },
  ];

  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt.value
              ? "bg-gray-900 text-white"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);

  const [trends, setTrends] = useState<DayActivity[]>(seedTrends());
  const [funnel, setFunnel] = useState<FunnelStep[]>(seedFunnel());
  const [channels, setChannels] = useState<ChannelStat[]>(seedChannels());
  const [aiPerf, setAiPerf] = useState<AIPerformance>(seedAIPerformance());
  const [insights, setInsights] = useState<Insight[]>(seedInsights());
  const [overview, setOverview] = useState({
    total_messages: 458,
    total_bookings: 21,
    total_conversations: 124,
    active_guests: 67,
  });

  // Resolve client_id from Supabase session
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("clients")
      .select("id")
      .single()
      .then(({ data }) => {
        if (data?.id) setClientId(data.id);
      });
  }, []);

  // Fetch data from VPS APIs
  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const [dashRes, chRes, learnRes] = await Promise.all([
        apiFetch<DashboardData>(`/tracking/dashboard/${clientId}?days=${days}`),
        apiFetch<ChannelData>(`/chat/channels/${clientId}?days=${days}`),
        apiFetch<LearningData>(`/karpathy/${clientId}/learnings`),
      ]);

      if (dashRes) {
        setOverview(dashRes.overview);
        if (dashRes.trends?.length) setTrends(dashRes.trends);
        if (dashRes.funnel?.length) setFunnel(dashRes.funnel);
      }
      if (chRes?.channels?.length) setChannels(chRes.channels);
      if (learnRes) {
        if (learnRes.ai_performance) setAiPerf(learnRes.ai_performance);
        if (learnRes.insights?.length) setInsights(learnRes.insights);
      }
    } catch {
      // keep seed data on error
    } finally {
      setLoading(false);
    }
  }, [clientId, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
              Dashboard
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-600">Reports</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                AI performance, conversion funnels, and channel insights
              </p>
            </div>
            <PeriodSelector value={days} onChange={setDays} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Loading bar */}
        {loading && (
          <div className="h-0.5 w-full bg-gray-100 rounded overflow-hidden">
            <div className="h-full w-1/3 bg-brand-500 rounded animate-pulse" />
          </div>
        )}

        {/* Overview Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <OverviewCard label="Total Messages" value={overview.total_messages} icon="message" />
          <OverviewCard label="Bookings" value={overview.total_bookings} icon="calendar" />
          <OverviewCard label="Conversations" value={overview.total_conversations} icon="chat" />
          <OverviewCard label="Active Guests" value={overview.active_guests} icon="users" />
        </section>

        {/* 7-Day Activity Chart */}
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Activity -- Last {days} Days
          </h2>
          <ActivityBarChart data={trends} />
        </section>

        {/* Conversion Funnel + Channel Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Conversion Funnel</h2>
            <ConversionFunnel steps={funnel} />
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Channel Breakdown</h2>
            <ChannelBreakdown channels={channels} />
          </section>
        </div>

        {/* AI Performance */}
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">AI Performance</h2>
          <AIPerformanceCards perf={aiPerf} />
        </section>

        {/* Top Insights */}
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Top Insights</h2>
          <InsightCards insights={insights} />
        </section>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Overview card with icon                                            */
/* ------------------------------------------------------------------ */

const OVERVIEW_ICONS: Record<string, React.ReactNode> = {
  message: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  ),
  calendar: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  ),
  chat: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  ),
  users: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  ),
};

function OverviewCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400">{OVERVIEW_ICONS[icon]}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

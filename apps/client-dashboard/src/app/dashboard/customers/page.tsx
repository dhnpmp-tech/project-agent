// Customer Memory dashboard.
//
// The teardown promises that the agent writes a persistent profile for
// every customer who messages — allergy, preference, usual order,
// sentiment trail, visit count, etc. That promise was untested in the
// product until now: the data was being written to customer_memory by
// the WhatsApp inbound pipeline, but no surface let an owner SEE it.
//
// This page reads customer_memory for the current tenant, ranks by
// recency + frequency, and renders cards in the same shape the teardown
// shows. Search by name / phone narrows the list.

import Link from "next/link";
import { db } from "@/lib/db";
import { getClient } from "@/lib/server-queries";

interface CustomerRow {
  id: string;
  phone_number: string;
  name: string | null;
  email: string | null;
  language: string | null;
  total_conversations: number | null;
  total_messages: number | null;
  profile_summary: string | null;
  preferences: Record<string, unknown> | null;
  key_events: { ts: string; kind: string; note: string }[] | null;
  lead_score: number | null;
  lead_status: string | null;
  lifetime_value: string | null;
  tags: string[] | null;
  avg_sentiment: string | null;
  first_contact: string;
  last_contact: string;
}

async function fetchCustomers(
  clientId: string | null,
  query: string,
): Promise<CustomerRow[]> {
  if (!clientId) return [];
  try {
    const q = `%${query.toLowerCase()}%`;
    const rows = await db()<CustomerRow[]>`
      SELECT id, phone_number, name, email, language, total_conversations,
             total_messages, profile_summary, preferences, key_events,
             lead_score, lead_status, lifetime_value, tags, avg_sentiment,
             first_contact, last_contact
      FROM customer_memory
      WHERE client_id = ${clientId}
        AND (
          ${query.length === 0}::boolean
          OR LOWER(COALESCE(name, '')) LIKE ${q}
          OR LOWER(phone_number) LIKE ${q}
          OR LOWER(COALESCE(email, '')) LIKE ${q}
        )
      ORDER BY last_contact DESC NULLS LAST
      LIMIT 120
    `;
    return rows;
  } catch (e) {
    console.error("[customers] fetchCustomers", e);
    return [];
  }
}

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = (params.q || "").trim();
  const client = await getClient();
  const clientId = client?.id ?? null;
  const customers = await fetchCustomers(clientId, query);

  const totalConvos = customers.reduce(
    (acc, c) => acc + (c.total_conversations ?? 0),
    0,
  );
  const withName = customers.filter((c) => c.name).length;
  const vips = customers.filter(
    (c) => (c.lead_status || "").toLowerCase().includes("vip"),
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
            &larr; Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Customer Memory</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {client?.company_name || "Your business"} · every customer your agent
          has talked to, with the profile it built along the way.
        </p>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile k="known customers" v={customers.length.toLocaleString()} />
          <StatTile k="total conversations" v={totalConvos.toLocaleString()} />
          <StatTile k="profiles with name" v={withName.toLocaleString()} />
          <StatTile k="VIPs" v={vips.toLocaleString()} />
        </div>

        {/* Search */}
        <form className="bg-white rounded-lg border border-gray-200 p-3 flex gap-3 items-center">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search name, phone, or email…"
            className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-gray-400"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded hover:bg-gray-700"
          >
            Search
          </button>
        </form>

        {/* Empty state */}
        {customers.length === 0 && (
          <div className="bg-white rounded-lg border border-dashed border-gray-200 p-8 text-center">
            <p className="text-gray-500 text-sm">
              {query
                ? `No customers match "${query}".`
                : "No customer profiles yet — the first time a customer messages your agent, a card lands here automatically."}
            </p>
          </div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => (
            <CustomerCard key={c.id} c={c} />
          ))}
        </div>

        {customers.length >= 120 && (
          <p className="text-center text-xs text-gray-400 mt-4">
            Showing first 120 — narrow with a search above.
          </p>
        )}
      </main>
    </div>
  );
}

function StatTile({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <div className="text-2xl font-serif text-gray-900 tabular-nums">{v}</div>
      <div className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">
        {k}
      </div>
    </div>
  );
}

function CustomerCard({ c }: { c: CustomerRow }) {
  const initial = (c.name || c.phone_number || "?").trim()[0]?.toUpperCase() || "?";
  const status = c.lead_status || (c.total_conversations && c.total_conversations >= 5 ? "Returning" : "First-time");
  const sentiment = c.avg_sentiment ? Number(c.avg_sentiment) : null;
  const lastSeenIso = c.last_contact?.slice(0, 10) || "";

  const prefs = c.preferences || {};
  const prefEntries = Object.entries(prefs).slice(0, 4);
  const keyEvents = (c.key_events || []).slice(-3).reverse();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center text-lg font-serif italic">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-serif text-gray-900 truncate">
            {c.name || c.phone_number}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-emerald-700">
            {status} · {c.total_conversations ?? 0} conv · last {lastSeenIso}
          </div>
        </div>
      </div>

      {c.profile_summary && (
        <p className="text-sm text-gray-700 italic line-clamp-3 mb-3">
          {c.profile_summary}
        </p>
      )}

      {prefEntries.length > 0 && (
        <div className="space-y-1 mb-3">
          {prefEntries.map(([k, v]) => (
            <div
              key={k}
              className="flex gap-2 text-xs"
            >
              <span className="text-[10px] uppercase tracking-widest text-gray-500 w-20 flex-shrink-0">
                {k}
              </span>
              <span className="text-gray-800 truncate">{String(v)}</span>
            </div>
          ))}
        </div>
      )}

      {sentiment !== null && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-widest text-gray-500">
            sentiment
          </span>
          <SentimentBar value={sentiment} />
          <span className="text-xs text-gray-700 tabular-nums">{sentiment.toFixed(2)}</span>
        </div>
      )}

      {c.tags && c.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {c.tags.slice(0, 6).map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-700 uppercase tracking-wider"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {keyEvents.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">
            Recent
          </div>
          <ul className="space-y-1 text-xs text-gray-600">
            {keyEvents.map((e, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-gray-400 tabular-nums flex-shrink-0">
                  {(e.ts || "").slice(0, 10)}
                </span>
                <span className="truncate">{e.note || e.kind}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SentimentBar({ value }: { value: number }) {
  // Sentiment is typically -1 to +1 or 0 to 1. We normalise to 0..1.
  const norm = Math.max(0, Math.min(1, value > 1 ? value / 5 : value < 0 ? (value + 1) / 2 : value));
  const color = norm >= 0.7 ? "bg-emerald-500" : norm >= 0.4 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex-1 h-1.5 bg-gray-100 rounded overflow-hidden">
      <div
        className={`h-full ${color}`}
        style={{ width: `${Math.round(norm * 100)}%` }}
      />
    </div>
  );
}

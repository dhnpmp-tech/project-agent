import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://n8n.srv1328172.hstgr.cloud";

/* ─────────────────────────────────────────────────────────────────────── */
/*  Types                                                                  */
/* ─────────────────────────────────────────────────────────────────────── */

interface DailyPulseData {
  headline: string;
  metrics: Record<string, number | null>;
  highlights: string[];
  owner_message: string;
  generated_at: string;
}

interface NoShowEntry {
  outcome: string;
  reason: string | null;
  recovered_revenue_minor: number | null;
  created_at: string;
}

interface DepositEntry {
  status: string;
  amount_minor: number;
  currency: string;
  requested_at: string;
}

interface ExpenseEntry {
  vendor: string | null;
  category: string | null;
  amount_minor: number;
  currency: string;
  vat_minor: number | null;
  status: string;
  receipt_date: string | null;
  created_at: string;
}

interface LearnedRule {
  rule: string;
  status: string;
  added: string;
  reason?: string;
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Page                                                                   */
/* ─────────────────────────────────────────────────────────────────────── */

export default async function OwnerHubPage() {
  const supabase = await createServerSupabase();

  const { data: client } = await supabase
    .from("clients")
    .select("id, company_name")
    .single();

  const clientId = client?.id ?? null;

  const [pulse, noShow, deposits, expenses, kb] = await Promise.all([
    fetchPulse(clientId),
    fetchNoShowLog(supabase, clientId),
    fetchDeposits(supabase, clientId),
    fetchExpenses(supabase, clientId),
    fetchKnowledge(supabase, clientId),
  ]);

  const learnedRules = (kb?.learned_rules ?? []) as LearnedRule[];
  const verifiedSkills = learnedRules.filter(
    (r) => r.status === "verified" || r.status === "active",
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-gray-600"
          >
            &larr; Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Owner Hub</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {client?.company_name || "Your business"} · everything an owner needs
          before opening up.
        </p>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <DailyPulseTile pulse={pulse} clientId={clientId} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NoShowTile log={noShow} deposits={deposits} />
          <ReceiptsTile expenses={expenses} clientId={clientId} />
        </div>

        <SkillsTile rules={verifiedSkills} clientId={clientId} />
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Tiles                                                                  */
/* ─────────────────────────────────────────────────────────────────────── */

function DailyPulseTile({
  pulse,
  clientId,
}: {
  pulse: DailyPulseData | null;
  clientId: string | null;
}) {
  if (!pulse) {
    return (
      <Card>
        <SectionHeader
          title="Daily Pulse"
          subtitle="Your morning brief — sent to your WhatsApp at 8:30am."
        />
        <p className="text-sm text-gray-500 mt-3">
          No pulse data yet — once you have bookings or chats, this fills in
          automatically.
        </p>
      </Card>
    );
  }

  const m = pulse.metrics ?? {};
  return (
    <Card>
      <div className="flex items-start justify-between">
        <SectionHeader
          title="Daily Pulse"
          subtitle="Your morning brief — sent to your WhatsApp at 8:30am."
        />
        {clientId && (
          <SendPulseButton clientId={clientId} />
        )}
      </div>

      <p className="mt-3 text-lg font-medium text-gray-900">{pulse.headline}</p>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Metric label="Bookings today" value={m.bookings_today ?? 0} />
        <Metric
          label="Projected revenue"
          value={`AED ${formatNumber(Number(m.projected_revenue_aed) || 0)}`}
        />
        <Metric label="Yesterday chats" value={m.yesterday_conversations ?? 0} />
        <Metric label="High-value today" value={m.high_value_today ?? 0} />
      </div>

      {pulse.highlights?.length ? (
        <ul className="mt-5 space-y-1.5">
          {pulse.highlights.map((h, i) => (
            <li
              key={i}
              className="text-sm text-gray-700 flex items-start gap-2"
            >
              <span className="mt-1 w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
              <span>{h}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {pulse.owner_message && (
        <details className="mt-5">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            Preview the WhatsApp message
          </summary>
          <pre className="mt-2 text-xs whitespace-pre-wrap text-gray-700 bg-gray-50 border border-gray-100 rounded p-3 leading-relaxed">
            {pulse.owner_message}
          </pre>
        </details>
      )}
    </Card>
  );
}

function NoShowTile({
  log,
  deposits,
}: {
  log: NoShowEntry[];
  deposits: DepositEntry[];
}) {
  const recovered = log
    .filter((l) => l.outcome === "released" || l.outcome === "deposit_paid")
    .reduce((acc, l) => acc + (l.recovered_revenue_minor ?? 0), 0);

  const noShows = log.filter((l) => l.outcome === "no_show").length;
  const depositsPaid = deposits.filter((d) => d.status === "paid").length;
  const depositsPending = deposits.filter(
    (d) => d.status === "requested",
  ).length;

  return (
    <Card>
      <SectionHeader
        title="No-Show Recovery"
        subtitle="Last 30 days · reminders → deposits → waitlist."
      />

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Metric label="Recovered revenue" value={`AED ${formatNumber(recovered / 100)}`} />
        <Metric label="No-shows" value={noShows} />
        <Metric label="Deposits paid" value={depositsPaid} />
        <Metric label="Pending deposits" value={depositsPending} />
      </div>

      {log.length === 0 && (
        <p className="mt-4 text-xs text-gray-500">
          No-show log is empty — first entries appear after the loop runs.
        </p>
      )}
    </Card>
  );
}

function ReceiptsTile({
  expenses,
  clientId,
}: {
  expenses: ExpenseEntry[];
  clientId: string | null;
}) {
  const total = expenses.reduce((acc, e) => acc + (e.amount_minor ?? 0), 0);
  const pendingReview = expenses.filter(
    (e) => e.status === "pending_review",
  ).length;

  return (
    <Card>
      <SectionHeader
        title="Recent Receipts"
        subtitle="Snap on WhatsApp · log auto-extracted via vision."
      />

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Metric label="Total (10 latest)" value={`AED ${formatNumber(total / 100)}`} />
        <Metric label="Pending review" value={pendingReview} />
      </div>

      {expenses.length > 0 ? (
        <ul className="mt-4 divide-y divide-gray-100 border border-gray-100 rounded">
          {expenses.slice(0, 5).map((e, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="text-gray-900 truncate">
                  {e.vendor || "Unknown vendor"}
                </p>
                <p className="text-xs text-gray-500">
                  {e.category ?? "misc"} · {formatDate(e.receipt_date ?? e.created_at)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-gray-900">
                  {(e.amount_minor / 100).toFixed(2)} {e.currency}
                </p>
                {e.status === "pending_review" && (
                  <p className="text-[10px] text-amber-600 uppercase tracking-wide">
                    review
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-gray-500">
          No receipts yet — send a photo to your owner WhatsApp number to log
          one.
        </p>
      )}

      {clientId && (
        <p className="mt-3 text-[11px] text-gray-400">
          Owner WhatsApp · just send a photo of the receipt.
        </p>
      )}
    </Card>
  );
}

function SkillsTile({
  rules,
  clientId,
}: {
  rules: LearnedRule[];
  clientId: string | null;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <SectionHeader
          title="Active Skills"
          subtitle="What your agent has learned and verified — Hermes-style SKILL.md export."
        />
        {clientId && (
          <a
            href={`${API_BASE}/karpathy/skills/${clientId}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-emerald-600 hover:text-emerald-700"
          >
            Export all →
          </a>
        )}
      </div>

      {rules.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">
          Your agent hasn&apos;t verified any skills yet. Skills get promoted
          from probation once they show measurable lift.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rules.slice(0, 6).map((r, i) => (
            <li
              key={i}
              className="border border-gray-100 rounded p-3 hover:border-gray-200 transition"
            >
              <p className="text-sm text-gray-900">{r.rule}</p>
              <p className="mt-1 text-xs text-gray-500">
                {r.status} · added {formatDate(r.added)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Atoms                                                                  */
/* ─────────────────────────────────────────────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {children}
    </section>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {subtitle && (
        <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="border border-gray-100 rounded p-3">
      <p className="text-[11px] text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-gray-900">
        {value ?? 0}
      </p>
    </div>
  );
}

function SendPulseButton({ clientId }: { clientId: string }) {
  // Lightweight: posts to the API proxy, refreshes the page.
  return (
    <form
      action={`/api/owner/daily-pulse/send/${clientId}`}
      method="post"
      className="m-0"
    >
      <button
        type="submit"
        className="text-xs text-emerald-600 hover:text-emerald-700 border border-emerald-200 rounded px-2.5 py-1"
      >
        Send to WhatsApp
      </button>
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Data fetchers                                                          */
/* ─────────────────────────────────────────────────────────────────────── */

async function fetchPulse(clientId: string | null): Promise<DailyPulseData | null> {
  if (!clientId) return null;
  try {
    const res = await fetch(`${API_BASE}/owner/daily-pulse/preview/${clientId}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as DailyPulseData;
  } catch {
    return null;
  }
}

async function fetchNoShowLog(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  clientId: string | null,
): Promise<NoShowEntry[]> {
  if (!clientId) return [];
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from("no_show_log")
    .select("outcome, reason, recovered_revenue_minor, created_at")
    .eq("client_id", clientId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data as NoShowEntry[]) ?? [];
}

async function fetchDeposits(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  clientId: string | null,
): Promise<DepositEntry[]> {
  if (!clientId) return [];
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from("deposit_requests")
    .select("status, amount_minor, currency, requested_at")
    .eq("client_id", clientId)
    .gte("requested_at", since)
    .order("requested_at", { ascending: false })
    .limit(100);
  return (data as DepositEntry[]) ?? [];
}

async function fetchExpenses(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  clientId: string | null,
): Promise<ExpenseEntry[]> {
  if (!clientId) return [];
  const { data } = await supabase
    .from("expenses")
    .select(
      "vendor, category, amount_minor, currency, vat_minor, status, receipt_date, created_at",
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(10);
  return (data as ExpenseEntry[]) ?? [];
}

async function fetchKnowledge(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  clientId: string | null,
): Promise<{ learned_rules?: LearnedRule[] } | null> {
  if (!clientId) return null;
  const { data } = await supabase
    .from("business_knowledge")
    .select("crawl_data")
    .eq("client_id", clientId)
    .single();
  const crawl = (data?.crawl_data ?? {}) as { learned_rules?: LearnedRule[] };
  return crawl;
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Formatters                                                             */
/* ─────────────────────────────────────────────────────────────────────── */

function formatNumber(n: number): string {
  return n.toLocaleString("en-AE", { maximumFractionDigits: 0 });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-AE", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "—";
  }
}

// /dashboard/integrations/gmail
//
// One-shot OAuth flow for connecting the tenant's existing Gmail to
// the Gmail-triage agent. The whole stream — triage cron, owner-brief
// "📧 Email queue" line, hot-lead → daily action queue routing — is
// dormant until this page is used to authorize Composio.
//
// Pattern: Server Component reads live status from prompt-builder.
// Connected → show last triage snapshot. Disconnected → show a
// "Connect Gmail" button (client component) that POSTs to
// /api/integrations/gmail/initiate, gets a Composio redirectUrl,
// opens it in a new tab.

import Link from "next/link";
import { getServerSession } from "@/lib/session";
import { ConnectGmailButton } from "./connect-button";

const PROMPT_BUILDER_URL =
  process.env.PROMPT_BUILDER_URL || "http://76.13.179.86:8200";

interface ConnectionStatus {
  connected: boolean;
  connection_id: string | null;
  last_snapshot_date: string | null;
  last_snapshot_total: number | null;
}

async function fetchStatus(clientId: string): Promise<ConnectionStatus> {
  try {
    const r = await fetch(
      `${PROMPT_BUILDER_URL}/connections/gmail/status/${clientId}`,
      { cache: "no-store" },
    );
    if (!r.ok) {
      return {
        connected: false,
        connection_id: null,
        last_snapshot_date: null,
        last_snapshot_total: null,
      };
    }
    return (await r.json()) as ConnectionStatus;
  } catch {
    return {
      connected: false,
      connection_id: null,
      last_snapshot_date: null,
      last_snapshot_total: null,
    };
  }
}

export default async function GmailIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}): Promise<JSX.Element> {
  const session = await getServerSession();
  if (!session?.clientId) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold">Gmail Integration</h1>
        <p className="mt-4 text-zinc-400">
          You need to be signed in to connect Gmail.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
        >
          Sign in
        </Link>
      </main>
    );
  }

  const status = await fetchStatus(session.clientId);
  const justConnected = (await searchParams).connected === "1";

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight">
        Gmail Triage
      </h1>
      <p className="mt-3 text-zinc-400">
        Connect your Gmail and the agent will read your inbox every
        morning, classify each thread (urgent · hot lead · supplier ·
        receipt · etc.), and fold the summary into your 9am WhatsApp
        brief. Hot leads with replies needed auto-queue into tomorrow&apos;s
        approval list.
      </p>

      {justConnected && status.connected && (
        <div className="mt-6 rounded-md border border-emerald-700 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
          ✓ Gmail connected. First triage runs tonight at 8am Dubai
          time. Tomorrow&apos;s brief will include the email summary.
        </div>
      )}

      <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Connection</h2>
            <p className="mt-1 text-sm text-zinc-500">
              One Gmail account per tenant. Connect the owner&apos;s primary
              business inbox.
            </p>
          </div>
          <span
            className={
              "rounded-full px-3 py-1 text-xs font-medium " +
              (status.connected
                ? "bg-emerald-900/40 text-emerald-300"
                : "bg-zinc-800 text-zinc-400")
            }
          >
            {status.connected ? "Connected" : "Not connected"}
          </span>
        </div>

        {!status.connected ? (
          <div className="mt-6">
            <ConnectGmailButton />
            <p className="mt-3 text-xs text-zinc-500">
              You&apos;ll be redirected to Google to authorize the
              connection. We request read-only access to Gmail plus the
              ability to send replies on your behalf — only when you
              approve a draft via the daily brief.
            </p>
          </div>
        ) : (
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-zinc-500">Connection ID</dt>
              <dd className="mt-1 font-mono text-xs text-zinc-300">
                {status.connection_id ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Last triage</dt>
              <dd className="mt-1 text-zinc-300">
                {status.last_snapshot_date
                  ? `${status.last_snapshot_date} · ${status.last_snapshot_total ?? 0} threads`
                  : "Pending first run"}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-lg font-semibold">How it works</h2>
        <ol className="mt-4 space-y-3 text-sm text-zinc-400">
          <li>
            <span className="font-medium text-zinc-200">1. Daily at 8am Dubai</span>{" "}
            — the agent pulls the last 24h of threads.
          </li>
          <li>
            <span className="font-medium text-zinc-200">2. Each thread is classified</span>{" "}
            into one of 8 buckets — urgent, hot lead, supplier, receipt,
            newsletter, internal, spam, other.
          </li>
          <li>
            <span className="font-medium text-zinc-200">3. 9am brief includes</span>{" "}
            a one-line summary: <code>📧 Email queue: 3 urgent · 1 hot lead · 2 supplier</code>.
          </li>
          <li>
            <span className="font-medium text-zinc-200">4. Hot leads queue replies</span>{" "}
            for tomorrow — drafts appear in your daily action queue
            with approval letters (A C E).
          </li>
        </ol>
      </section>
    </main>
  );
}

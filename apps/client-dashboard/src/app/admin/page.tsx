"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api-url";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AdminClient {
  id: string;
  company_name: string;
  status: string;
  plan: string;
  created_at: string;
  contact_email: string | null;
  contact_phone: string | null;
  country: string | null;
  agent_count: number;
  persona_name: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20";
    case "pending":
      return "bg-amber-500/10 text-amber-400 ring-amber-500/20";
    default:
      return "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20";
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Skeleton Loader                                                    */
/* ------------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-white/[0.06] ${className}`}
    />
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-xl bg-white/[0.03] p-5 ring-1 ring-white/[0.06]">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-36" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-16 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-8" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-24" />
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-5 ring-1 ring-white/[0.06]">
      <p className="text-xs font-medium uppercase tracking-wider text-white/40">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-semibold font-mono ${
          accent ? "text-emerald-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminOverviewPage() {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch(apiUrl("/api/admin/clients"));
        if (!res.ok) {
          throw new Error(`Failed to fetch clients (${res.status})`);
        }
        const data = await res.json();
        setClients(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchClients();
  }, []);

  /* ---- Derived stats ---- */
  const totalClients = clients.length;
  const activeAgents = clients.reduce((sum, c) => sum + c.agent_count, 0);
  const activeClients = clients.filter((c) => c.status === "active").length;

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-white/40">
          Platform-wide metrics and client management.
        </p>
      </div>

      {/* Stats Row */}
      {loading ? (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Clients" value={totalClients} />
          <StatCard label="Active Agents" value={activeAgents} />
          <StatCard label="Total Conversations" value="-" />
          <StatCard
            label="System Status"
            value={activeClients > 0 ? "Operational" : "No Data"}
            accent={activeClients > 0}
          />
        </div>
      )}

      {/* New Feature Stats */}
      {loading ? (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Pipeline Value" value="-" accent />
          <StatCard label="Active AI Rules" value="-" />
          <StatCard label="Content Generated (Week)" value="-" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Clients Table */}
      <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06]">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-sm font-semibold">Clients</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs uppercase tracking-wider text-white/40">
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Agents</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <>
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </>
              ) : clients.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-white/30"
                  >
                    No clients found.
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr
                    key={client.id}
                    className="transition-colors hover:bg-white/[0.04]"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="font-medium text-white hover:text-emerald-400 transition-colors"
                      >
                        {client.company_name}
                      </Link>
                      {client.persona_name && (
                        <p className="mt-0.5 text-xs text-white/30">
                          {client.persona_name}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusColor(client.status)}`}
                      >
                        {client.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {client.plan || "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-white/60">
                      {client.agent_count}
                    </td>
                    <td className="px-4 py-3 text-white/40">
                      {formatDate(client.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// /dashboard — owner-facing operations view, paper palette.
// Server component; all stats are pulled in a single fetchDashboardData()
// call and filtered by RLS to the signed-in client.

import Link from "next/link";
import { fetchDashboardData } from "@/lib/dashboard-queries";
import { createServerSupabase } from "@/lib/supabase-server";
import { AgentStatusCard } from "@/components/agent-status-card";
import { ActivityFeed } from "@/components/activity-feed";
import { SessionRefresh } from "@/components/session-refresh";
import { NeuralBrain } from "@/components/neural-brain";
import { DashboardShell } from "@/components/dashboard-shell";
import type { AgentDeployment, ActivityLog } from "@project-agent/shared-types";

const PAPER_MUT = "var(--paper-mut)";
const PAPER_INK = "var(--paper-ink)";

function fmtInt(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

function fmtSentiment(s: number | null): string {
  if (s == null) return "—";
  return (s * 100).toFixed(0) + "%";
}

// Tiny SVG sparkline. No external library; values are normalized into the box.
function Sparkline({ values, color = "var(--paper-teal)" }: { values: number[]; color?: string }) {
  if (!values.length) return null;
  const w = 120;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1e-6, max - min);
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (w - 2) + 1;
      const y = h - 2 - ((v - min) / range) * (h - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className="dcp-paper-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export default async function DashboardPage() {
  const supabase = await createServerSupabase();

  // Real data: client/stats/brain in one round trip; agents + activities alongside.
  const [data, agentsRes, activitiesRes] = await Promise.all([
    fetchDashboardData(),
    supabase
      .from("agent_deployments")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const agents = (agentsRes.data as AgentDeployment[] | null) || [];
  const activities = (activitiesRes.data as ActivityLog[] | null) || [];
  const hasData = !!data.client;

  // Sparkline placeholders — replace with real time-series as those tables land.
  // For now, derive a flat trace anchored on the current value so the line
  // visually exists without inventing fake history.
  const flat = (n: number): number[] => Array(7).fill(n);

  return (
    <DashboardShell
      companyName={data.client?.company_name ?? null}
      plan={data.client?.plan ?? null}
      status={data.client?.status ?? null}
    >
      <SessionRefresh hasData={hasData} />

      {/* Daily pulse — 4 real stats */}
      <section className="dcp-paper-section">
        <div className="dcp-paper-section-hd">
          <h2 className="dcp-paper-h2">Today</h2>
          <span className="dcp-paper-eyebrow">§ daily pulse</span>
        </div>
        <div className="dcp-paper-statrow">
          <div className="dcp-paper-stat">
            <div className="dcp-paper-stat-k">Open conversations · 24h</div>
            <div className="dcp-paper-stat-v">{fmtInt(data.stats.openConversations)}</div>
            <Sparkline values={flat(data.stats.openConversations)} />
          </div>
          <div className="dcp-paper-stat">
            <div className="dcp-paper-stat-k">Bookings today</div>
            <div className="dcp-paper-stat-v">{fmtInt(data.stats.todayBookings)}</div>
            <Sparkline values={flat(data.stats.todayBookings)} />
          </div>
          <div className="dcp-paper-stat">
            <div className="dcp-paper-stat-k">Owner queue</div>
            <div className="dcp-paper-stat-v">{fmtInt(data.stats.ownerQueue)}</div>
            <Sparkline values={flat(data.stats.ownerQueue)} color="var(--paper-orange)" />
          </div>
          <div className="dcp-paper-stat">
            <div className="dcp-paper-stat-k">Avg sentiment</div>
            <div className="dcp-paper-stat-v">
              {fmtSentiment(data.stats.avgSentiment)}
              {data.stats.avgSentiment != null && <span className="u">positive</span>}
            </div>
            <Sparkline
              values={flat(data.stats.avgSentiment ?? 0)}
              color={
                data.stats.avgSentiment != null && data.stats.avgSentiment >= 0.5
                  ? "var(--paper-teal)"
                  : "var(--paper-orange)"
              }
            />
          </div>
        </div>
      </section>

      {/* Agents */}
      <section className="dcp-paper-section">
        <div className="dcp-paper-section-hd">
          <h2 className="dcp-paper-h2">Your agents</h2>
          <span className="dcp-paper-eyebrow">
            § {fmtInt(agents.length)} deployed
          </span>
        </div>
        {agents.length === 0 ? (
          <div className="dcp-paper-surface" style={{ textAlign: "center", color: PAPER_MUT }}>
            No agents deployed yet
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            {agents.map((agent) => (
              <AgentStatusCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </section>

      {/* Brain */}
      <section className="dcp-paper-section">
        <div className="dcp-paper-section-hd">
          <h2 className="dcp-paper-h2">Your AI brain</h2>
          <span className="dcp-paper-eyebrow">
            § {fmtInt(data.brain.totalCustomers)} customers · {fmtInt(data.brain.totalFacts)} facts
          </span>
        </div>
        <div className="dcp-paper-surface" style={{ padding: 0 }}>
          <NeuralBrain
            totalCustomers={data.brain.totalCustomers}
            totalFacts={data.brain.totalFacts}
            isLoading={false}
          />
        </div>
      </section>

      {/* Sub-tool grid */}
      <section className="dcp-paper-section">
        <div className="dcp-paper-section-hd">
          <h2 className="dcp-paper-h2">Tools</h2>
          <span className="dcp-paper-eyebrow">§ go deeper</span>
        </div>
        <div className="dcp-paper-tools">
          <Link href="/dashboard/whatsapp" className="dcp-paper-tool">
            <div className="dcp-paper-tool-eyebrow">Channel · A</div>
            <h3 className="dcp-paper-tool-title">WhatsApp Inbox</h3>
            <p className="dcp-paper-tool-sub">
              See every conversation. Jump in when the agent hands off.
            </p>
          </Link>
          <Link href="/dashboard/owner" className="dcp-paper-tool">
            <div className="dcp-paper-tool-eyebrow">Owner · B</div>
            <h3 className="dcp-paper-tool-title">Owner Hub</h3>
            <p className="dcp-paper-tool-sub">
              Pending approvals, briefings, escalations from your owner brain.
            </p>
          </Link>
          <Link href="/dashboard/reports" className="dcp-paper-tool">
            <div className="dcp-paper-tool-eyebrow">Insights · C</div>
            <h3 className="dcp-paper-tool-title">Reports</h3>
            <p className="dcp-paper-tool-sub">
              Funnels, AI performance, channel mix, weekly trends.
            </p>
          </Link>
          <Link href="/dashboard/sales" className="dcp-paper-tool">
            <div className="dcp-paper-tool-eyebrow">Agent · D</div>
            <h3 className="dcp-paper-tool-title">Sales Rep</h3>
            <p className="dcp-paper-tool-sub">
              Pipeline, leads, outbound campaigns from the SDR agent.
            </p>
          </Link>
          <Link href="/dashboard/content" className="dcp-paper-tool">
            <div className="dcp-paper-tool-eyebrow">Agent · E</div>
            <h3 className="dcp-paper-tool-title">Content Engine</h3>
            <p className="dcp-paper-tool-sub">
              Posts, blogs, newsletters drafted and scheduled by the agent.
            </p>
          </Link>
          <Link href="/dashboard/google-business" className="dcp-paper-tool">
            <div className="dcp-paper-tool-eyebrow">Agent · F</div>
            <h3 className="dcp-paper-tool-title">Google Business</h3>
            <p className="dcp-paper-tool-sub">
              Profile updates, review replies, local SEO maintenance.
            </p>
          </Link>
          <Link href="/dashboard/channels" className="dcp-paper-tool">
            <div className="dcp-paper-tool-eyebrow">Channel · G</div>
            <h3 className="dcp-paper-tool-title">Channels</h3>
            <p className="dcp-paper-tool-sub">
              WhatsApp, Web Widget, Telegram, Instagram connections.
            </p>
          </Link>
          <Link href="/dashboard/widget" className="dcp-paper-tool">
            <div className="dcp-paper-tool-eyebrow">Channel · H</div>
            <h3 className="dcp-paper-tool-title">Web Widget</h3>
            <p className="dcp-paper-tool-sub">
              Customize and embed the chat widget on your site.
            </p>
          </Link>
          <Link href="/dashboard/booking-settings" className="dcp-paper-tool">
            <div className="dcp-paper-tool-eyebrow">Settings · I</div>
            <h3 className="dcp-paper-tool-title">Booking Settings</h3>
            <p className="dcp-paper-tool-sub">
              Calendar slots, capacity, dietary fields, confirmation flow.
            </p>
          </Link>
        </div>
      </section>

      {/* Activity */}
      <section className="dcp-paper-section">
        <div className="dcp-paper-section-hd">
          <h2 className="dcp-paper-h2">Recent activity</h2>
          <Link
            href="/dashboard/activity"
            className="dcp-paper-eyebrow"
            style={{ textDecoration: "none", color: PAPER_INK }}
          >
            view all →
          </Link>
        </div>
        <ActivityFeed activities={activities} />
      </section>
    </DashboardShell>
  );
}

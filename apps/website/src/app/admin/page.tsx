"use client";

// /admin — public-facing marketing mockup of the DCP-internal operations view.
// Ported from /tmp/dcp-design/assets/admin.jsx (179 LOC).
// The real authed admin lives in apps/client-dashboard and is OUT OF SCOPE.

import { useState } from "react";
import { SubShell } from "@/components/dcp/sub-shell";
import { Reveal } from "@/components/dcp/motion";
import { Eyebrow, Stat, StatRow } from "@/components/dcp/chrome";
import { useLang, fmtInt } from "@/components/dcp/lib";
import {
  ADMIN_CLIENTS,
  ADMIN_REGIONS,
  type AdminClient,
  type AdminTier,
} from "@/lib/admin-data";

/* ─── HERO ─────────────────────────────────────────────────────── */

function AdminHero() {
  const { lang } = useLang();
  const ar = lang === "ar";
  return (
    <section className="section">
      <div className="container">
        <Reveal>
          <Eyebrow>
            § ADMIN · {ar ? "العمليّات" : "operations"}
          </Eyebrow>
          <h1 className="display-2" style={{ marginTop: 8 }}>
            {ar ? (
              <>
                كل عميل، <em className="grad">في لمحة</em>.
              </>
            ) : (
              <>
                Every client, <em className="grad">at a glance</em>.
              </>
            )}
          </h1>
          <p className="lede" style={{ maxWidth: "60ch" }}>
            {ar
              ? "إدارة العملاء، الإيرادات، صحّة الوكلاء، التنبيهات. جميع الأرقام محدّثة في الوقت الحقيقي."
              : "Manage clients, revenue, agent health, escalations. All numbers update in real time."}
          </p>
          <div
            className="mono"
            style={{
              marginTop: 12,
              fontSize: 11,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "var(--mut)",
              border: "1px dashed var(--hair)",
              padding: "8px 12px",
              display: "inline-block",
            }}
          >
            {ar
              ? "معاينة · بيانات تصميم — لا تعكس عملاء حقيقيّين"
              : "Preview · design mockup — figures are illustrative, not live customer data"}
          </div>
        </Reveal>

        <StatRow>
          <Stat
            k={ar ? "عملاء نشطون" : "active clients"}
            v={fmtInt(382, lang)}
            delta="+18 this mo"
            spark={[280, 290, 310, 325, 340, 358, 370, 378, 382]}
          />
          <Stat
            k="MRR"
            v="847,200"
            unit="SAR"
            delta="+12.4%"
            spark={[600, 640, 680, 710, 740, 770, 800, 820, 847]}
          />
          <Stat
            k={ar ? "محادثات شهريّة" : "monthly conversations"}
            v="2.84"
            unit="M"
            delta="+22%"
            spark={[1.2, 1.4, 1.7, 1.9, 2.1, 2.3, 2.5, 2.7, 2.84]}
          />
          <Stat
            k={ar ? "تنبيهات مفتوحة" : "open escalations"}
            v="3"
            delta="-2"
            deltaDir="down"
            spark={[8, 7, 6, 7, 5, 4, 5, 3, 3]}
          />
        </StatRow>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 20,
            marginTop: 24,
          }}
        >
          <ClientsTable />
          <RegionPanel />
        </div>
      </div>
    </section>
  );
}

/* ─── CLIENTS TABLE ───────────────────────────────────────────── */

const TIER_FILTERS: ReadonlyArray<{ key: "all" | AdminTier; label: string }> = [
  { key: "all", label: "All" },
  { key: "starter", label: "Starter" },
  { key: "growth", label: "Growth" },
  { key: "pro", label: "Pro" },
  { key: "enterprise", label: "Enterprise" },
];

function ClientsTable() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [tier, setTier] = useState<"all" | AdminTier>("all");
  const visible: AdminClient[] =
    tier === "all" ? ADMIN_CLIENTS : ADMIN_CLIENTS.filter((c) => c.tier === tier);

  return (
    <div>
      <div className="surface-hd" style={{ marginBottom: 0, padding: "12px 0" }}>
        <b>
          {ar ? "العملاء" : "Clients"} · {fmtInt(visible.length, lang)}
        </b>
        <div style={{ display: "flex", gap: 4 }}>
          {TIER_FILTERS.map(({ key, label }) => {
            const on = tier === key;
            return (
              <button
                key={key}
                type="button"
                className="opt"
                onClick={() => setTier(key)}
                style={{
                  padding: "4px 10px",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  background: on ? "var(--ink)" : "var(--paper)",
                  color: on ? "var(--bg)" : "var(--mut)",
                  border: "1px solid " + (on ? "var(--ink)" : "var(--hair)"),
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>{ar ? "العميل" : "Client"}</th>
            <th>{ar ? "المنطقة" : "Region"}</th>
            <th>{ar ? "الباقة" : "Tier"}</th>
            <th>MRR</th>
            <th>{ar ? "محادثات/يوم" : "Convs/day"}</th>
            <th>{ar ? "الحالة" : "State"}</th>
          </tr>
        </thead>
        <tbody>
          {visible.slice(0, 14).map((c) => (
            <tr key={c.id}>
              <td>
                <span className="admin-name">{c.name}</span>
              </td>
              <td>
                <span className="admin-region">{c.region}</span>
              </td>
              <td>
                <span className="admin-pill">
                  <span className={"tier-dot tier-" + c.tier} />
                  {c.tier}
                </span>
              </td>
              <td>
                <span className="admin-mrr">{fmtInt(c.mrr, lang)} SAR</span>
              </td>
              <td>
                <span className="admin-mrr">{fmtInt(c.convs, lang)}</span>
              </td>
              <td>
                <span className={"admin-pill " + (c.health === "ok" ? "ok" : "warn")}>
                  <span className="d" />{" "}
                  {c.health === "ok" ? (ar ? "يعمل" : "healthy") : ar ? "تنبيه" : "alert"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── REGION PANEL ────────────────────────────────────────────── */

function RegionPanel() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const max = Math.max(...ADMIN_REGIONS.map((x) => x.count));
  return (
    <div className="surface flush">
      <div className="surface-hd">
        <b>{ar ? "حسب المنطقة" : "By region"}</b>
        <span>SA · UAE</span>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {ADMIN_REGIONS.map((r) => {
          const pct = (r.count / max) * 100;
          return (
            <li
              key={r.id}
              style={{ padding: "14px 18px", borderBottom: "1px solid var(--hair)" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: 18,
                    color: "var(--ink)",
                  }}
                >
                  {r.name}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--mut)",
                    letterSpacing: ".12em",
                  }}
                >
                  {r.code} ·{" "}
                  <span style={{ color: "var(--ink)" }}>{fmtInt(r.count, lang)}</span>
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  background: "var(--bg-2)",
                  marginTop: 8,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: pct + "%",
                    background:
                      "linear-gradient(90deg, var(--teal), var(--orange))",
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─── PAGE ────────────────────────────────────────────────────── */

export default function AdminPage() {
  return (
    <SubShell active="dash">
      <AdminHero />
    </SubShell>
  );
}

"use client";

// /spec — the canonical Najim spec library. One page that points at
// every hardwired artifact. Linked from the homepage footer and from
// every place the architecture document is referenced.

import Link from "next/link";
import { DcpProvider } from "@/components/dcp/provider";
import { useLang } from "@/components/dcp/lib";
import { Nav, type NavLink } from "@/components/dcp/chrome";
import { Arrow } from "@/components/dcp/icons";

function buildNavLinks(lang: "en" | "ar"): NavLink[] {
  return [
    { href: "/", label: lang === "ar" ? "الرئيسية" : "Home", key: "home" },
    { href: "/brain", label: lang === "ar" ? "الدماغ" : "The Brain", key: "brain" },
    { href: "/pricing", label: lang === "ar" ? "العرض" : "The offer", key: "pricing" },
    { href: "/teardown", label: lang === "ar" ? "تشريح مجاني" : "Free audit", key: "teardown" },
    { href: "/changelog", label: lang === "ar" ? "السجل" : "Changelog", key: "changelog" },
  ];
}

interface SpecCard {
  title: string;
  desc: string;
  href: string;
  kind: "html" | "md" | "json" | "sh" | "py" | "sql";
  size?: string;
}

const SPECS: SpecCard[] = [
  {
    title: "The Najim Brain — architecture + deploy runbook",
    desc: "Canonical spec. Architecture diagram, bootstrap procedure, per-tenant provisioning, integration points, verification, rollback. Spec v1.0.0.",
    href: "/spec/najim-brain.html",
    kind: "html",
    size: "563 lines · ~41 KB",
  },
  {
    title: "Versions · pinned",
    desc: "Every container tag, gbrain SHA, port, env var, model name. Single source of truth — drift is a git diff.",
    href: "https://github.com/dhnpmp-tech/project-agent/blob/main/docs/architecture/najim-brain-versions.json",
    kind: "json",
  },
  {
    title: "Implementation checklist",
    desc: "5-phase tracker — pre-flight, bootstrap, engineering scaffolding, first-tenant provisioning, cutover & hand-off. Done when grep returns nothing.",
    href: "https://github.com/dhnpmp-tech/project-agent/blob/main/docs/architecture/najim-brain-checklist.md",
    kind: "md",
  },
  {
    title: "bootstrap.sh — one-time VPS install",
    desc: "Executable §5 of the spec. Idempotent, fail-fast, [ok]/[skip]/[fatal] markers map 1:1 to numbered sub-steps.",
    href: "https://github.com/dhnpmp-tech/project-agent/blob/main/scripts/najim-brain/bootstrap.sh",
    kind: "sh",
    size: "258 lines",
  },
  {
    title: "provision-tenant.sh — replicable per-tenant deploy",
    desc: "Executable §6. Four args (tenant_id, slug, name, owner_email), 7 verified steps, ≈ 10 min per tenant.",
    href: "https://github.com/dhnpmp-tech/project-agent/blob/main/scripts/najim-brain/provision-tenant.sh",
    kind: "sh",
    size: "193 lines",
  },
  {
    title: "gbrain.py — Python integration module",
    desc: "Locked function signatures for prompt-builder. get_context(), append_fact(), format_context_for_prompt(). Implementation fills bodies; cannot invent surface.",
    href: "https://github.com/dhnpmp-tech/project-agent/blob/main/backend/prompt-builder/gbrain.py",
    kind: "py",
    size: "155 lines",
  },
  {
    title: "021_clients_gbrain.sql — schema migration",
    desc: "Real migration file. Adds clients.gbrain_token, gbrain_source_slug, gbrain_provisioned_at + two indexes. IF NOT EXISTS throughout.",
    href: "https://github.com/dhnpmp-tech/project-agent/blob/main/packages/supabase/migrations/021_clients_gbrain.sql",
    kind: "sql",
    size: "38 lines",
  },
  {
    title: "test_najim_brain.py — verification suite",
    desc: "§10 as pytest. Health, stats, retrieval relevance, p95 latency, Dream Cycle. Green tests are the only legitimate \"done\" signal.",
    href: "https://github.com/dhnpmp-tech/project-agent/blob/main/backend/prompt-builder/tests/test_najim_brain.py",
    kind: "py",
    size: "154 lines",
  },
];

const KIND_COLOR: Record<SpecCard["kind"], string> = {
  html: "#d4924b",
  md: "#9f87f0",
  json: "#7da8d4",
  sh: "#5d8a4a",
  py: "#c3a358",
  sql: "#c47373",
};

function SpecLibrary() {
  const { lang } = useLang();
  return (
    <>
      <section className="section" style={{ paddingTop: 56, paddingBottom: 24 }}>
        <div className="container">
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              opacity: 0.55,
              marginBottom: 12,
            }}
          >
            {lang === "ar" ? "مكتبة المواصفات · مفتوحة" : "Spec library · open"}
          </div>
          <h1
            className="display tight"
            style={{ marginBottom: 16, maxWidth: "20ch" }}
          >
            {lang === "ar" ? (
              <>
                المواصفات <em>قانونية</em>.
              </>
            ) : (
              <>
                The spec <em>is canonical.</em>
              </>
            )}
          </h1>
          <p
            className="lede-strong"
            style={{ maxWidth: "64ch", opacity: 0.85, fontSize: 17 }}
          >
            {lang === "ar"
              ? "نشر صريح لكل قطعة من معماريّة نجم. الكود مُلزم بهذه الوثائق — وليس العكس. إذا اختلف الكود مع المواصفة، المواصفة تكسب."
              : "Every piece of Najim's architecture, published openly. Code is bound to these documents — not the other way around. If code disagrees with the spec, the spec wins."}
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 16, paddingBottom: 80 }}>
        <div className="container">
          <div style={{ display: "grid", gap: 14 }}>
            {SPECS.map((s) => (
              <a
                key={s.href}
                href={s.href}
                target={s.kind === "html" ? "_self" : "_blank"}
                rel="noreferrer"
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 18,
                  alignItems: "center",
                  padding: "22px 26px",
                  border: "1px solid var(--line, rgba(255,255,255,0.08))",
                  borderRadius: 10,
                  background: "var(--card-bg, rgba(255,255,255,0.02))",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "border-color 200ms ease, transform 200ms ease",
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: KIND_COLOR[s.kind],
                    border: `1px solid ${KIND_COLOR[s.kind]}55`,
                    padding: "4px 9px",
                    borderRadius: 4,
                    minWidth: 56,
                    textAlign: "center",
                  }}
                >
                  {s.kind}
                </span>
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontFamily: "var(--serif, Georgia, serif)",
                      marginBottom: 4,
                      lineHeight: 1.3,
                    }}
                  >
                    {s.title}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.72, lineHeight: 1.5 }}>{s.desc}</div>
                  {s.size && (
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        opacity: 0.45,
                        marginTop: 6,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {s.size}
                    </div>
                  )}
                </div>
                <span style={{ color: KIND_COLOR[s.kind], fontSize: 18 }}>
                  <Arrow size={14} />
                </span>
              </a>
            ))}
          </div>

          <div
            style={{
              marginTop: 36,
              padding: "20px 24px",
              border: "1px solid rgba(212,146,75,0.25)",
              borderRadius: 10,
              background: "rgba(212,146,75,0.04)",
              fontSize: 13,
              lineHeight: 1.6,
              color: "var(--fg-mute, #a4abb5)",
            }}
          >
            <b style={{ color: "#d4924b" }}>Hardwiring rules.</b>{" "}
            {lang === "ar"
              ? "إذا اختلفت الوثيقة، ملف الإصدارات، والكود — الوثيقة تكسب، ثم JSON، ثم الكود. لا تعديل لـ bootstrap.sh أو provision-tenant.sh بدون تحديث § من المواصفة في نفس commit. pytest الأخضر هو الوحيد الذي يعني \"تم\"."
              : "If the doc, versions.json, and code disagree — doc wins, then JSON, then code. Never edit bootstrap.sh or provision-tenant.sh without updating §5 or §6 of the spec in the same commit. Green pytest is the only legitimate \u201Cdone.\u201D"}
          </div>
        </div>
      </section>
    </>
  );
}

function SpecApp() {
  const { lang } = useLang();
  return (
    <div className="page">
      <Nav
        links={buildNavLinks(lang)}
        active="home"
        status={{
          label: lang === "ar" ? "متاحون للتوظيف · الإمارات والسعودية" : "HIRING · UAE & SAUDI",
        }}
        ctaLabel={lang === "ar" ? "احجز موعد التشغيل" : "Schedule kickoff"}
        ctaHref="/kickoff"
      />
      <SpecLibrary />
    </div>
  );
}

export default function SpecPage() {
  return (
    <DcpProvider initialLang="en">
      <SpecApp />
    </DcpProvider>
  );
}

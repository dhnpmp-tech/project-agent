"use client";

// Shared chrome for marketing sub-pages (pricing, process, services, etc.).
// Provides DcpProvider + Marquee + Nav + Footer; pages render only their body.

import type { ReactNode } from "react";
import { DcpProvider } from "./provider";
import { Marquee, Nav, type NavLink } from "./chrome";
import { useLang } from "./lib";

const SUB_NAV_KEYS = [
  "home",
  "pricing",
  "process",
  "rami",
  "dash",
  "privacy",
  "book-audit",
] as const;

export type SubNavKey = (typeof SUB_NAV_KEYS)[number];

function SubChrome({
  active,
  children,
}: {
  active?: SubNavKey;
  children: ReactNode;
}) {
  const { lang } = useLang();
  const links: NavLink[] = [
    { href: "/", label: lang === "ar" ? "الخدمات" : "Services", key: "home" },
    { href: "/pricing", label: lang === "ar" ? "الأسعار" : "Pricing", key: "pricing" },
    { href: "/demo", label: lang === "ar" ? "العملية" : "Process", key: "process" },
    { href: "/rami", label: lang === "ar" ? "رامي" : "Rami", key: "rami" },
    { href: "/app", label: lang === "ar" ? "اللوحة" : "Dashboard", key: "dash" },
  ];
  return (
    <div className="page" style={{ minHeight: "100dvh" }}>
      <Marquee />
      <Nav
        links={links}
        active={active}
        status={{ label: lang === "ar" ? "مباشر" : "LIVE · UAE & SAUDI" }}
        ctaLabel={lang === "ar" ? "احجز تدقيقاً" : "Book free audit"}
        ctaHref="/book-audit"
      />
      <main>{children}</main>
      <SubFooter />
    </div>
  );
}

function SubFooter() {
  const { lang } = useLang();
  const cols: Array<[string, Array<[string, string]>]> = [
    [
      lang === "ar" ? "المنتج" : "Product",
      [
        [lang === "ar" ? "الخدمات" : "Services", "/"],
        [lang === "ar" ? "الأسعار" : "Pricing", "/pricing"],
        [lang === "ar" ? "العملية" : "Process", "/demo"],
        [lang === "ar" ? "اللوحة" : "Dashboard", "/app"],
      ],
    ],
    [
      lang === "ar" ? "الشركة" : "Company",
      [
        [lang === "ar" ? "احجز تدقيقاً" : "Book free audit", "/book-audit"],
        [lang === "ar" ? "الخصوصية" : "Privacy", "/privacy"],
      ],
    ],
    [
      lang === "ar" ? "الحساب" : "Account",
      [
        [lang === "ar" ? "تسجيل الدخول" : "Sign in", "/app/login"],
        [lang === "ar" ? "إنشاء حساب" : "Sign up", "/app/signup"],
        [lang === "ar" ? "اللوحة" : "Dashboard", "/app"],
      ],
    ],
  ];
  return (
    <footer
      style={{
        borderTop: "1px solid var(--dcp-line)",
        marginTop: 80,
        padding: "48px 24px 32px",
        background: "var(--dcp-bg)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr repeat(3, 1fr)",
            gap: 40,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/dcp-logo-square.jpeg"
                alt="DCP"
                style={{ width: 32, height: 32, borderRadius: 6 }}
              />
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 13,
                  letterSpacing: ".04em",
                  color: "var(--dcp-ink)",
                }}
              >
                DCP<span style={{ opacity: 0.6 }}>·sa</span>
              </span>
            </div>
            <p
              style={{
                marginTop: 14,
                maxWidth: "32ch",
                fontSize: 13,
                lineHeight: 1.6,
                color: "var(--dcp-mut)",
              }}
            >
              {lang === "ar"
                ? "وكلاء ذكاء اصطناعي لأعمال الإمارات والسعودية. واتساب، مبيعات، محتوى — جاهز خلال أسبوعين."
                : "AI agents for UAE & Saudi SMBs. WhatsApp, sales, content — live in under 2 weeks."}
            </p>
            <div
              style={{
                marginTop: 16,
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: ".1em",
                color: "var(--dcp-teal)",
              }}
            >
              ● {lang === "ar" ? "نظام نشط" : "ALL SYSTEMS NOMINAL"}
            </div>
          </div>
          {cols.map(([h, ls]) => (
            <div key={h}>
              <h4
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  letterSpacing: ".16em",
                  textTransform: "uppercase",
                  color: "var(--dcp-mut)",
                  marginBottom: 12,
                }}
              >
                {h}
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {ls.map(([label, href]) => (
                  <li key={label} style={{ marginBottom: 8 }}>
                    <a
                      href={href}
                      style={{
                        fontSize: 13,
                        color: "var(--dcp-ink)",
                        opacity: 0.8,
                        textDecoration: "none",
                      }}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 40,
            paddingTop: 20,
            borderTop: "1px solid var(--dcp-line)",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "var(--dcp-mut)",
            fontFamily: "var(--mono)",
          }}
        >
          <span>© 2026 DC Power Solutions Company · Riyadh, KSA</span>
          <span>CR: 7053667775 · dcp.sa</span>
        </div>
      </div>
    </footer>
  );
}

export function SubShell({
  active,
  children,
}: {
  active?: SubNavKey;
  children: ReactNode;
}) {
  return (
    <DcpProvider initialLang="en">
      <SubChrome active={active}>{children}</SubChrome>
    </DcpProvider>
  );
}

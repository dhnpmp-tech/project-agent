"use client";

// Paper-palette shell for the /dashboard page.
// Header carries the company name + plan/status pill on the left and a
// hamburger button on the right that reveals all dashboard sub-routes.
// Same visual vocabulary as the marketing /admin mockup (paper bg, mono
// labels, serif headings, hairline borders).

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api-url";

interface ShellProps {
  companyName: string | null;
  plan: string | null;
  status: string | null;
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  group: "core" | "agents" | "channels" | "settings";
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", group: "core" },
  { href: "/dashboard/owner", label: "Owner Hub", group: "core" },
  { href: "/dashboard/whatsapp", label: "WhatsApp Inbox", group: "channels" },
  { href: "/dashboard/channels", label: "Channels", group: "channels" },
  { href: "/dashboard/widget", label: "Web Widget", group: "channels" },
  { href: "/dashboard/sales", label: "Sales Rep", group: "agents" },
  { href: "/dashboard/content", label: "Content Engine", group: "agents" },
  { href: "/dashboard/google-business", label: "Google Business", group: "agents" },
  { href: "/dashboard/reports", label: "Reports", group: "core" },
  { href: "/dashboard/booking-settings", label: "Booking Settings", group: "settings" },
  { href: "/dashboard/support", label: "Request a Change", group: "settings" },
];

const GROUP_LABELS: Record<NavItem["group"], string> = {
  core: "Overview",
  agents: "Agents",
  channels: "Channels",
  settings: "Settings",
};

export function DashboardShell({ companyName, plan, status, children }: ShellProps) {
  const [open, setOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll while menu is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const groups: NavItem["group"][] = ["core", "agents", "channels", "settings"];

  return (
    <div className="dcp-paper-page">
      <header className="dcp-paper-header">
        <div className="dcp-paper-header-in">
          <div className="dcp-paper-brand">
            <h1 className="dcp-paper-company">{companyName || "Dashboard"}</h1>
            <div className="dcp-paper-meta">
              <span className="dcp-paper-pill">PLAN · {plan || "—"}</span>
              <span
                className={
                  "dcp-paper-pill " +
                  (status === "active" ? "ok" : status === "error" ? "err" : "")
                }
              >
                <span className="d" />
                {status || "—"}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="dcp-paper-burger"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
            <span className="dcp-paper-burger-label">Menu</span>
          </button>
        </div>
      </header>

      <main className="dcp-paper-main">{children}</main>

      {open && (
        <div
          className="dcp-paper-menu-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <aside className="dcp-paper-menu" role="dialog" aria-label="Dashboard menu">
            <div className="dcp-paper-menu-hd">
              <span className="dcp-paper-menu-eyebrow">§ NAVIGATE</span>
              <button
                type="button"
                className="dcp-paper-menu-close"
                onClick={() => setOpen(false)}
              >
                ESC
              </button>
            </div>
            <nav className="dcp-paper-menu-body">
              {groups.map((g) => {
                const items = NAV.filter((n) => n.group === g);
                if (items.length === 0) return null;
                return (
                  <div key={g} className="dcp-paper-menu-group">
                    <div className="dcp-paper-menu-glabel">{GROUP_LABELS[g]}</div>
                    <ul>
                      {items.map((it) => (
                        <li key={it.href}>
                          <Link href={it.href} onClick={() => setOpen(false)}>
                            {it.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </nav>
            <div className="dcp-paper-menu-ft">
              <form action={apiUrl("/api/auth/signout")} method="POST">
                <button type="submit" className="dcp-paper-menu-signout">
                  Sign out
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

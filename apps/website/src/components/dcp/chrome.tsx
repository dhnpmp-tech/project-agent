"use client";

// DCP Design Kit — chrome + widgets.
// Ported from /tmp/dcp-design/assets/dcp-kit.jsx (CHROME + WIDGETS sections).

import { Fragment, useEffect, type ReactNode } from "react";
import { useLang, useTweaks } from "./lib";
import { Arrow } from "./icons";
import { MagneticButton, Sparkline } from "./motion";

/* ─── Chrome ─── */

export function Marquee({ text }: { text?: string }) {
  const { t } = useLang();
  const source = text || t.marquee || "";
  const words = source.split(" — ");
  return (
    <div className="marquee">
      <div className="marquee-in">
        {words.map((w, i) => (
          <span key={"a" + i}>{w}</span>
        ))}
        {words.map((w, i) => (
          <span key={"b" + i}>{w}</span>
        ))}
      </div>
    </div>
  );
}

export function Brand({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <a href={href} className="brand">
      <span className="brand-mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dcp-logo-square.jpeg" alt="DCP" />
      </span>
      {!compact && (
        <span className="brand-name">
          DCP<i>·sa</i>
        </span>
      )}
    </a>
  );
}

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <span className="lang-pill">
      <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>
        EN
      </button>
      <button className={lang === "ar" ? "on" : ""} onClick={() => setLang("ar")}>
        ع
      </button>
    </span>
  );
}

export interface NavLink {
  href: string;
  label: string;
  key?: string;
}
interface NavStatus {
  label: string;
}
interface NavProps {
  links?: NavLink[];
  active?: string;
  status?: NavStatus | null;
  right?: ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
}

export function Nav({ links, active, status, right, ctaLabel, ctaHref }: NavProps) {
  const { t } = useLang();
  const nav = t.nav;
  const computedLinks: NavLink[] = links || [
    { href: "#agents", label: nav.agents, key: "agents" },
    { href: "#platform", label: nav.platform, key: "platform" },
    { href: "#pricing", label: nav.pricing, key: "pricing" },
    { href: "#integrations", label: nav.integrations, key: "integrations" },
    { href: "#docs", label: nav.docs, key: "docs" },
  ];
  const st: NavStatus | null = status === undefined ? { label: "RUH · 38ms" } : status;
  return (
    <header className="nav">
      <div className="nav-in">
        <Brand />
        {computedLinks.length > 0 && (
          <nav className="nav-links">
            {computedLinks.map((l, i) => (
              <a key={i} href={l.href} className={active && l.key === active ? "on" : ""}>
                {l.label}
              </a>
            ))}
          </nav>
        )}
        <div className="nav-right">
          {right || (
            <>
              {st && (
                <span className="nav-status">
                  <span className="d" />
                  <span>{st.label}</span>
                </span>
              )}
              <LangToggle />
              <a className="btn ghost small" href="#">
                {nav.signin}
              </a>
              <MagneticButton>
                <a className="btn primary small" href={ctaHref || "#"}>
                  {ctaLabel || nav.start} <Arrow size={12} />
                </a>
              </MagneticButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export type FooterCol = [string, string[]];

export function Footer({ cols }: { cols?: FooterCol[] }) {
  const { t } = useLang();
  const f = t.footer;
  const def: FooterCol[] = cols || [
    [f.product, ["Agents", "Platform", "Owner brain", "Console login"]],
    [f.dev, ["Docs", "API reference", "Setup guide", "Status"]],
    [f.company, ["Support", "Onboarding help", "Enterprise", "System status"]],
    [f.legal, ["Terms of Service", "Privacy Policy", "Acceptable Use", "DPA"]],
  ];
  return (
    <footer className="site foot">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <Brand />
            <p
              style={{
                marginTop: 16,
                maxWidth: "36ch",
                color: "color-mix(in oklab, var(--bg) 75%, transparent)",
                fontSize: 14,
                lineHeight: 1.55,
              }}
            >
              {f.tag}
            </p>
            <div
              style={{
                marginTop: 20,
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: ".1em",
                color: "var(--teal)",
              }}
            >
              ● {f.status}
            </div>
          </div>
          {def.map(([h, ls]) => (
            <div key={h}>
              <h4>{h}</h4>
              <ul>
                {ls.map((l) => (
                  <li key={l}>
                    <a href="#">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="foot-bottom">
          <span>© 2026 DC Power Solutions Company · Riyadh, KSA</span>
          <span>CR: 7053667775 · dcp.sa</span>
        </div>
      </div>
    </footer>
  );
}

export function SectionMeta({
  idx,
  label,
  right,
}: {
  idx: string | number;
  label: string;
  right?: ReactNode;
}) {
  return (
    <div className="section-meta">
      <span>
        <span className="idx">{idx}</span> · {label}
      </span>
      {right ? <span>{right}</span> : null}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}

export function Breadcrumb({ items }: { items: Array<{ href?: string; label: string }> }) {
  return (
    <nav className="crumbs">
      {items.map((it, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="sep">/</span>}
          {it.href ? (
            <a href={it.href}>{it.label}</a>
          ) : (
            <span style={{ color: "var(--ink)" }}>{it.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

/* ─── Widgets ─── */

type Tone = "default" | "info" | "warn" | "err" | "ok";

export function Badge({
  tone = "default",
  pulse = false,
  children,
}: {
  tone?: Tone;
  pulse?: boolean;
  children: ReactNode;
}) {
  const cls = "badge" + (tone !== "default" ? " " + tone : "");
  return (
    <span className={cls}>
      <span className={"d" + (pulse ? " pulse" : "")} />
      {children}
    </span>
  );
}

export function Callout({
  tone = "info",
  label,
  children,
}: {
  tone?: "info" | "warn" | "err";
  label?: string;
  children: ReactNode;
}) {
  const cls = "callout" + (tone === "warn" ? " warn" : tone === "err" ? " err" : "");
  return (
    <div className={cls}>
      {label && <b>{label}</b>}
      {children}
    </div>
  );
}

export function Stat({
  k,
  v,
  unit,
  delta,
  deltaDir = "up",
  spark,
}: {
  k: ReactNode;
  v: ReactNode;
  unit?: ReactNode;
  delta?: ReactNode;
  deltaDir?: "up" | "down";
  spark?: number[];
}) {
  return (
    <div className="stat-card">
      <div className="k">{k}</div>
      <div className="v">
        {v}
        {unit && <span className="u">{unit}</span>}
      </div>
      {delta && (
        <div className={"delta" + (deltaDir === "down" ? " down" : "")}>
          {deltaDir === "down" ? "↓ " : "↑ "}
          {delta}
        </div>
      )}
      {spark && <Sparkline values={spark} height={36} />}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="stat-row">{children}</div>;
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      {children}
      {hint && <div className="field-hint">{hint}</div>}
      {error && <div className="field-err">{error}</div>}
    </label>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}

export function Skeleton({
  variant = "line",
  style,
}: {
  variant?: "line" | "block" | "circle";
  style?: React.CSSProperties;
}) {
  return <div className={"skeleton " + variant} style={style} />;
}

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  footer?: ReactNode;
  children?: ReactNode;
}

export function Modal({ open, onClose, title, footer, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && onClose) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true">
        {title && (
          <div className="modal-hd">
            <h3>{title}</h3>
            <span className="close" onClick={onClose}>
              ESC
            </span>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-ft">{footer}</div>}
      </div>
    </div>
  );
}

export function Toast({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div className="toast">
      <Badge tone={tone} pulse>
        {tone.toUpperCase()}
      </Badge>
      <span>{children}</span>
    </div>
  );
}

export function TweaksPanel({ extra }: { extra?: ReactNode }) {
  const { open, state, setKey } = useTweaks();
  if (!open) return null;
  const palettes = ["midnight", "paper", "mono"] as const;
  return (
    <div className="tweaks on">
      <h4>Tweaks</h4>
      <label>Palette</label>
      <div className="opts">
        {palettes.map((p) => (
          <button
            key={p}
            className={"opt " + (state.palette === p ? "on" : "")}
            onClick={() => setKey("palette", p)}
          >
            {p}
          </button>
        ))}
      </div>
      {extra}
    </div>
  );
}

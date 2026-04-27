"use client";

// DCP Design Kit — context, hooks, formatters.
// Ported from /tmp/dcp-design/assets/dcp-kit.jsx (CONTEXT, FORMATTING, HOOKS sections).
// Omitted: useFeed (depends on bundle's marketplace data, irrelevant to project-agent).

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { DCP_I18N, type Dict, type Lang } from "./i18n";

/* ═══ CONTEXT ═════════════════════════════════════════════════ */

export interface LangContextValue {
  lang: Lang;
  t: Dict;
  setLang: Dispatch<SetStateAction<Lang>>;
}

export const LangCtx = createContext<LangContextValue>({
  lang: "en",
  t: DCP_I18N.en,
  setLang: () => {},
});

export function useLang(): LangContextValue {
  return useContext(LangCtx);
}

/* ═══ FORMATTING ══════════════════════════════════════════════ */

export function fmt(n: number, lang: Lang, opts: Intl.NumberFormatOptions = {}): string {
  const loc = lang === "ar" ? "ar-SA" : "en-US";
  return new Intl.NumberFormat(loc, opts).format(n);
}

export function fmtInt(n: number, lang: Lang): string {
  return fmt(Math.round(n), lang);
}

export function fmtMoney(n: number, lang: Lang, currency: string = "SAR"): string {
  const loc = lang === "ar" ? "ar-SA" : "en-US";
  return new Intl.NumberFormat(loc, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

/* ═══ HOOKS ═══════════════════════════════════════════════════ */

export const reducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useJitter(base: number, opts: { range?: number; interval?: number } = {}): number {
  const { range = 0.04, interval = 2200 } = opts;
  const [v, setV] = useState(base);
  useEffect(() => {
    const id = setInterval(() => {
      const d = (Math.random() - 0.5) * 2 * range;
      setV(base * (1 + d));
    }, interval);
    return () => clearInterval(id);
  }, [base, range, interval]);
  return v;
}

export function useReveal<T extends HTMLElement = HTMLDivElement>(delay: number = 0) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion) {
      el.style.opacity = "1";
      el.style.transform = "none";
      return;
    }
    el.style.opacity = "0";
    el.style.transform = "translateY(18px)";
    el.style.transition = `opacity .9s cubic-bezier(.2,.7,.2,1) ${delay}ms, transform .9s cubic-bezier(.2,.7,.2,1) ${delay}ms`;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "none";
          io.unobserve(el);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    // Fallback: in some sandboxed iframes IntersectionObserver doesn't fire.
    // Force-show after 900ms so content never stays invisible.
    const fallback = window.setTimeout(() => {
      el.style.opacity = "1";
      el.style.transform = "none";
      io.disconnect();
    }, 900 + delay);
    return () => {
      window.clearTimeout(fallback);
      io.disconnect();
    };
  }, [delay]);
  return ref;
}

export function useCountUp(
  target: number,
  opts: { duration?: number; start?: number } = {},
): [number, React.RefObject<HTMLElement | null>] {
  const { duration = 1400, start = 0 } = opts;
  const [val, setVal] = useState(start);
  const ref = useRef<HTMLElement | null>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion) {
      setVal(target);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !done.current) {
          done.current = true;
          const t0 = performance.now();
          const step = (t: number) => {
            const p = Math.min(1, (t - t0) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(target * eased);
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);
  return [val, ref];
}

export interface TweaksState {
  palette?: "midnight" | "paper" | "mono";
  [k: string]: unknown;
}

export function useTweaks() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<TweaksState>({});
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = (e.data || {}) as { type?: string };
      if (d.type === "__activate_edit_mode") setOpen(true);
      if (d.type === "__deactivate_edit_mode") setOpen(false);
    }
    window.addEventListener("message", onMsg);
    if (window.parent) window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);
  function setKey<K extends keyof TweaksState>(k: K, v: TweaksState[K]) {
    setState((s) => ({ ...s, [k]: v }));
    if (window.parent) {
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { [k]: v } }, "*");
    }
    if (k === "palette" && typeof v === "string") {
      document.documentElement.setAttribute("data-palette", v);
    }
  }
  useEffect(() => {
    if (state.palette) document.documentElement.setAttribute("data-palette", state.palette);
    // run once on mount with whatever initial state was
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { open, state, setKey };
}

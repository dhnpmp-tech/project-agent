"use client";

// Floating "text Saffron" CTA — sticky bottom-right, present on every
// marketing page via SubShell. Two-tap activation: tap the bubble →
// WhatsApp opens with a pre-filled "Hi" → Nadia replies in real time.
//
// Why this exists: the demo number is the strongest proof point we
// have. Most prospects forget to try it. This shaves "find the demo
// number" out of the funnel.

import { useEffect, useState } from "react";
import { useLang } from "./lib";

const DEMO_PHONE_INTL = "12058582516";
const DEMO_PHONE_DISPLAY = "+1 (205) 858-2516";

export function StickyDemoCta() {
  const { lang } = useLang();
  const [dismissed, setDismissed] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined"
      ? sessionStorage.getItem("sticky-demo-dismissed")
      : null;
    if (stored === "1") {
      setDismissed(true);
    }
    const onScroll = (): void => {
      setScrolled(window.scrollY > 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (dismissed) return null;

  const visible = scrolled;
  const label = lang === "ar" ? "كلّم نديا" : "Text Nadia";
  const sub = lang === "ar" ? "تجربة حية على واتساب" : "Live WhatsApp demo";

  return (
    <div
      className={`sticky-demo ${visible ? "is-visible" : "is-hidden"}`}
      aria-hidden={!visible}
    >
      <a
        href={`https://wa.me/${DEMO_PHONE_INTL}?text=${encodeURIComponent("Hi")}`}
        target="_blank"
        rel="noreferrer"
        className="sticky-demo-link"
      >
        <span className="sticky-demo-icon" aria-hidden>
          {/* WhatsApp glyph — outlined, doesn't carry brand asset */}
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.371s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
          </svg>
        </span>
        <span className="sticky-demo-body">
          <span className="sticky-demo-label">{label}</span>
          <span className="sticky-demo-sub">{sub} · {DEMO_PHONE_DISPLAY}</span>
        </span>
      </a>
      <button
        type="button"
        className="sticky-demo-close"
        aria-label={lang === "ar" ? "إغلاق" : "Dismiss"}
        onClick={() => {
          sessionStorage.setItem("sticky-demo-dismissed", "1");
          setDismissed(true);
        }}
      >
        ×
      </button>
    </div>
  );
}

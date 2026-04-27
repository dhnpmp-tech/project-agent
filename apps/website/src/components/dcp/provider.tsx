"use client";

// DCP Design Kit — language provider. Wrap any page subtree that uses kit
// components so useLang() returns live state (instead of the en/noop default).

import { useEffect, useState, type ReactNode } from "react";
import { LangCtx } from "./lib";
import { DCP_I18N, type Lang } from "./i18n";

interface DcpProviderProps {
  initialLang?: Lang;
  children: ReactNode;
}

export function DcpProvider({ initialLang = "en", children }: DcpProviderProps) {
  const [lang, setLang] = useState<Lang>(initialLang);

  // Mirror lang to <html> so RTL + Arabic font swap kick in.
  // Also set data-palette so dcp-kit.css palette tokens activate (default midnight).
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-lang", lang);
    html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    html.setAttribute("lang", lang);
    if (!html.getAttribute("data-palette")) {
      html.setAttribute("data-palette", "midnight");
    }
  }, [lang]);

  return (
    <LangCtx.Provider value={{ lang, t: DCP_I18N[lang], setLang }}>{children}</LangCtx.Provider>
  );
}

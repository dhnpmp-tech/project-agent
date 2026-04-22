"use client";

import { usePathname } from "next/navigation";
import { RamiWidget } from "./index";

/**
 * Client wrapper that supplies the current pathname to RamiWidget.
 * Mounted once in the root layout, replacing the legacy n8n widget.
 */
export function RamiWidgetMount() {
  const pathname = usePathname() ?? "/";
  return <RamiWidget pagePath={pathname} />;
}

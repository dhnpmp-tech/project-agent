"use client";

// Calls router.refresh() every 30s so the assignment board re-fetches
// the row set from the server component without a full page reload.
// Pauses while the tab is hidden so we don't burn DB queries against
// background tabs.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_MS = 30_000;

export function BoardLive() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        if (document.visibilityState === "visible") {
          router.refresh();
        }
      }, REFRESH_MS);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        start();
      } else {
        stop();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  return null;
}

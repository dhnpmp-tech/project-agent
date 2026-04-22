"use client";

import { useCallback, useEffect, useState } from "react";

const COOKIE = "ceo_session_id";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
}

export interface UseSessionOpts {
  apiBase: string;
}

export interface UseSessionResult {
  sessionId: string | null;
  forget: () => Promise<void>;
}

export function useSession({ apiBase }: UseSessionOpts): UseSessionResult {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const existing = readCookie(COOKIE);
    if (existing) {
      setSessionId(existing);
      return;
    }
    let cancelled = false;
    fetch(`${apiBase}/session`, {
      method: "POST",
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j && typeof j.session_id === "string") {
          setSessionId(j.session_id);
        }
      })
      .catch(() => {
        // Network failure → widget shows itself disabled. Surfaced upstream.
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  const forget = useCallback(async () => {
    if (!sessionId) return;
    try {
      await fetch(`${apiBase}/forget/${sessionId}`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Even on network failure, clear locally so the user is not stuck.
    }
    deleteCookie(COOKIE);
    setSessionId(null);
  }, [apiBase, sessionId]);

  return { sessionId, forget };
}

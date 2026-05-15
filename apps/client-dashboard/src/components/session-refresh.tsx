"use client";

import { useEffect } from "react";

/**
 * Client component that refreshes the session JWT cookie on mount when
 * the server-rendered page didn't see any tenant data. After a successful
 * refresh we reload so server components re-render with the fresh JWT
 * (now carrying the latest client_id from auth_users).
 *
 * Replaces the old Supabase `supabase.auth.refreshSession()` flow — the
 * dashboard now uses the custom Resend OTP + JWT cookie auth that lives
 * at /api/auth/refresh.
 */
export function SessionRefresh({ hasData }: { hasData: boolean }) {
  useEffect(() => {
    if (hasData) return;

    let cancelled = false;
    fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then((res) => {
        if (cancelled) return;
        // Only reload on a real session rotation — a 401 means the user
        // is genuinely logged out and middleware will redirect to /login
        // on the next navigation anyway. Reloading on 401 risks a loop.
        if (res.ok) {
          window.location.reload();
        }
      })
      .catch(() => {
        /* network blip — stay on the empty state, user can refresh manually */
      });

    return () => {
      cancelled = true;
    };
  }, [hasData]);

  return null;
}

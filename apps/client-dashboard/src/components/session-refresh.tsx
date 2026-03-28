"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase-client";

/**
 * Client component that refreshes the Supabase session on mount.
 * This ensures the JWT cookie has the latest user_metadata (including client_id).
 * Without this, server-side RLS queries may fail after onboarding.
 */
export function SessionRefresh({ hasData }: { hasData: boolean }) {
  useEffect(() => {
    if (!hasData) {
      const supabase = createClient();
      supabase.auth.refreshSession().then(() => {
        // Reload the page so server components re-render with the fresh JWT
        window.location.reload();
      });
    }
  }, [hasData]);

  return null;
}

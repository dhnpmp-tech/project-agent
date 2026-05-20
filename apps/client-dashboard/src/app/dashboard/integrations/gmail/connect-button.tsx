"use client";

// Connect-Gmail button.
//
// POSTs to /api/integrations/gmail/initiate, expects {setup_url}, opens
// it in a new tab so the parent dashboard page stays mounted while
// the user authorizes Gmail in Google's consent screen. On window
// regain-focus we soft-refresh the page so the status pill flips.

import { useState, useTransition } from "react";

export function ConnectGmailButton(): JSX.Element {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = (): void => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await fetch("/api/integrations/gmail/initiate", {
          method: "POST",
        });
        const data = (await r.json()) as { setup_url?: string; message?: string };
        if (!r.ok || !data.setup_url) {
          setError(data.message ?? "Could not start OAuth flow.");
          return;
        }
        // Open in a new tab so dashboard state persists. Once the user
        // finishes auth and returns to the dashboard tab, browser
        // visibilitychange will trigger a server re-render.
        window.open(data.setup_url, "_blank", "noopener,noreferrer");
      } catch (e) {
        setError(e instanceof Error ? e.message : "unknown error");
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "Starting…" : "Connect Gmail"}
        <span aria-hidden>→</span>
      </button>
      {error && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}

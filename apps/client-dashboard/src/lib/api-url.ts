/**
 * Prefixes a path-only URL with the Next.js basePath when one is configured.
 *
 * Next.js auto-prefixes basePath for `<Link>`, `router.push`, server `redirect()`,
 * and image `src`, but does NOT touch `fetch()` calls or plain `<a href>` tags.
 * Use `apiUrl()` for any client-side `fetch()` to keep paths working under
 * `agents.dcp.sa/app` in production and bare `localhost:3000` in dev.
 *
 * @example
 *   await fetch(apiUrl("/api/admin/clients"))
 */
export function apiUrl(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!path.startsWith("/")) {
    throw new Error(`apiUrl requires a leading slash, got: ${path}`);
  }
  return `${basePath}${path}`;
}

/**
 * Detect the user's preferred chat language from the browser.
 * Arabic locales (`ar`, `ar-SA`, etc.) → "ar"; everything else → "en".
 */
export function detectBrowserLang(): "en" | "ar" {
  if (typeof navigator === "undefined") return "en";
  const candidates: string[] = [];
  if (navigator.language) candidates.push(navigator.language);
  if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
  for (const tag of candidates) {
    if (typeof tag === "string" && tag.toLowerCase().startsWith("ar")) {
      return "ar";
    }
  }
  return "en";
}

/** True if a `ceo_session_id` cookie is set on the current document. */
export function hasSessionCookie(): boolean {
  if (typeof document === "undefined") return false;
  return /(?:^|;\s*)ceo_session_id=/.test(document.cookie);
}

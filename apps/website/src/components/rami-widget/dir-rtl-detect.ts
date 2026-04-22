/**
 * Lightweight RTL detection: returns "rtl" if the first strong directional
 * character in the string is RTL (Hebrew, Arabic, Syriac ranges), else "ltr".
 */
export function detectDir(text: string): "ltr" | "rtl" {
  if (!text) return "ltr";
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    // Arabic (0600-06FF, 0750-077F, 08A0-08FF, FB50-FDFF, FE70-FEFF), Hebrew (0590-05FF), Syriac (0700-074F)
    if (
      (code >= 0x0590 && code <= 0x05ff) ||
      (code >= 0x0600 && code <= 0x06ff) ||
      (code >= 0x0700 && code <= 0x074f) ||
      (code >= 0x0750 && code <= 0x077f) ||
      (code >= 0x08a0 && code <= 0x08ff) ||
      (code >= 0xfb50 && code <= 0xfdff) ||
      (code >= 0xfe70 && code <= 0xfeff)
    ) {
      return "rtl";
    }
    // First strong LTR letter — return ltr
    if (
      (code >= 0x0041 && code <= 0x005a) ||
      (code >= 0x0061 && code <= 0x007a)
    ) {
      return "ltr";
    }
  }
  return "ltr";
}

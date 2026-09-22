// `fallback: "none"` makes an unknown code return undefined instead of echoing
// the code back, which is how the controller rejects "xx".
const languageNames = new Intl.DisplayNames(["en"], {
  type: "language",
  fallback: "none",
});

/**
 * Collapses a device locale to the part that changes the translation:
 * "en-US" and "en-GB" both become "en", so they share one cache entry. Chinese
 * keeps its script, because Simplified and Traditional are different outputs.
 * Throws RangeError on a malformed tag.
 */
export function normalizeLanguageCode(code: string): string {
  const locale = new Intl.Locale(code);
  if (locale.language === "zh") {
    return `zh-${locale.maximize().script ?? "Hans"}`;
  }
  return locale.language;
}

/** "ko" → "Korean". Undefined for codes no one has a name for. */
export function languageName(code: string): string | undefined {
  return languageNames.of(code);
}

export interface TextTranslation {
  text: string;
  /** English name of the detected source language, e.g. "Korean". */
  sourceLanguage: string | null;
}

import { GOOGLE_TRANSLATE_API_KEY, TRANSLATION_PROVIDER } from "../../config";
import logger from "../logger";
import { translateWithForhu } from "./forhu-translate.util";
import { translateWithGoogle } from "./google-translate.util";
import { TextTranslation } from "./language.util";

export { languageName, normalizeLanguageCode } from "./language.util";
export type { TextTranslation } from "./language.util";

/**
 * Chat-message translation, behind one of two backends picked at startup:
 *  - "google" (default): Google Cloud Translation v2 — google-translate.util.ts
 *  - "forhu": FORHU's chat-wonder v2 agent — forhu-translate.util.ts
 *
 * Google without a key falls back to FORHU instead of failing every call: the
 * deploy writes a missing GitHub secret as an empty string, and translation
 * should keep working while the key is still being added.
 */

export type TranslationProvider = "google" | "forhu";

function resolveProvider(): TranslationProvider {
  let requested: TranslationProvider = "google";
  if (TRANSLATION_PROVIDER === "forhu") {
    requested = "forhu";
  } else if (TRANSLATION_PROVIDER !== "google") {
    logger.warn(
      `[Translate] Unknown TRANSLATION_PROVIDER "${TRANSLATION_PROVIDER}", using google`,
    );
  }

  if (requested === "google" && !GOOGLE_TRANSLATE_API_KEY) {
    logger.warn(
      "[Translate] GOOGLE_TRANSLATE_API_KEY is empty — translating through FORHU instead",
    );
    return "forhu";
  }
  return requested;
}

export const translationProvider = resolveProvider();
logger.info(`[Translate] Provider: ${translationProvider}`);

export function translateText(
  text: string,
  targetLanguageCode: string,
): Promise<TextTranslation> {
  return translationProvider === "google"
    ? translateWithGoogle(text, targetLanguageCode)
    : translateWithForhu(text, targetLanguageCode);
}

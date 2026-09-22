import axios from "axios";
import { GOOGLE_TRANSLATE_API_KEY } from "../../config";
import logger from "../logger";
import {
  languageName,
  normalizeLanguageCode,
  TextTranslation,
} from "./language.util";

/**
 * Translates chat text through Google Cloud Translation - Basic (v2), the NMT
 * model.
 *
 * Billing is per source character: the first 500,000 a month are free (a $10
 * monthly credit), then $20 per million. The Redis cache in
 * message-translation.service.ts means each message is paid for once per
 * target language, however many viewers tap Translate.
 *
 * The key goes in the X-Goog-Api-Key header rather than `?key=`, so it can
 * never end up in a logged request URL.
 */

const ENDPOINT = "https://translation.googleapis.com/language/translate/v2";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 2;

// v2 names Chinese by region, not by script, so "zh-Hans"/"zh-Hant" (what
// normalizeLanguageCode produces) have to be translated for it.
const TO_GOOGLE: Record<string, string> = {
  "zh-Hans": "zh-CN",
  "zh-Hant": "zh-TW",
};

// Google detects Filipino as "tl" (Tagalog), but phones ask for "fil". Without
// this, a Filipino message shown to a Filipino user would not count as
// same-language, because the display names differ.
const FROM_GOOGLE: Record<string, string> = {
  tl: "fil",
};

export function toGoogleLanguageCode(code: string): string {
  return TO_GOOGLE[code] ?? code;
}

/** Google's detected code → the app's normalised form ("zh-CN" → "zh-Hans"). */
export function fromGoogleLanguageCode(code: string): string | null {
  try {
    const normalized = normalizeLanguageCode(code);
    return FROM_GOOGLE[normalized] ?? normalized;
  } catch {
    return null;
  }
}

// Worth a second try only when the request never got an answer, or Google said
// to come back (429 / 5xx). A 400 or 403 (bad key, quota cap, unsupported
// language) fails the same way twice.
const isRetryable = (status?: number) =>
  !status || status === 429 || status >= 500;

export async function translateWithGoogle(
  text: string,
  targetLanguageCode: string,
): Promise<TextTranslation> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { data } = await axios.post(
        ENDPOINT,
        {
          q: text,
          target: toGoogleLanguageCode(targetLanguageCode),
          // The default is "html", which comes back entity-escaped ("&#39;").
          format: "text",
        },
        {
          headers: { "X-Goog-Api-Key": GOOGLE_TRANSLATE_API_KEY },
          timeout: REQUEST_TIMEOUT_MS,
        },
      );

      const result = data?.data?.translations?.[0];
      const translated =
        typeof result?.translatedText === "string"
          ? result.translatedText.trim()
          : "";
      if (translated) {
        const detected =
          typeof result.detectedSourceLanguage === "string"
            ? fromGoogleLanguageCode(result.detectedSourceLanguage)
            : null;
        return {
          text: translated,
          sourceLanguage: (detected && languageName(detected)) || null,
        };
      }

      logger.warn("[Translate:google] Reply had no translatedText");
      break;
    } catch (error: any) {
      const status: number | undefined = error?.response?.status;
      const reason =
        error?.response?.data?.error?.message ?? error?.message ?? error;
      logger.warn(
        `[Translate:google] Request failed (attempt ${attempt}, status ${status ?? "none"}): ${reason}`,
      );
      if (!isRetryable(status)) break;
    }
  }

  throw new Error("Translation is unavailable right now");
}

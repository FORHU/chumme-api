import { defaultOpenAIRequest } from "./ai-request.util";
import logger from "../logger";

/**
 * Detects the language of user input
 * Useful for handling non-English messages
 *
 * @param userInput - The user's message
 * @returns Language code (e.g., 'en', 'de', 'tl', 'ko') or null if English
 */
export async function detectLanguage(
    userInput: string
): Promise<string | null> {
    try {
        // Quick check: if all ASCII and common English words, skip AI call
        const hasNonEnglishChars = /[^\x00-\x7F]/.test(userInput);
        const commonEnglishPattern =
            /\b(i|am|is|are|was|were|the|a|an|my|your|give|show|play|want|like|feel|sad|happy)\b/i;

        if (!hasNonEnglishChars && commonEnglishPattern.test(userInput)) {
            logger.info(`[LANGUAGE-DETECTION] Quick check: English detected`);
            return null; // English, no need for special handling
        }

        logger.info(`[LANGUAGE-DETECTION] Analyzing language: "${userInput}"`);

        const prompt = `
Detect the language of this text. Return ONLY the language name.

Text: "${userInput}"

If it's English or mostly English, return: english
If it's German, return: german  
If it's Tagalog, return: tagalog
If it's Taglish (Tagalog + English mix), return: taglish
If it's Korean, return: korean
If it's Spanish, return: spanish
If it's mixed/other, return: mixed

Response (one word):`;

        const response = await defaultOpenAIRequest(prompt, {
            role: "system",
            temperature: 0.2,
            maxTokens: 10,
        });

        if (!response) {
            logger.warn(`[LANGUAGE-DETECTION] No response, assuming English`);
            return null;
        }

        const lang = response.trim().toLowerCase();

        if (lang === "english") {
            logger.info(`[LANGUAGE-DETECTION] Language: English`);
            return null; // No special handling needed
        }

        logger.info(`[LANGUAGE-DETECTION] Non-English detected: ${lang}`);
        return lang;
    } catch (error: any) {
        logger.error(`[LANGUAGE-DETECTION] error: ${error?.message || error}`);
        return null; // Default to English if detection fails
    }
}

import { defaultOpenAIRequest } from "./ai-request.util";
import logger from "../logger";

/**
 * Detects if user mentions multiple artists and the intent (OR vs AND)
 * Examples:
 * - "blackpink or twice" → OR (wants either)
 * - "bts and blackpink collab" → AND (wants collaboration)
 *
 * @param userInput - The user's message
 * @param availableArtists - List of artist names in the database
 * @returns Object with artists array and intent ('or' | 'and' | null)
 */
export async function detectMultipleArtists(
  userInput: string,
  availableArtists: string[],
): Promise<{ artists: string[]; intent: "or" | "and" | null }> {
  try {
    logger.info(`[MULTI-ARTIST-DETECTION] Analyzing: "${userInput}"`);

    const artistList = availableArtists.join(", ");

    const prompt = `
You are a multi-artist detector.

Artist name mappings (including variations):
BLACKPINK → bp_tiktok: "blackpink", "black pink", "bp", "b.p."
BTS → bts_official_bighit: "bts", "bangtan", "bangtan boys"
TWICE → twice_tiktok_official: "twice", "2wice"
COHEED → coheedandcambriaofficial: "coheed", "coheed and cambria", "c&c"

Available artists: ${artistList}

User message: "${userInput}"

Detect if user mentions multiple artists and their intent:

OR intent (wants ANY of the artists):
- "blackpink or twice"
- "show me bp or bts"
- "either blackpink or twice"

AND intent (wants collaboration/both together):
- "blackpink and bts collab"
- "bts and blackpink together"
- "do you have bp x twice"

SINGLE artist or NONE:
- "blackpink video" → single artist
- "I'm sad" → no artists

IMPORTANT: Return ONLY raw JSON, no markdown, no code blocks, no explanations.

Return ONLY valid JSON:
                {
                    "artists": ["bp_tiktok", "bts_official_bighit"],
                    "intent": "or"
                }

OR for single / none:
            {
                "artists": [],
                    "intent": null
            }

        Response: `;

    const response = await defaultOpenAIRequest(prompt, {
      role: "system",
      temperature: 0.3,
      maxTokens: 100,
    });

    if (!response) {
      logger.warn(`[MULTI - ARTIST - DETECTION] No response from AI`);
      return { artists: [], intent: null };
    }

    // Strip markdown code blocks if present
    let cleanedResponse = response.trim();
    if (cleanedResponse.includes("```")) {
      cleanedResponse = cleanedResponse
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
    }

    const parsed = JSON.parse(cleanedResponse);

    logger.info(
      `[MULTI-ARTIST-DETECTION] Result: ${parsed.artists.length} artists, intent: ${parsed.intent}`,
    );

    return {
      artists: parsed.artists || [],
      intent: parsed.intent || null,
    };
  } catch (error: any) {
    logger.error(`[MULTI-ARTIST-DETECTION] error: ${error?.message || error}`);
    return { artists: [], intent: null };
  }
}

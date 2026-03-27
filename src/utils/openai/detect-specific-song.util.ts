import { defaultOpenAIRequest } from "./ai-request.util";
import logger from "../logger";

/**
 * Detects if user is requesting a specific song/video by title
 * Examples: "play butter", "smooth like butter", "I want dynamite"
 *
 * @param userInput - The user's message
 * @returns Object with songTitle and artist if detected
 */
export async function detectSpecificSong(
  userInput: string,
): Promise<{ songTitle: string | null; artist: string | null }> {
  try {
    logger.info(`[SONG-DETECTION] Analyzing: "${userInput}"`);

    const prompt = `
You are a song title detector. Extract specific song names or video titles from user messages.

User message: "${userInput}"

Detect if user mentions a specific song/video title:
- "play butter" → butter
- "smooth like butter baby" → butter
- "I want dynamite" → dynamite
- "show me black swan by bts" → black swan, bts
- "play on by bts" → on, bts
- "give me something hype" → not specific (no title)

IMPORTANT: Return ONLY raw JSON, no markdown, no code blocks, no explanations.

Return ONLY valid JSON:
{
  "songTitle": "butter",
  "artist": "bts"
}

OR if no specific song:
{
  "songTitle": null,
  "artist": null
}

Response:`;

    const response = await defaultOpenAIRequest(prompt, {
      role: "system",
      temperature: 0.3,
      maxTokens: 50,
    });

    if (!response) {
      logger.warn(`[SONG - DETECTION] No response from AI`);
      return { songTitle: null, artist: null };
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

    if (parsed.songTitle) {
      logger.info(
        `[SONG-DETECTION] Specific song detected: "${parsed.songTitle}"${parsed.artist ? ` by ${parsed.artist}` : ""}`,
      );
    } else {
      logger.info(`[SONG-DETECTION] No specific song mentioned`);
    }

    return {
      songTitle: parsed.songTitle || null,
      artist: parsed.artist || null,
    };
  } catch (error: any) {
    logger.error(`[SONG-DETECTION] error: ${error?.message || error}`);
    return { songTitle: null, artist: null };
  }
}

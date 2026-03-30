import { defaultOpenAIRequest } from "./ai-request.util";
import logger from "../logger";

export interface VideoIntentResult {
  wantsVideo: boolean;
  query: string;
}

/**
 * Uses AI to determine if the user is requesting a video recommendation,
 * and extracts a clean, short search query suitable for YouTube.
 *
 * @param userInput - The user's message
 * @returns VideoIntentResult - wantsVideo flag + extracted search query
 */
export async function detectVideoIntent(userInput: string): Promise<VideoIntentResult> {
  try {
    logger.info(
      `[VIDEO-INTENT-DETECTION] Analyzing user input: "${userInput}"`,
    );

    const prompt = `You are a video intent classifier. Analyze the user message and respond with JSON only.

User message: "${userInput}"

IMPORTANT: Handle multiple languages (English, German, Tagalog, Taglish, Korean, etc.)
- German: "gib mir", "zeig mir", "ich will" = requesting
- Tagalog: "pakiplay", "gusto ko", "pahinge" = requesting
- Taglish: "pa-play naman", "gusto ko ng video" = requesting

Set "wantsVideo" to true if the user is requesting ANY of these:
✅ Explicit video request: "send me a video", "show me a video", "play a video", "give me a video"
✅ Music/song request: "play a song", "I need music", "send me music", "show me a track"
✅ Follow-up request: "another one", "one more", "more please", "next", "different one"
✅ Continuation: "do you have more?", "show me something else", "give me another"
✅ Artist-specific: "play blackpink", "send me BTS", "I want twice"
✅ Mood-based: "something happy", "give me hype music", "play something chill"
✅ Specific song: "play butter by bts", "smooth like butter", "I want dynamite"

Set "wantsVideo" to false ONLY if:
❌ Just chatting: "how are you?", "tell me about...", "what do you think?"
❌ Informational: "what's your favorite song?", "do you like music?"
❌ No content request: "I'm feeling sad", "I'm happy now" (without requesting anything)
❌ FALSE POSITIVES - word "video" in other context:
  - "video game": "I feel like I'm in a video game", "playing video games", "video game music"
  - "video call": "on a video call", "video chat", "video conference"
  - "video editing": "editing videos", "making a video"
  - Unless they explicitly ask for content AFTER mentioning these

For "query": extract a short 2-5 word YouTube search query that captures the core intent.
- "I've been feeling down lately, give me something chill" → "chill music"
- "play butter by bts" → "Butter BTS"
- "I want hype music for the gym" → "hype gym music"
- "another one" or "one more" → "" (empty, no specific query)
- If wantsVideo is false, set query to ""

Respond with ONLY valid JSON, no extra text:
{"wantsVideo": true, "query": "extracted query here"}`;

    const response = await defaultOpenAIRequest(prompt, {
      role: "system",
      temperature: 0.3,
      maxTokens: 50,
    });

    if (!response) {
      logger.warn(
        `[VIDEO-INTENT-DETECTION] AI returned no response, defaulting to false`,
      );
      return { wantsVideo: false, query: "" };
    }

    try {
      const parsed = JSON.parse(response.trim());
      const wantsVideo = parsed.wantsVideo === true;
      const query = typeof parsed.query === "string" ? parsed.query.trim() : "";

      logger.info(
        `[VIDEO-INTENT-DETECTION] wantsVideo: ${wantsVideo}, query: "${query}"`,
      );

      return { wantsVideo, query };
    } catch {
      // AI didn't return valid JSON — fall back to treating response as boolean string
      const wantsVideo = response.trim().toLowerCase() === "true";
      logger.warn(
        `[VIDEO-INTENT-DETECTION] Could not parse JSON response, fell back to boolean: ${wantsVideo}`,
      );
      return { wantsVideo, query: "" };
    }
  } catch (error: any) {
    logger.error(`[VIDEO-INTENT-DETECTION] error: ${error?.message || error}`);
    // Fallback to regex if AI fails
    const regexMatch =
      /\b(video|song|music|track|play|send|show|give|another|more|next|one more)\b/i.test(
        userInput || "",
      );
    logger.warn(
      `[VIDEO-INTENT-DETECTION] Using regex fallback, result: ${regexMatch}`,
    );
    return { wantsVideo: regexMatch, query: "" };
  }
}

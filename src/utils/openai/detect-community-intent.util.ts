import { defaultOpenAIRequest } from "./ai-request.util";
import logger from "../logger";

export interface CommunityIntentResult {
  wantsCommunity: boolean;
  query: string;
}

/**
 * Uses AI to determine if the user is requesting a community recommendation,
 * and extracts a clean search query to match against community names/keywords.
 *
 * @param userInput - The user's message
 * @returns CommunityIntentResult - wantsCommunity flag + extracted search query
 */
export async function detectCommunityIntent(
  userInput: string,
): Promise<CommunityIntentResult> {
  try {
    logger.info(
      `[COMMUNITY-INTENT-DETECTION] Analyzing user input: "${userInput}"`,
    );

    const prompt = `You are a community intent classifier for a K-pop fandom app. Analyze the user message and respond with JSON only.

User message: "${userInput}"

IMPORTANT: Handle multiple languages (English, German, Tagalog, Taglish, Korean, etc.)
- German: "gibt es eine Gruppe", "zeig mir eine Community" = requesting
- Tagalog: "may grupo ba", "saan ako pwede sumali" = requesting
- Taglish: "may community ba dito", "gusto ko sumali" = requesting

Set "wantsCommunity" to true if the user is asking ANY of these:
✅ Explicit community request: "recommend a community", "any group I can join", "suggest a room"
✅ Looking to connect: "where can I find fans of...", "is there a group for..."
✅ Belonging/joining: "I want to join", "where do fans hang out", "community for..."
✅ Fandom-specific: "BTS fan community", "where are BLACKPINK fans", "room for twice fans"
✅ General: "any active rooms?", "what communities are here?", "show me groups"

Set "wantsCommunity" to false if:
❌ Just chatting or asking questions: "tell me about BTS", "what's K-pop?"
❌ Asking about music/videos: "play a song", "show me a video"
❌ Informational only: "who is the leader of BTS?"
❌ No joining intent: "I love this community" (stating, not requesting)

For "query": extract a 1-3 word keyword that captures the topic they want a community for.
This is a K-pop fandom app — focus on artist names, genres, or fandom terms.
- "recommend a BTS community" → "BTS"
- "is there a room for BLACKPINK fans?" → "BLACKPINK"
- "any active communities I can join?" → "" (empty, no specific topic)
- "where can I find K-pop fans?" → "kpop"
- If wantsCommunity is false, set query to ""

Respond with ONLY valid JSON, no extra text:
{"wantsCommunity": true, "query": "extracted keyword here"}`;

    const response = await defaultOpenAIRequest(prompt, {
      role: "system",
      temperature: 0.3,
      maxTokens: 50,
    });

    if (!response) {
      logger.warn(
        `[COMMUNITY-INTENT-DETECTION] AI returned no response, defaulting to false`,
      );
      return { wantsCommunity: false, query: "" };
    }

    try {
      const parsed = JSON.parse(response.trim());
      const wantsCommunity = parsed.wantsCommunity === true;
      const query = typeof parsed.query === "string" ? parsed.query.trim() : "";

      logger.info(
        `[COMMUNITY-INTENT-DETECTION] wantsCommunity: ${wantsCommunity}, query: "${query}"`,
      );

      return { wantsCommunity, query };
    } catch {
      const wantsCommunity = response.trim().toLowerCase() === "true";
      logger.warn(
        `[COMMUNITY-INTENT-DETECTION] Could not parse JSON response, fell back to boolean: ${wantsCommunity}`,
      );
      return { wantsCommunity, query: "" };
    }
  } catch (error: any) {
    logger.error(
      `[COMMUNITY-INTENT-DETECTION] error: ${error?.message || error}`,
    );
    // Regex fallback if AI fails
    const regexMatch =
      /\b(community|communities|group|room|join|fans|fandom|recommend|suggest|where can i)\b/i.test(
        userInput || "",
      );
    logger.warn(
      `[COMMUNITY-INTENT-DETECTION] Using regex fallback, result: ${regexMatch}`,
    );
    return { wantsCommunity: regexMatch, query: "" };
  }
}

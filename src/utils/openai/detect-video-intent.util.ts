import { defaultOpenAIRequest } from "./ai-request.util";
import logger from "../logger";

/**
 * Uses AI to determine if the user is requesting a video recommendation
 * More accurate than regex pattern matching
 * 
 * @param userInput - The user's message
 * @returns boolean - true if user wants a video, false otherwise
 */
export async function detectVideoIntent(userInput: string): Promise<boolean> {
    try {
        logger.info(`[VIDEO-INTENT-DETECTION] Analyzing user input: "${userInput}"`);

        const prompt = `You are a video intent classifier. Determine if the user is requesting video/music content.

User message: "${userInput}"

IMPORTANT: Handle multiple languages (English, German, Tagalog, Taglish, Korean, etc.)
- German: "gib mir", "zeig mir", "ich will" = requesting
- Tagalog: "pakiplay", "gusto ko", "pahinge" = requesting
- Taglish: "pa-play naman", "gusto ko ng video" = requesting

Return "true" if the user is requesting ANY of these:
✅ Explicit video request: "send me a video", "show me a video", "play a video", "give me a video"
✅ Music/song request: "play a song", "I need music", "send me music", "show me a track"
✅ Follow-up request: "another one", "one more", "more please", "next", "different one"
✅ Continuation: "do you have more?", "show me something else", "give me another"
✅ Artist-specific: "play blackpink", "send me BTS", "I want twice"
✅ Mood-based: "something happy", "give me hype music", "play something chill"
✅ Specific song: "play butter by bts", "smooth like butter", "I want dynamite"

Return "false" ONLY if:
❌ Just chatting: "how are you?", "tell me about...", "what do you think?"
❌ Informational: "what's your favorite song?", "do you like music?"
❌ No content request: "I'm feeling sad", "I'm happy now" (without requesting anything)
❌ FALSE POSITIVES - word "video" in other context:
  - "video game": "I feel like I'm in a video game", "playing video games", "video game music"
  - "video call": "on a video call", "video chat", "video conference"
  - "video editing": "editing videos", "making a video"
  - Unless they explicitly ask for content AFTER mentioning these

IMPORTANT: 
- "another one" = true (requesting more content)
- "one more" = true (requesting more content)
- "do you have more?" = true (requesting more content)
- "I'm sad" alone = false (just expressing emotion)
- "I'm sad, give me something" = true (requesting content)
- "I feel like I'm in a video game" = false (talking about games, not requesting video)
- "playing video games and want music" = true (requesting music)

Response (true/false):`;

        const response = await defaultOpenAIRequest(prompt, {
            role: "system",
            temperature: 0.3,
            maxTokens: 10
        });

        if (!response) {
            logger.warn(`[VIDEO-INTENT-DETECTION] AI returned no response, defaulting to false`);
            return false;
        }

        const normalized = response.trim().toLowerCase();
        const wantsVideo = normalized === "true";

        logger.info(`[VIDEO-INTENT-DETECTION] AI response: "${response}" → Intent detected: ${wantsVideo}`);

        return wantsVideo;
    } catch (error: any) {
        logger.error(`[VIDEO-INTENT-DETECTION] error: ${error?.message || error}`);
        // Fallback to regex if AI fails
        const regexMatch = /\b(video|song|music|track|play|send|show|give|another|more|next|one more)\b/i.test(userInput || "");
        logger.warn(`[VIDEO-INTENT-DETECTION] Using regex fallback, result: ${regexMatch}`);
        return regexMatch;
    }
}

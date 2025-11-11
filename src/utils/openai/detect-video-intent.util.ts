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

        const prompt = `You are a video intent classifier. Analyze if the user is asking for a video recommendation.

User message: "${userInput}"

Return ONLY "true" if the user is asking for a video (e.g., "send me a video", "show me a video", "play a video", "I want to watch a video", "give me a video").
Return ONLY "false" if they are NOT asking for a video.

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
        const regexMatch = /\bvideo\b|\bsend me a video\b|\bplay (me )?a video\b|\bshow me a video\b/i.test(userInput || "");
        logger.warn(`[VIDEO-INTENT-DETECTION] Using regex fallback, result: ${regexMatch}`);
        return regexMatch;
    }
}

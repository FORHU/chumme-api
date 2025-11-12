import { defaultOpenAIRequest } from "../openai/ai-request.util";
import logger from "../logger";

/**
 * Maps AI-detected emotion to the closest matching emotion in the database.
 * Handles cases where OpenAI returns emotions not in our DB schema.
 * 
 * Examples:
 * - "melancholic" → "sad"
 * - "frustrated" → "angry"
 * - "joyful" → "happy"
 * - "stressed" → "anxious"
 * 
 * @param detectedEmotion - Emotion returned by AI emotion detection
 * @param availableEmotions - List of valid emotions from database
 * @returns Mapped emotion from DB, or "neutral" if no good match
 */
export async function mapEmotionToDatabase(
    detectedEmotion: string,
    availableEmotions: string[]
): Promise<{ mappedEmotion: string; wasMapping: boolean; originalEmotion: string }> {
    try {
        // Normalize for comparison
        const normalizedDetected = detectedEmotion.toLowerCase().trim();
        const normalizedAvailable = availableEmotions.map(e => e.toLowerCase());

        // Check if emotion already exists in DB (exact match)
        if (normalizedAvailable.includes(normalizedDetected)) {
            logger.info(`[EMOTION-MAPPING] Exact match found: "${detectedEmotion}"`);
            return {
                mappedEmotion: detectedEmotion,
                wasMapping: false,
                originalEmotion: detectedEmotion
            };
        }

        // No exact match - use AI to find closest semantic match
        logger.info(`[EMOTION-MAPPING] No exact match for "${detectedEmotion}", finding closest match...`);

        const prompt = `
You are an emotion mapping expert. Map the detected emotion to the SINGLE closest emotion from the database.

Detected emotion: "${detectedEmotion}"

Available emotions in database: ${availableEmotions.join(", ")}

MAPPING RULES:
- Find the closest semantic match
- Consider synonyms and related emotions
- Examples:
  * "melancholic" → "sad"
  * "frustrated" → "angry"
  * "joyful" → "happy"
  * "stressed" → "anxious"
  * "chill" → "peaceful"
  * "pumped" → "excited"
  * "tired" → "slow"
  * "energized" → "energetic"
  * "calm" → "peaceful"
  * "cheerful" → "happy"

Output ONLY the single emotion name from the available list (e.g., "sad").
If no good match exists, output "neutral".
`;

        const start = Date.now();
        const result = await defaultOpenAIRequest(prompt, {
            role: "system",
            temperature: 0.2, // Low temperature for consistent mapping
            maxTokens: 20
        });
        const duration = Date.now() - start;

        if (!result) {
            throw new Error("Empty response from AI");
        }

        const mappedEmotion = result.trim().toLowerCase();

        logger.chat_response(`[EMOTION-MAPPING] Response time: ${duration}ms`);

        // Validate the mapped emotion exists in DB
        if (!normalizedAvailable.includes(mappedEmotion)) {
            logger.warn(`[EMOTION-MAPPING] AI returned invalid emotion "${mappedEmotion}", defaulting to "neutral"`);
            return {
                mappedEmotion: "neutral",
                wasMapping: true,
                originalEmotion: detectedEmotion
            };
        }

        logger.info(`[EMOTION-MAPPING] Successfully mapped "${detectedEmotion}" → "${mappedEmotion}"`);

        return {
            mappedEmotion,
            wasMapping: true,
            originalEmotion: detectedEmotion
        };

    } catch (error: any) {
        logger.error(`[EMOTION-MAPPING] Error: ${error?.message || error}`);
        // Safe fallback
        return {
            mappedEmotion: "neutral",
            wasMapping: true,
            originalEmotion: detectedEmotion
        };
    }
}

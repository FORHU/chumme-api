import { defaultOpenAIRequest } from "../openai/ai-request.util";
import logger from "../logger";

/**
 * Determines which emotion tags to search for based on user's emotional state.
 * Uses AI to intelligently map user emotions to multiple video emotion tags.
 *
 * Strategies:
 * - BALANCE: Counter negative emotions with uplifting/soothing content
 * - AMPLIFY: Enhance positive emotions with matching energy
 * - ENERGIZE: Boost low-energy states with high-energy content
 * - VALIDATE: Honor explicit requests for specific emotions
 *
 * @param userEmotion - Detected emotion from sentiment analysis
 * @param confidence - Confidence score (0-1)
 * @param availableEmotions - All emotion tags from database
 * @param userContext - Optional full user message for context
 * @returns Primary emotions to search, fallback emotions, and strategy used
 */
export async function determineVideoEmotions(
  userEmotion: string,
  confidence: number,
  availableEmotions: string[],
  userContext?: string,
): Promise<{
  primaryEmotions: string[];
  fallbackEmotions: string[];
  strategy: string;
}> {
  try {
    logger.info(
      `[EMOTION-DETERMINATION] Analyzing user emotion: ${userEmotion} (confidence: ${confidence})`,
    );

    const prompt = `
You are a music recommendation AI. Based on user's emotional state, recommend which emotion tags to search for in our video database.

Available emotion tags in database: ${availableEmotions.join(", ")}

User's current emotional state: "${userEmotion}" (detection confidence: ${confidence})
${userContext ? `User's full message: "${userContext}"` : ""}

RECOMMENDATION GUIDELINES:

1. NEGATIVE EMOTIONS (sad, angry, anxious, frustrated, depressed):
   - DEFAULT: Recommend uplifting/soothing tags → peaceful, acoustic, contemplative, content, neutral
   - EXCEPTION: If user explicitly wants to "feel it" (e.g., "I want to cry", "give me sad music"), use sad, slow, contemplative
   - Goal: Help shift mood to better state, unless catharsis is requested

2. POSITIVE EMOTIONS (happy, excited, joyful, energetic):
   - Recommend matching energy → happy, upbeat, energetic, danceable, excited
   - Goal: Amplify and maintain positive state

3. LOW ENERGY (tired, bored, lonely, unmotivated):
   - DEFAULT: Energize → energetic, upbeat, danceable, excited
   - ALTERNATIVE: If user wants to relax/sleep → peaceful, acoustic, slow, content
   - Consider time context if mentioned

4. NEUTRAL/CALM states:
   - Recommend balanced tags → content, peaceful, neutral, acoustic

5. EXPLICIT REQUESTS override detected emotion:
   - If user says "sad song", "angry music" → honor with sad, angry, contemplative
   - If user says "chill", "relax" → peaceful, acoustic, slow, content
   - If user says "hype", "pump up" → energetic, upbeat, danceable, excited

6. CONFLICTING EMOTIONS (detected emotion vs requested emotion):
   - "I'm super happy! Give me a sad Blackpink video" → User wants SAD video despite being happy
   - "I'm angry but give me chill music" → User wants CHILL despite being angry
   - RULE: ALWAYS honor the explicit request over detected emotion
   - Strategy = "validate" (validating user's explicit choice)

IMPORTANT RULES:
- Return 2-4 emotions total (2 primary, 2 fallback)
- Only use emotions from the available list
- Order by priority (best matches first)
- Consider confidence level (lower confidence = safer middle-ground emotions)

Return ONLY valid JSON (no markdown, no explanations):
{
  "primary": ["emotion1", "emotion2"],
  "fallback": ["emotion3", "emotion4"],
  "strategy": "balance|amplify|energize|validate"
}

Examples:
- User sad, wants help → {"primary": ["peaceful", "acoustic"], "fallback": ["content", "neutral"], "strategy": "balance"}
- User happy → {"primary": ["happy", "upbeat"], "fallback": ["energetic", "danceable"], "strategy": "amplify"}
- User "give me sad music" → {"primary": ["sad", "contemplative"], "fallback": ["acoustic", "slow"], "strategy": "validate"}
- User bored → {"primary": ["energetic", "upbeat"], "fallback": ["danceable", "excited"], "strategy": "energize"}
- User happy but asks for sad → {"primary": ["sad", "contemplative"], "fallback": ["acoustic", "slow"], "strategy": "validate"}
- User angry but asks for chill → {"primary": ["peaceful", "acoustic"], "fallback": ["content", "neutral"], "strategy": "validate"}
`;

    const start = Date.now();
    const result = await defaultOpenAIRequest(prompt, {
      role: "system",
      temperature: 0.3,
      maxTokens: 150,
    });
    const duration = Date.now() - start;

    logger.chat_response(
      `[EMOTION-DETERMINATION] Response time: ${duration}ms`,
    );

    if (!result) {
      throw new Error("Empty response from AI");
    }

    // Strip markdown code blocks if present
    let cleanedResult = result.trim();
    if (cleanedResult.includes("```")) {
      cleanedResult = cleanedResult
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
    }

    // Parse AI response
    const parsed = JSON.parse(cleanedResult);

    // Validate emotions exist in database
    const validPrimary = (parsed.primary || []).filter((e: string) =>
      availableEmotions.map((ae) => ae.toLowerCase()).includes(e.toLowerCase()),
    );

    const validFallback = (parsed.fallback || []).filter((e: string) =>
      availableEmotions.map((ae) => ae.toLowerCase()).includes(e.toLowerCase()),
    );

    // Ensure we have at least some emotions
    if (validPrimary.length === 0) {
      logger.warn(
        `[EMOTION-DETERMINATION] No valid primary emotions, using defaults`,
      );
      return {
        primaryEmotions: ["happy", "content"],
        fallbackEmotions: ["neutral", "peaceful"],
        strategy: "default_fallback",
      };
    }

    logger.info(
      `[EMOTION-DETERMINATION] Strategy: ${parsed.strategy}, Primary: [${validPrimary.join(", ")}], Fallback: [${validFallback.join(", ")}]`,
    );

    return {
      primaryEmotions: validPrimary,
      fallbackEmotions: validFallback,
      strategy: parsed.strategy || "unknown",
    };
  } catch (error: any) {
    logger.error(`[EMOTION-DETERMINATION] Error: ${error?.message || error}`);
    // Safe fallback on error
    return {
      primaryEmotions: ["happy", "content"],
      fallbackEmotions: ["neutral"],
      strategy: "error_fallback",
    };
  }
}

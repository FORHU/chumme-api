import logger from "../logger";

/**
 * Detects if user message indicates a mental health crisis or self-harm risk.
 *
 * Crisis indicators:
 * - Suicidal ideation keywords
 * - Self-harm expressions
 * - Severe hopelessness
 * - Direct threats to safety
 *
 * @param emotion - Detected emotion from sentiment analysis
 * @param message - Full user message text
 * @param confidence - Emotion detection confidence (higher = more reliable)
 * @returns Boolean indicating if this is a crisis situation
 */
export function detectCrisis(
  emotion: string,
  message: string,
  confidence: number,
): boolean {
  try {
    logger.info(`[CRISIS-DETECTION] Checking message for crisis indicators`);

    const lowerEmotion = emotion.toLowerCase();
    const lowerMessage = message.toLowerCase();

    // Crisis-related emotions (with high confidence)
    const crisisEmotions = ["suicidal", "hopeless", "worthless", "desperate"];

    // Direct self-harm keywords - most critical
    const criticalKeywords = [
      "kill myself",
      "end my life",
      "want to die",
      "suicide",
      "suicidal",
      "unalive",
      "end it all",
      "no reason to live",
      "better off dead",
      "harm myself",
      "hurt myself",
      "self harm",
      "cut myself",
      "overdose",
    ];

    // Severe distress keywords - requires attention
    const severeKeywords = [
      "can't go on",
      "no point",
      "give up",
      "nothing left",
      "can't take it",
      "too much pain",
      "unbearable",
    ];

    // Check for critical keywords (immediate crisis)
    const hasCriticalKeyword = criticalKeywords.some((keyword) =>
      lowerMessage.includes(keyword),
    );

    if (hasCriticalKeyword) {
      logger.warn(
        `[CRISIS-DETECTION] ⚠️ CRITICAL: Crisis keyword detected in message`,
      );
      return true;
    }

    // Check for crisis emotion + severe keyword combination
    const hasCrisisEmotion = crisisEmotions.some((e) =>
      lowerEmotion.includes(e),
    );
    const hasSevereKeyword = severeKeywords.some((keyword) =>
      lowerMessage.includes(keyword),
    );

    if (hasCrisisEmotion && hasSevereKeyword && confidence > 0.7) {
      logger.warn(
        `[CRISIS-DETECTION] ⚠️ Crisis emotion + severe distress detected`,
      );
      return true;
    }

    logger.info(`[CRISIS-DETECTION] No crisis indicators detected`);
    return false;
  } catch (error: any) {
    logger.error(`[CRISIS-DETECTION] Error: ${error?.message || error}`);
    // On error, err on the side of caution - don't flag as crisis
    return false;
  }
}

/**
 * Generates a crisis response message with appropriate resources
 * @param locale - User's locale for localized resources (default: US)
 * @returns Crisis support message with helpline numbers
 */
export function generateCrisisResponse(locale: string = "US"): string {
  // Localized crisis resources
  const resources: Record<string, { message: string; helplines: string[] }> = {
    US: {
      message:
        "I'm really concerned about what you've shared. Please know that you're not alone, and there are people who want to help.",
      helplines: [
        "🆘 **National Suicide Prevention Lifeline**: 988 (call or text)",
        "📱 **Crisis Text Line**: Text HOME to 741741",
        "🌐 **Online Chat**: suicidepreventionlifeline.org/chat",
        "📞 **International**: findahelpline.com",
      ],
    },
    // Can add more locales as needed
  };

  const resource = resources[locale] || resources.US;

  return `${resource.message}

${resource.helplines.join("\n")}

If you're in immediate danger, please call emergency services (911) or go to your nearest emergency room.

I'm here to listen and support you, but I'm not a substitute for professional help. Would you like to talk about what's going on?`;
}

import logger from "../logger";
import { defaultOpenAIRequest } from "./ai-request.util";

export async function detectEmotion(inputText: string) {
    const prompt = `You are an emotion analysis engine. Analyze the following text and return a JSON object with two fields: 
            "emotion" (one word like happy, sad, angry, excited, lonely, nostalgic, calm, anxious, proud, grateful)
            and "confidence" (a number between 0 and 1, 0.5 being neutral).

            MULTIPLE EMOTIONS: If user expresses multiple emotions (e.g., "I'm happy but anxious"), choose the DOMINANT or PRIMARY emotion.
            - "happy but anxious about tomorrow" → anxious (future concern is primary)
            - "sad but excited for the weekend" → sad (current state is primary)
            - "angry and frustrated" → angry (strongest emotion)

            Important: Recognize emotion synonyms and variations:
            - Happy: joyful, joy, glad, cheerful, delighted, pleased, content, satisfied, upbeat
            - Sad: unhappy, sorrowful, down, depressed, blue, melancholic, gloomy, heartbroken
            - Angry: mad, furious, irritated, annoyed, frustrated, enraged, upset, pissed
            - Excited: thrilled, pumped, hyped, stoked, energized, enthusiastic, eager
            - Calm: peaceful, relaxed, chill, tranquil, serene, mellow, composed
            - Anxious: nervous, worried, stressed, uneasy, tense, concerned, on edge
            - Tired: exhausted, drained, sleepy, fatigued, worn out, weary
            - Lonely: alone, isolated, abandoned, disconnected, left out
            - Grateful: thankful, appreciative, blessed
            - Proud: accomplished, confident, satisfied with achievement

            Also recognize mood descriptors:
            - "hype", "lit", "vibing", "pumped up" → excited/happy
            - "chill", "mellow", "relaxed" → calm/peaceful
            - "down", "blue", "bummed" → sad
            - "stressed out", "overwhelmed" → anxious

            Time-based context signals:
            - "can't sleep", "insomnia", "late night" → calm/peaceful (need calming content)
            - "morning", "waking up", "starting my day" → energetic/happy (need upbeat content)
            - "end of day", "tired from work" → calm/peaceful
            - "before exam", "big presentation" → anxious

            EMOJI recognition (use emojis to detect emotion):
            - 😭😢😿💔😞😔 → sad
            - 😊😁😄😃😀🤗🥰😍 → happy
            - 😡😠🤬💢 → angry
            - 😰😨😱😟😧 → anxious/scared
            - 🎉🎊🥳🙌💃🕺 → excited/happy
            - 😴😪🥱 → tired/calm
            - 🤔💭 → contemplative/neutral
            - Multiple sad emojis (😭😭😭) = very sad, high confidence

            SPECIAL RULE:
            Do NOT classify the emotion as "neutral" when the user is sharing important personal information such as:
            - their birthday
            - anniversary
            - special dates
            - major life events (e.g., graduation, job change)
            These typically carry emotional significance (often happy, nostalgic, grateful, or excited). Infer the most likely associated emotion instead of neutral.

            Text: "${inputText}"
            
            IMPORTANT: Return ONLY the JSON object, no markdown formatting, no code blocks, no explanations.
            Output format example:
            {"emotion": "happy", "confidence": 0.94}`;

    try {
        const start = Date.now()
        const res = await defaultOpenAIRequest(prompt, { role: "user", temperature: 0.0 });

        // Strip markdown code blocks if present (```json ... ```)
        let cleanedRes = res || "{}";
        if (cleanedRes.includes("```")) {
            cleanedRes = cleanedRes.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        }

        let parsed;
        try {
            parsed = JSON.parse(cleanedRes);
        } catch (parseError) {
            logger.chat_error("[OPENAI-DetectEmotion], JSON parse error. Raw response:", res);
            throw new Error("[detectEmotion utils], Failed to parse JSON response");
        }

        if (!parsed.emotion || typeof parsed.confidence !== "number") {
            logger.chat_error("[OPENAI-DetectEmotion], Invalid response structure from AI")
            throw new Error("[detectEmotion utils], Invalid response structure from AI");
        } else {
            const duration = Date.now() - start
            logger.chat_response(`[OPENAI-DetectEmotion], response time: ${duration} `)
            return parsed; // { emotion: string, confidence: number}
        }
    } catch (error) {
        logger.chat_error(`[OPENAI-DetectEmotion], Error:`, error)
        throw new Error("Failed to Detect Emotion response");
    }
}

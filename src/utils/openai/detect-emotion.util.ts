import logger from "../logger";
import { defaultOpenAIRequest } from "./ai-request.util";

export async function detectEmotion(inputText: string) {
       const prompt = `You are an emotion analysis engine. Analyze the following text and return a JSON object with two fields: 
            "emotion" (one word like happy, sad, angry, excited, lonely, nostalgic, calm, anxious, proud, grateful)
            and "confidence" (a number between 0 and 1, 0.5 being neutral).

            Text: "${inputText}"
            Output format example:
            {"emotion": "happy", "confidence": 0.94}`;

        try {
            const start = Date.now()
             const res = await defaultOpenAIRequest(prompt, {role: "user", temperature: 0.0 });
            const parsed = JSON.parse(res || "{emotion: null, confidence: null}") ;
            if(!parsed.emotion || typeof parsed.confidence !== "number"){
                logger.chat_error("[OPENAI-DetectEmotion], Invalid response structure from AI")
                throw new Error("[detectEmotion utils], Invalid response structure from AI");
            } else {
                const duration = Date.now() - start
                logger.chat_response(`[OPENAI-DetectEmotion], response time: ${duration} `)
                return parsed; // { emotion: string, confidence: number}
            }
        } catch (error) {
            console.error("Error in detect-emotion.utils:", error);
            logger.chat_error(`[OPENAI-DetectEmotion], response time: "Error in detect-emotion.utils:"`, error)
            throw  new Error("Failed to Detect Emotion response");
        }

}

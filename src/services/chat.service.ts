import { defaultOpenAIRequest } from "../utils/openai/ai-request.util";
import { composePrompt } from "../utils/openai/compose-prompt.util";
import { detectEmotion } from "../utils/openai/detect-emotion.util";


export default class ChatSvc {
    static async sendChat(inputText: string){
        try {

            const emotionResult = await detectEmotion(inputText);
            const emotion = emotionResult.emotion
            const confidence = emotionResult.confidence;

            const prompt = composePrompt(inputText, emotion, confidence);

            const res = await defaultOpenAIRequest(prompt, {role: "user", temperature: 0.7, maxTokens: 800});
            if(!res || typeof res !== "string"){
                throw new Error("[OpenAISvc.getAIResponse], Invalid response from AI, expecting a string");
            }
          return { message: res, emotion_data: emotionResult };
        } catch (error) {
            console.error("Error in OpenAISvc.getAIResponse:", error);
            throw  new Error("Failed to get AI response");
        }
    }

} 
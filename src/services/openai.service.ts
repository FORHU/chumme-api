import { composePrompt } from "../utils/openai/compose-prompt.util";
import { detectEmotion } from "../utils/openai/detect-emotion.util";

export default class OpenAISvc {
    static async getAIResponse(inputText: string){
        try {
            const prompt = composePrompt(inputText);

        //     const response = await openai.chat.completions.create({
        //     model: "gpt-4o-mini", // or gpt-4o / gpt-3.5-turbo
        //     messages: [{ role: "user", content: prompt }],
        // });
            const response: any = await Promise.resolve(null) // temporary placeholder
            const message = response?.choices?.[0].message.content || ""

            const emotion = detectEmotion(message);

            return { message, emotion}


        } catch (error) {
            console.error("Error in OpenAISvc.getAIResponse:", error);
            throw  new Error("Failed to get AI response");
        }
    }
} 
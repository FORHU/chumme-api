import { defaultOpenAIRequest } from "../utils/openai/ai-request.util";
import { composePrompt } from "../utils/openai/compose-prompt.util";
import { detectEmotion } from "../utils/openai/detect-emotion.util";
import ChatRepo from "../repositories/chat.repository";
import { Prisma } from "@prisma/client";


export default class ChatSvc {
    static async sendChat(inputText: string, userId: string){
        if(!inputText || !inputText.trim()){
            throw new Error("Input text cannot be empty");
        }
        if(!userId || !userId.trim()){
            throw new Error("User ID is required");
        }

        try {
            const emotionResult = await detectEmotion(inputText);
            const { emotion, confidence } = emotionResult || {};

            let chatMessage = null;
            let emotionMemory = null;

           if(emotion !== "neutral" && confidence > 0.5){
             chatMessage = await ChatRepo.createChatMessage({
                message: inputText,
                User: { connect: { id: userId}},
                role: "USER",
            });

            emotionMemory = await ChatRepo.createEmotionMemory({
                emotion,
                confidence,
                ChatMessage: {connect: { id: chatMessage.id}},
                User: { connect: { id: userId }},
            });
           }

            const prompt = composePrompt(inputText, emotion, confidence);

            const res = await defaultOpenAIRequest(prompt, {role: "user", temperature: 0.7, maxTokens: 800});
            if(!res || typeof res !== "string"){
                throw new Error("[ChatSvc.sendChat], Invalid response from AI, expecting a string");
            }
          return { message: res, emotion_data: emotionResult, chatMessageId: chatMessage?.id || null, emotionMemoryId: emotionMemory?.id || null };
        } catch (error: any) {
            console.error("Error in ChatSvc.sendChat:", error?.message || error);
            if(error instanceof Prisma.PrismaClientKnownRequestError){
                throw new Error(`Database error: ${error?.message}`);
            }
            throw  new Error("[ChatSvc.sendChat], Failed to get AI response");
        }
    }

    static async getChatMessageById(chatMessageId: string){
        if(!chatMessageId || !chatMessageId.trim()){
            throw new Error("Chat Message ID is required");
        }

        try {
            const chatMessage = await ChatRepo.getChatMessageById(chatMessageId);
            if(!chatMessage){
                throw new Error("Chat Message not found");
            }
            return chatMessage;
        } catch (error: any) {
            console.error("Error in ChatSvc.getChatMessageById:", error?.message || error);
            if(error instanceof Prisma.PrismaClientKnownRequestError){
                throw new Error(`Database error: ${error?.message}`);
            }
            throw  new Error("[ChatSvc.getChatMessageById], Failed to retrieve chat message");
        }
    }

} 
import { defaultOpenAIRequest } from "../utils/openai/ai-request.util";
import { composePrompt } from "../utils/openai/compose-prompt.util";
import { detectEmotion } from "../utils/openai/detect-emotion.util";
import ChatRepo, { TGetChatMessagesByUserIdOptions } from "../repositories/chat.repository";
import { Prisma, ChatRole } from "@prisma/client";
import { BadRequestError, InternalServerError, NotFoundError } from "../utils/error.util";
import logger from "../utils/logger";


export default class ChatSvc {
    static async sendChat(inputText: string, userId: string){
        if(!inputText || !inputText.trim()){
            throw new BadRequestError("Input text cannot be empty");
        }
        if(!userId || !userId.trim()){
            throw new BadRequestError("User ID is required");
        }

        try {
            const emotionResult = await detectEmotion(inputText);
            const { emotion, confidence } = emotionResult || {};

            let chatMessage = null;
            let emotionMemory = null;
            let aiResponse = null;

            //getChatHistory
            const chatHistoryArrayResponse = await ChatRepo.getChatListByUserId(userId, {role: 'USER', limit: 5, page: 1, });
            const chatHistoryArray = chatHistoryArrayResponse?.data || []

            const prompt = composePrompt(inputText, emotion, confidence, chatHistoryArray);

            const start = Date.now()
            const finalChatResponse = await defaultOpenAIRequest(prompt, {role: "user", temperature: 0.7, maxTokens: 800});
            const duration = Date.now() - start
            logger.chat_response(`[OPENAI-InputResponse], response time: ${duration} `)

            if(!finalChatResponse || typeof finalChatResponse !== "string"){
                logger.chat_error(`[OPENAI-InputResponse], Error: Invalid response from AI, expecting a string`)
                throw new InternalServerError("[ChatSvc.sendChat], Invalid response from AI, expecting a string");
            }

           if(emotion !== "neutral" && confidence > 0.5){
             chatMessage = await ChatRepo.createChatMessage({
                message: inputText,
                User: { connect: { id: userId}},
                role: "USER",
            });

            aiResponse =  await ChatRepo.createChatMessage({
                message: finalChatResponse,
                User: { connect: { id: userId }},
                role: "AI",
            });

            emotionMemory = await ChatRepo.createEmotionMemory({
                emotion,
                confidence,
                ChatMessage: {connect: { id: chatMessage.id}},
                User: { connect: { id: userId }},
            });
           }

            
          return { response: finalChatResponse, emotion_data: emotionResult, chatMessageId: chatMessage?.id || null, emotionMemoryId: emotionMemory?.id || null, aiResponseId: aiResponse?.id || null, prompt };
        } catch (error: any) {
            if(error instanceof Prisma.PrismaClientKnownRequestError){
                logger.error(`Database error: ${error?.message}`)
                throw new InternalServerError(`Database error: ${error?.message}`);
            }
            logger.error(`[CHAT.SERVICE] sendChat Error: ${error?.message}`)
            throw error;
        }
    }

    static async getChatMessageById(chatMessageId: string, currentUserId: string){
        if(!chatMessageId || !chatMessageId.trim()){
            throw new BadRequestError("Chat Message ID is required");
        }

        try {
            const chatMessage = await ChatRepo.getChatMessageById(chatMessageId, currentUserId);
            if(!chatMessage){
                throw new NotFoundError("Chat message not found");
            }
            return chatMessage;
        } catch (error: any) {
            if(error instanceof Prisma.PrismaClientKnownRequestError){
            throw new InternalServerError(`Database error: ${error.message}`);
            } throw error;
        }
    }

    static async getChatListByUserId(currentUserId: string, options: TGetChatMessagesByUserIdOptions){
        try {
            const list = await ChatRepo.getChatListByUserId(currentUserId, options);
            return list

        } catch (error: any) {
            if(error instanceof Prisma.PrismaClientInitializationError){
                throw new InternalServerError(`Database error: ${error.message}`)
            } throw error;
            
        }

    }

} 
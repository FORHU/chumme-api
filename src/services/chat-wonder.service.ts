import { Prisma } from "@prisma/client";
import { BadRequestError, InternalServerError } from "../utils/error.util";
import logger from "../utils/logger";
import CacheUtil from "../utils/cache.util";

import { sendChat, getSessionId } from "../utils/chat-wonder-api";
import ChatSvc from "./chat.service";


interface ChatContext {
  emotion: string;
  confidence: number;
  emotionResult: any;
  embedding: number[];
  dbEmotions: any[];
  emotionNames: string[];
  chatHistoryArray: any[];
  similarMessages: any[];
}

interface AdditionalContext {
  detectedLanguage: string | null;
  specificSong: { songTitle: string | null; artist?: string | null };
  shouldDetectLanguage: boolean;
  shouldDetectSong: boolean;
}


export default class ChatWonderSvc {

    static async sendChat(
      inputText: string,
      userId: string,
      conversationId?: string
    ) {
      // Validation
      if (!inputText || !inputText.trim()) {
        throw new BadRequestError("Input text cannot be empty");
      }
      if (!userId || !userId.trim()) {
        throw new BadRequestError("User ID is required");
      }
      

      try {

        conversationId = await ChatSvc.ensureConversation(inputText, userId, conversationId);
        const chatSessionId = await this.generateChatSessionId(userId) ?? "";

        return this.handleNormalChat(inputText, userId, conversationId, chatSessionId);
      } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          logger.error(`Database error: ${error?.message}`);
          throw new InternalServerError(`Database error: ${error?.message}`);
        }
        logger.error(`[CHAT.SERVICE] sendChat Error: ${error?.message}`);
        throw error;
      }
    }

    static async generateChatSessionId(userId: string) {
      try {

         // set/get chatSessionId from redis cache
        let chatSessionId = "";
        const cachedKey = `chat:sessionId:${userId}`;
         chatSessionId = await CacheUtil.get(cachedKey) ?? "";
         if(!chatSessionId){
           const res = await getSessionId();
           const newSessionId = res?.session_id || "";
           chatSessionId = newSessionId;
           await CacheUtil.set(cachedKey, newSessionId, 24 * 60 * 60);
           console.log("Generated new chatSessionId:", chatSessionId);
         }
        return chatSessionId;
      } catch (error: any) {
          const errMessage = error?.message
          console.log("generateChatSessionId Error:", errMessage);
          logger.error(`[CHAT.WONDER.SERVICE] generateChatSessionId Error: ${errMessage}`);
      }
    }


      private static async handleNormalChat(
        inputText: string,
        userId: string,
        conversationId: string,
        chatSessionId: string,
      ) {

        let finalChatResponse = ""
        let currentSessionId = chatSessionId;
        let maxRetries = 2;
        let retryCount = 0;

        while(retryCount < maxRetries){
          try {
             const chatWonderResObject = await sendChat({ user_input: inputText, user_history_select: "", session_id: currentSessionId });
             finalChatResponse = chatWonderResObject?.response || ""
             break;
           } catch (error: any) {
              const errMessage = error?.message
              const errStatus = error?.status
              console.log("Chat Wonder API Error:", errMessage, errStatus);
              if((errStatus === 401 || errMessage.toLowerCase().includes("401")) && retryCount < maxRetries - 1){
                // regenerate session id and retry
                const cachedKey = `chat:sessionId:${userId}`;
                await CacheUtil.del(cachedKey);
                currentSessionId = await this.generateChatSessionId(userId) || "";
                retryCount++;
                console.log(`Retrying sendChat with new session id. Attempt ${retryCount + 1}`);
              } else {
                throw new BadRequestError(`Chat Wonder API Error: ${error?.message}`);
              }
           }
        }
        // Save user message
        const chatMessage = await ChatSvc.saveUserMessage(
          inputText,
          userId,
          conversationId
        );
    
        // Save AI response
        const aiResponse = await ChatSvc.saveAIMessage(
          inputText,
          finalChatResponse,
          userId,
          conversationId
        );
    
    
        await CacheUtil.delByPattern(`chat:list:${userId}:*`);
    
        return {
          response: finalChatResponse,
          chatMessageId: chatMessage.id,
          aiResponseId: aiResponse.id,
          chatSessionId: currentSessionId
        };
      }



}
import { Prisma } from "@prisma/client";
import { BadRequestError, InternalServerError } from "../utils/error.util";
import logger from "../utils/logger";
import CacheUtil from "../utils/cache.util";

import {
  sendChat as sendChatWithChatWonder,
  getSessionId as getSessionIdWithChatWonder,
} from "../utils/chat-wonder-api";
import { parseChatWonderResponse } from "../utils/chat-wonder";
import ChatSvc from "./chat.service";

export default class ChatWonderSvc {
  static async sendChat(
    inputText: string,
    userId: string,
    conversationId?: string,
  ) {
    // Validation
    if (!inputText || !inputText.trim()) {
      throw new BadRequestError("Input text cannot be empty");
    }
    if (!userId || !userId.trim()) {
      throw new BadRequestError("User ID is required");
    }

    try {
      conversationId = await ChatSvc.ensureConversation(
        inputText,
        userId,
        conversationId,
      );
      const chatSessionId = (await this.generateChatSessionId(userId)) ?? "";

      return this.handleNormalChat(
        inputText,
        userId,
        conversationId,
        chatSessionId,
      );
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
      chatSessionId = (await CacheUtil.get(cachedKey)) ?? "";
      if (!chatSessionId) {
        const res = await getSessionIdWithChatWonder();
        const newSessionId = res?.session_id || "";
        chatSessionId = newSessionId;
        await CacheUtil.set(cachedKey, newSessionId, 24 * 60 * 60);
        logger.info(
          `[CHAT.WONDER.SERVICE] Generated new chatSessionId: ${chatSessionId}`,
        );
      }
      return chatSessionId;
    } catch (error: any) {
      const errMessage = error?.message;
      logger.error(
        `[CHAT.WONDER.SERVICE] generateChatSessionId Error: ${errMessage}`,
      );
    }
  }

  private static async handleNormalChat(
    inputText: string,
    userId: string,
    conversationId: string,
    chatSessionId: string,
  ) {
    let finalChatResponse = "";
    let currentSessionId = chatSessionId;
    let maxRetries = 2;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const chumeePrompt = await this.additionalPrompt(inputText);
        const chatWonderResObject = await sendChatWithChatWonder({
          user_input: chumeePrompt,
          user_history_select: "",
          session_id: currentSessionId,
        });
        logger.info(`[CHAT.WONDER.SERVICE] ChatWonder response received`);
        finalChatResponse = chatWonderResObject?.response || "";
        // Parse and normalize the response
        const parsedResponse = parseChatWonderResponse(finalChatResponse);
        // Save user message
        const chatMessage = await ChatSvc.saveUserMessage(
          inputText,
          userId,
          conversationId,
        );

        // Save AI response (just the message part)
        const aiResponse = await ChatSvc.saveAIMessage(
          inputText,
          parsedResponse.message,
          userId,
          conversationId,
        );

        await CacheUtil.delByPattern(`chat:list:${userId}:*`);

        // Use AI-generated videos from parsed response
        const { raw, ...cleanResponse } = parsedResponse;

        return {
          message: cleanResponse.message,
          emotion_data: cleanResponse.emotion_data,
          videos: cleanResponse.videos || [],
          artist: cleanResponse.artist || [],
          images: cleanResponse.images || [],
          conversationId,
          chatMessageId: chatMessage.id,
          aiResponseId: aiResponse.id,
          chatSessionId: currentSessionId,
        };
      } catch (error: any) {
        const errMessage = error?.message;
        const errStatus = error?.status;
        logger.error(
          `[CHAT.WONDER.SERVICE] Chat Wonder API Error: ${errMessage} (status: ${errStatus})`,
        );
        if (
          (errStatus === 401 || errMessage.toLowerCase().includes("401")) &&
          retryCount < maxRetries - 1
        ) {
          // regenerate session id and retry
          const cachedKey = `chat:sessionId:${userId}`;
          await CacheUtil.del(cachedKey);
          currentSessionId = (await this.generateChatSessionId(userId)) || "";
          retryCount++;
          logger.warn(
            `[CHAT.WONDER.SERVICE] Retrying sendChat with new session id. Attempt ${retryCount + 1}`,
          );
        }
      }
    }

    // If we exhausted retries without success, throw error
    throw new BadRequestError(
      "Failed to get response from ChatWonder after retries",
    );
  }

  public static async additionalPrompt(userMessage: string) {
    return `
    ⚠️ IMPORTANT
    OUTPUT FORMAT - RESPOND IN JSON ONLY:
    {
      "message": "Your casual message here with natural emojis ( NO OTHER TEXT )",
      "videos": [
        { "title": "Video title", "artist": "Artist name", "url": "video URL" }
      ],
      "artist": [
        { "name": "Artist name", "image": null }
      ],
      "images": []
    }
    USER: ${userMessage}
    `;
  }
}

import ChatRepo, {
  TGetChatMessagesByUserIdOptions,
} from "../repositories/chat.repository";
import { Prisma } from "@prisma/client";
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
} from "../utils/error.util";
import CacheUtil from "../utils/cache.util";
import ConversationSvc from "./conversation.service";

export default class ChatSvc {
  /**
   * Helper to get conversation connect object for Prisma
   * Reduces code duplication across message creation calls
   */
  private static getConversationConnect(
    inputText?: string,
    conversationId?: string,
    userId?: string,
  ) {
    if (conversationId) {
      return { connect: { id: conversationId } };
    }
    // Only create new conversation if userId is provided
    if (userId) {
      return {
        create: {
          title: inputText,
          user: { connect: { id: userId } },
        },
      };
    }
    return undefined;
  }

  // ========================================
  // PRIVATE HELPERS - SETUP
  // ========================================

  /**
   * Ensures a conversation exists, either by validating existing ID or creating new one
   */
  static async ensureConversation(
    inputText: string,
    userId: string,
    conversationId?: string,
  ): Promise<string> {
    if (conversationId) {
      await ConversationSvc.getConversationById(conversationId, userId);
      return conversationId;
    }

    const conversationData = await ConversationSvc.createConversation(
      userId,
      inputText,
    );
    return conversationData.id;
  }

  // ========================================
  // PRIVATE HELPERS - MESSAGE PERSISTENCE
  // ========================================

  /**
   * Saves user message to database
   */
  static async saveUserMessage(
    inputText: string,
    userId: string,
    conversationId: string,
  ) {
    return ChatRepo.createChatMessage({
      message: inputText,
      User: { connect: { id: userId } },
      role: "USER",
      conversation: this.getConversationConnect(
        inputText,
        conversationId,
        userId,
      ),
    });
  }

  /**
   * Saves AI message to database
   */
  static async saveAIMessage(
    inputText: string,
    response: string,
    userId: string,
    conversationId: string,
  ) {
    return ChatRepo.createChatMessage({
      message: response,
      User: { connect: { id: userId } },
      role: "AI",
      conversation: this.getConversationConnect(
        inputText,
        conversationId,
        userId,
      ),
    });
  }

  static async getChatMessageById(
    chatMessageId: string,
    currentUserId: string,
  ) {
    const cachedKey = `chat:message:${currentUserId}`;
    const cache = await CacheUtil.get(cachedKey);
    if (cache) {
      return cache;
    }

    if (!chatMessageId || !chatMessageId.trim()) {
      throw new BadRequestError("Chat Message ID is required");
    }

    try {
      const chatMessage = await ChatRepo.getChatMessageById(
        chatMessageId,
        currentUserId,
      );
      if (!chatMessage) {
        throw new NotFoundError("Chat message not found");
      }
      await CacheUtil.set(cachedKey, chatMessage);
      return chatMessage;
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new InternalServerError(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  static async getChatListByUserId(
    currentUserId: string,
    options: TGetChatMessagesByUserIdOptions,
  ) {
    const cachedKey = `chat:list:${currentUserId}:role:${options.role || "ALL"}:page:${options.page || 1}`;

    const cached = await CacheUtil.get(cachedKey);
    if (cached) {
      return cached;
    }

    try {
      const list = await ChatRepo.getChatListByUserId(currentUserId, options);
      await CacheUtil.set(cachedKey, list);
      return list;
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientInitializationError) {
        throw new InternalServerError(`Database error: ${error.message}`);
      }
      throw error;
    }
  }
  static async getAiChatHeader(
    userId: string,
    page: number,
    limit: number,
    search_conversation: string,
    search_message: string,
  ) {
    if (page < 0) {
      throw new Error("Page must be non-negative");
    }
    if (limit < 1 || limit > 50) {
      throw new Error("Limit must be between 1 and 50");
    }
    return await ChatRepo.getAiChatHeader(
      userId,
      page,
      limit,
      search_conversation,
      search_message,
    );
  }
}

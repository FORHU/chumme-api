import ConversationRepo, {
  TGetConversationsByUserIdOptions,
} from "../repositories/conversation.repository";
import { BadRequestError, NotFoundError } from "../utils/error.util";
import logger from "../utils/logger";
import { defaultOpenAIRequest } from "../utils/openai";
import CacheUtil from "../utils/cache.util";

export default class ConversationSvc {
  /**
   * Create a new conversation
   */
  static async createConversation(userId: string, title?: string) {
    if (!userId || !userId.trim()) {
      throw new BadRequestError("User ID is required");
    }

    try {
      const conversation = await ConversationRepo.createConversation({
        title: title || null,
        user: {
          connect: { id: userId },
        },
      });

      // Invalidate conversations list cache
      await CacheUtil.delByPattern(`conversation:list:${userId}:*`);

      return conversation;
    } catch (error: any) {
      logger.error(
        `[CONVERSATION.SERVICE] createConversation Error: ${error?.message}`,
      );
      throw error;
    }
  }

  /**
   * Get conversation by ID with authorization
   */
  static async getConversationById(conversationId: string, userId: string) {
    if (!conversationId || !conversationId.trim()) {
      throw new BadRequestError("Conversation ID is required");
    }
    if (!userId || !userId.trim()) {
      throw new BadRequestError("User ID is required");
    }

    const cachedKey = `conversation:${conversationId}:${userId}`;
    const cached = await CacheUtil.get(cachedKey);
    if (cached) {
      return cached;
    }

    try {
      const conversation = await ConversationRepo.getConversationById(
        conversationId,
        userId,
      );

      if (!conversation) {
        throw new NotFoundError("Conversation not found");
      }

      await CacheUtil.set(cachedKey, conversation, 300); // Cache for 5 minutes
      return conversation;
    } catch (error: any) {
      logger.error(
        `[CONVERSATION.SERVICE] getConversationById Error: ${error?.message}`,
      );
      throw error;
    }
  }

  /**
   * Get paginated list of conversations for a user
   */
  static async getConversationsList(
    userId: string,
    options: TGetConversationsByUserIdOptions,
  ) {
    if (!userId || !userId.trim()) {
      throw new BadRequestError("User ID is required");
    }

    const cachedKey = `conversation:list:${userId}:page:${options.page || 1}:limit:${options.limit || 20}`;
    const cached = await CacheUtil.get(cachedKey);
    if (cached) {
      return cached;
    }

    try {
      const conversations = await ConversationRepo.getConversationsByUserId(
        userId,
        options,
      );

      await CacheUtil.set(cachedKey, conversations, 180); // Cache for 3 minutes
      return conversations;
    } catch (error: any) {
      logger.error(
        `[CONVERSATION.SERVICE] getConversationsList Error: ${error?.message}`,
      );
      throw error;
    }
  }

  /**
   * Update conversation title
   */
  static async updateConversationTitle(
    conversationId: string,
    userId: string,
    title: string,
  ) {
    if (!conversationId || !conversationId.trim()) {
      throw new BadRequestError("Conversation ID is required");
    }
    if (!userId || !userId.trim()) {
      throw new BadRequestError("User ID is required");
    }
    if (!title || !title.trim()) {
      throw new BadRequestError("Title is required");
    }

    try {
      // Verify ownership first
      await this.getConversationById(conversationId, userId);

      const updatedConversation =
        await ConversationRepo.updateConversationTitle(
          conversationId,
          userId,
          title.trim(),
        );

      // Invalidate caches
      await CacheUtil.delByPattern(`conversation:${conversationId}:*`);
      await CacheUtil.delByPattern(`conversation:list:${userId}:*`);

      return updatedConversation;
    } catch (error: any) {
      logger.error(
        `[CONVERSATION.SERVICE] updateConversationTitle Error: ${error?.message}`,
      );
      throw error;
    }
  }

  /**
   * Soft delete a conversation
   */
  static async deleteConversation(conversationId: string, userId: string) {
    if (!conversationId || !conversationId.trim()) {
      throw new BadRequestError("Conversation ID is required");
    }
    if (!userId || !userId.trim()) {
      throw new BadRequestError("User ID is required");
    }

    try {
      // Verify ownership first
      await this.getConversationById(conversationId, userId);

      const deletedConversation = await ConversationRepo.deleteConversation(
        conversationId,
        userId,
      );

      // Invalidate caches
      await CacheUtil.delByPattern(`conversation:${conversationId}:*`);
      await CacheUtil.delByPattern(`conversation:list:${userId}:*`);

      return deletedConversation;
    } catch (error: any) {
      logger.error(
        `[CONVERSATION.SERVICE] deleteConversation Error: ${error?.message}`,
      );
      throw error;
    }
  }

  /**
   * Generate conversation title from first messages using AI
   * This is called asynchronously after 3rd message
   */
  static async generateConversationTitle(
    conversationId: string,
    userId: string,
  ) {
    try {
      // Check if conversation already has a title
      const conversation = await this.getConversationById(
        conversationId,
        userId,
      );
      if (conversation.title) {
        logger.info(
          `[CONVERSATION.SERVICE] Conversation ${conversationId} already has a title, skipping generation`,
        );
        return conversation;
      }

      // Get first 5 messages
      const messages = await ConversationRepo.getFirstMessages(
        conversationId,
        5,
      );

      if (messages.length < 2) {
        logger.info(
          `[CONVERSATION.SERVICE] Not enough messages (${messages.length}) to generate title for conversation ${conversationId}`,
        );
        return conversation;
      }

      // Format messages for prompt
      const messageText = messages
        .map((m) => `${m.role}: ${m.message}`)
        .join("\n");

      const prompt = `Generate a short, descriptive 3-5 word title for this conversation. Respond with ONLY the title, nothing else.

Conversation:
${messageText}

Title:`;

      const title = await defaultOpenAIRequest(prompt, {
        role: "user",
        temperature: 0.7,
        maxTokens: 20,
      });

      if (!title || typeof title !== "string") {
        logger.error(
          `[CONVERSATION.SERVICE] Invalid title generated for conversation ${conversationId}`,
        );
        return conversation;
      }

      // Clean up the title (remove quotes, trim, limit length)
      const cleanTitle = title.replace(/['"]/g, "").trim().substring(0, 100);

      // Update conversation with generated title
      const updatedConversation =
        await ConversationRepo.updateConversationTitle(
          conversationId,
          userId,
          cleanTitle,
        );

      // Invalidate caches
      await CacheUtil.delByPattern(`conversation:${conversationId}:*`);
      await CacheUtil.delByPattern(`conversation:list:${userId}:*`);

      logger.info(
        `[CONVERSATION.SERVICE] Generated title for conversation ${conversationId}: "${cleanTitle}"`,
      );

      return updatedConversation;
    } catch (error: any) {
      // Don't throw error for title generation - it's not critical
      logger.error(
        `[CONVERSATION.SERVICE] generateConversationTitle Error: ${error?.message}`,
      );
      return null;
    }
  }
}

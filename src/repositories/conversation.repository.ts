import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";

export type TGetConversationsByUserIdOptions = {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  includeDeleted?: boolean;
};

export default class ConversationRepo {
  /**
   * Create a new conversation for a user
   */
  static async createConversation(data: Prisma.ConversationCreateInput) {
    return prisma.conversation.create({
      data,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        _count: {
          select: {
            chatMessages: true,
          },
        },
      },
    });
  }

  /**
   * Get conversation by ID with ownership check
   */
  static async getConversationById(conversationId: string, userId: string) {
    return prisma.conversation.findUnique({
      where: {
        id: conversationId,
        userId,
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        _count: {
          select: {
            chatMessages: true,
          },
        },
      },
    });
  }

  /**
   * Get all conversations for a user with pagination
   */
  static async getConversationsByUserId(
    userId: string,
    options: TGetConversationsByUserIdOptions,
  ) {
    const {
      page = 1,
      limit = 20,
      sortOrder = "desc",
      includeDeleted = false,
    } = options;

    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: {
          userId,
          ...(includeDeleted ? {} : { isDeleted: false }),
        },
        include: {
          _count: {
            select: {
              chatMessages: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          lastMessageAt: sortOrder,
        },
      }),
      prisma.conversation.count({
        where: {
          userId,
          ...(includeDeleted ? {} : { isDeleted: false }),
        },
      }),
    ]);

    return {
      data: conversations,
      currentPage: page,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    };
  }

  /**
   * Update conversation title
   */
  static async updateConversationTitle(
    conversationId: string,
    userId: string,
    title: string,
  ) {
    return prisma.conversation.update({
      where: {
        id: conversationId,
        userId,
      },
      data: {
        title,
      },
    });
  }

  /**
   * Update lastMessageAt timestamp
   */
  static async updateLastMessageAt(conversationId: string) {
    return prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        lastMessageAt: new Date(),
      },
    });
  }

  /**
   * Soft delete a conversation
   */
  static async deleteConversation(conversationId: string, userId: string) {
    return prisma.conversation.update({
      where: {
        id: conversationId,
        userId,
      },
      data: {
        isDeleted: true,
      },
    });
  }

  /**
   * Get message count for a conversation
   */
  static async getConversationMessageCount(conversationId: string) {
    return prisma.chatMessage.count({
      where: {
        conversationId,
      },
    });
  }

  /**
   * Get first N messages from a conversation (for title generation)
   */
  static async getFirstMessages(conversationId: string, limit: number = 5) {
    return prisma.chatMessage.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
      select: {
        id: true,
        message: true,
        role: true,
        createdAt: true,
      },
    });
  }
}

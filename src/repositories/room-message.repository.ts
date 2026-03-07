import { prisma } from "../utils/prisma";

export default class RoomMessageRepo {
  /**
   * Create a new message in a room
   */
  static async createMessage(data: {
    chummeSubCategoryId: string;
    authorId: string;
    content?: any;
    voiceMessageId?: string;
    parentMessageId?: string;
    isSystem?: boolean;
  }) {
    return prisma.roomMessage.create({
      data: {
        chummeSubCategoryId: data.chummeSubCategoryId,
        authorId: data.authorId,
        content: data.content || null,
        voiceMessageId: data.voiceMessageId || null,
        parentMessageId: data.parentMessageId || null,
        isSystem: data.isSystem ?? false,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: {
              select: {
                fileUrl: true,
              },
            },
          },
        },
        voiceMessage: {
          select: {
            id: true,
            fileUrl: true,
            metaData: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });
  }

  /**
   * Get messages for a room with pagination and threading support
   */
  static async getRoomMessages(
    chummeSubCategoryId: string,
    page: number = 1,
    limit: number = 20,
    parentMessageId?: string,
  ) {
    const skip = (page - 1) * limit;

    return prisma.roomMessage.findMany({
      where: {
        chummeSubCategoryId,
        parentMessageId: parentMessageId || null, // Top level messages if no parentId
      },
      skip,
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarId: true,
            avatar: {
              select: {
                fileUrl: true,
              },
            },
          },
        },
        voiceMessage: {
          select: {
            id: true,
            fileUrl: true,
            metaData: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Find message by ID
   */
  static async findMessageById(id: string) {
    return prisma.roomMessage.findUnique({
      where: { id },
      include: {
        author: true,
        reactions: true,
      },
    });
  }

  /**
   * Remove message
   */
  static async removeMessage(id: string) {
    return prisma.roomMessage.delete({
      where: { id },
    });
  }
}

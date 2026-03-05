import { prisma } from "../utils/prisma";

export default class RoomRepo {
  /**
   * Resolve shortcut IDs for subcategories
   */
  static async resolveSubCategoryShortcut(id: string): Promise<string | null> {
    const specialShortcuts = [
      "chumme-lobby-shortcut",
      "chumme-room-shortcut",
      "chumme-main",
      "global",
    ];

    if (specialShortcuts.includes(id)) {
      // Find the "Global" or "Chumme World" category
      const targetName = id === "chumme-main" ? "Chumme World" : "Global";
      const cat = await prisma.roomCategory.findFirst({
        where: {
          OR: [
            { name: { equals: targetName, mode: "insensitive" } },
            { keyName: { equals: targetName, mode: "insensitive" } },
          ],
          deletedAt: null,
        },
      });
      if (!cat) return id;

      const sc = await prisma.roomSubCategory.findFirst({
        where: {
          roomCategoryId: cat.id,
          OR: [
            { name: { contains: "Lobby", mode: "insensitive" } },
            { keyName: { contains: "lobby", mode: "insensitive" } },
          ],
          deletedAt: null,
        },
      });
      return sc?.id || id;
    }

    // Also check if id is a keyName for a subcategory
    const subByField = await prisma.roomSubCategory.findFirst({
      where: {
        OR: [{ id: id }, { keyName: id }],
        deletedAt: null,
      },
    });

    return subByField?.id || id;
  }

  static async findRoomName(name: string) {
    return prisma.roomSubCategory.findFirst({
      where: {
        name,
        deletedAt: null,
      },
    });
  }

  static async fetchRoomList() {
    return prisma.roomSubCategory.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        position: true,
        metaData: true,
        _count: {
          select: { userChatRooms: true },
        },
      },
    });
  }

  static async findUserById(userId: string) {
    return prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  }

  /**
   * Create a new room (actually a RoomSubCategory)
   */
  static async createRoom(data: {
    name: string;
    note: string;
    ownerId: string;
    roomCategoryId: string;
    position?: any;
    metaData: any;
    keyName?: string;
    color: string;
    size: string;
    isAd: boolean;
  }) {
    return prisma.roomSubCategory.create({
      data: {
        ...data,
        position: data.position || {},
        deletedAt: null,
      },
    });
  }

  /**
   * Find room by ID
   */
  static async findRoomById(roomId: string) {
    return prisma.roomSubCategory.findUnique({
      where: {
        id: roomId,
        deletedAt: null,
      },
      include: {
        roomCategory: {
          include: {
            artists: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        userChatRooms: {
          include: {
            user: {
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
          },
        },
        _count: {
          select: {
            userChatRooms: true,
            roomMessages: true,
          },
        },
      },
    });
  }

  /**
   * Get rooms accessible to the user
   */
  static async getUserAccessibleRooms(
    userId: string,
    skip: number,
    limit: number,
    subcategoryId?: string,
  ) {
    const realSubCategoryId = subcategoryId
      ? await this.resolveSubCategoryShortcut(subcategoryId)
      : null;

    return prisma.roomSubCategory.findMany({
      where: {
        deletedAt: null,
        ...(realSubCategoryId && { id: realSubCategoryId }),
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        roomCategory: {
          include: {
            artists: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        userChatRooms: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
            userChatRole: true,
            joinedAt: true,
          },
        },
        _count: {
          select: {
            userChatRooms: true,
            roomMessages: true,
          },
        },
      },
    });
  }

  /**
   * Count rooms accessible to the user
   */
  static async countUserAccessibleRooms(
    userId: string,
    subcategoryId?: string,
  ) {
    const realSubCategoryId = subcategoryId
      ? await this.resolveSubCategoryShortcut(subcategoryId)
      : null;

    return prisma.roomSubCategory.count({
      where: {
        deletedAt: null,
        ...(realSubCategoryId && { id: realSubCategoryId }),
      },
    });
  }

  /**
   * Update room details
   */
  static async updateRoom(
    roomId: string,
    data: {
      name?: string;
      note?: string;
      roomCategoryId?: string;
      position?: any;
      metaData?: any;
      keyName?: string;
    },
  ) {
    return prisma.roomSubCategory.update({
      where: {
        id: roomId,
        deletedAt: null,
      },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        userChatRooms: {
          include: {
            user: {
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
          },
        },
        _count: {
          select: {
            userChatRooms: true,
            roomMessages: true,
          },
        },
      },
    });
  }

  /**
   * Soft delete room
   */
  static async softDeleteRoom(roomId: string) {
    return prisma.roomSubCategory.update({
      where: {
        id: roomId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Add a member to a room (Legacy redirect to UserChatRoom)
   */
  static async addRoomMember(data: {
    roomSubCategoryId: string;
    userId: string;
    role: any;
  }) {
    return prisma.roomUserChat.create({
      data: {
        roomSubCategoryId: data.roomSubCategoryId,
        userId: data.userId,
        userChatRole: data.role,
      },
    });
  }

  /**
   * Remove a member from a room
   */
  static async removeRoomMember(roomSubCategoryId: string, userId: string) {
    return prisma.roomUserChat.delete({
      where: {
        userId_roomSubCategoryId: {
          userId,
          roomSubCategoryId,
        },
      },
    });
  }

  /**
   * Check if user is the owner of the room
   */
  static async isUserRoomOwner(roomId: string, userId: string) {
    const room = await prisma.roomSubCategory.findFirst({
      where: {
        id: roomId,
        ownerId: userId,
        deletedAt: null,
      },
    });
    return !!room;
  }

  static async findById(roomId: string) {
    return this.findRoomById(roomId);
  }

  static async getRoomMessages(roomId: string) {
    return prisma.roomSubCategory.findUnique({
      where: {
        id: roomId,
      },
      select: {
        roomMessages: true,
      },
    });
  }
}

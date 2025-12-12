import { prisma } from "../utils/prisma";

export default class RoomMemberRepo {
  static async getRoomMembers(roomId: string) {
    return prisma.roomMember.findMany({
      where: {
        roomId: roomId,
        room: {
          isDeleted: false, // Add this condition
        },
      },
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
      orderBy: {
        joinedAt: "asc",
      },
    });
  }
  /**
   * Check if user is a member of the room (only non-deleted rooms)
   */
  static async isUserRoomMember(roomId: string, userId: string) {
    const member = await prisma.roomMember.findFirst({
      where: {
        roomId: roomId,
        userId: userId,
        room: {
          isDeleted: false,
        },
      },
    });
    return !!member;
  }
  static async leaveAllRooms(userId: string) {
    return prisma.roomMember.deleteMany({
      where: { userId },
    });
  }
}

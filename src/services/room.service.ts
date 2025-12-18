import RoomRepo from "../repositories/room.repository";
import RoomMemberRepo from "../repositories/room-member.repository";

export default class RoomSvc {
  static async fetchRoomList() {
    const response = await RoomRepo.fetchRoomList();
    return response.map(({ _count, ...room }) => ({
      ...room,
      count: _count.members,
    }));
  }

  /**
   * Create a new room
   * Automatically adds the creator as the owner and first member
   */
  static async createRoom(data: {
    name: string;
    note: string;
    ownerId: string;
  }) {
    const roomByName = await RoomRepo.findRoomName(data.name);
    if (roomByName) {
      throw new Error("Name Already Exist!");
    }

    // Create the room
    const room = await RoomRepo.createRoom(data);

    // Add owner as a member with 'owner' role
    await RoomRepo.addRoomMember({
      roomId: room.id,
      userId: data.ownerId,
      role: "owner",
    });

    return room;
  }

  /**
   * Get all rooms accessible to the user
   * Returns public rooms and private rooms where user is a member
   */
  static async getAllRooms(
    userId: string,
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit;

    const [rooms, totalCount] = await Promise.all([
      RoomRepo.getUserAccessibleRooms(userId, skip, limit),
      RoomRepo.countUserAccessibleRooms(userId),
    ]);

    return {
      rooms,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Get room by ID
   * User must be a member to view the room
   */
  static async getRoomById(roomId: string, userId: string) {
    // Check if user is a member of the room
    const isMember = await RoomMemberRepo.isUserRoomMember(roomId, userId);
    if (!isMember) {
      return null;
    }

    return RoomRepo.findRoomById(roomId);
  }

  /**
   * Update room details
   * Only room owner can update
   */
  static async updateRoom(
    roomId: string,
    updateData: {
      name?: string;
      isPrivate?: boolean;
      note?: string;
    },
    userId: string
  ) {
    // Check if user is the owner of the room
    const isOwner = await RoomRepo.isUserRoomOwner(roomId, userId);
    if (!isOwner) {
      return null;
    }

    return RoomRepo.updateRoom(roomId, updateData);
  }

  static async deleteRoom(roomId: string, userId: string) {
    const isOwner = await RoomRepo.isUserRoomOwner(roomId, userId);
    if (!isOwner) {
      return false;
    }

    return RoomRepo.softDeleteRoom(roomId);
  }

  static async joinRoom(roomId: string, userId: string) {
    const user = await RoomRepo.findUserById(userId);
    if (!user || user.isDeleted) {
      return { success: false, message: "User not found or has been deleted" };
    }

    const room = await RoomRepo.findRoomById(roomId);
    if (!room) {
      return { success: false, message: "Room not found" };
    }

    const isAlreadyMember = await RoomMemberRepo.isUserRoomMember(
      roomId,
      userId
    );
    if (isAlreadyMember) {
      return {
        success: false,
        message: "User is already a member of this room",
      };
    }

    await RoomRepo.addRoomMember({
      roomId,
      userId,
      role: "member",
    });

    return {
      success: true,
      message: "Successfully joined room",
      room: await RoomRepo.findRoomById(roomId),
    };
  }

  /**
   * Leave a room
   * Users can leave rooms they're members of (except if they're the owner)
   */
  static async leaveRoom(roomId: string, userId: string) {
    // Check if user is a member
    const isMember = await RoomMemberRepo.isUserRoomMember(roomId, userId);
    if (!isMember) {
      return false;
    }

    // Check if user is the owner
    const isOwner = await RoomRepo.isUserRoomOwner(roomId, userId);
    if (isOwner) {
      return false; // Owners cannot leave their own rooms
    }

    return RoomRepo.removeRoomMember(roomId, userId);
  }
  static async findById(roomId: string) {
    return RoomRepo.findById(roomId);
  }
  static async getRoomMessages(roomId: string) {
    return RoomRepo.getRoomMessages(roomId);
  }
}

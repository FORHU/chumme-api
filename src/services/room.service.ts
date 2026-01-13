import RoomRepo from "../repositories/room.repository";
import RoomMemberRepo from "../repositories/room-member.repository";
import RoomSubCategoryRepo from "../repositories/room-subcategory.repository";
import CacheUtil from "../utils/cache.util";

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
    roomSubCategoryId: string;
  }) {
    const roomByName = await RoomRepo.findRoomName(data.name);
    if (roomByName) {
      throw new Error("Name Already Exist!");
    }

    // Validate subcategory exists
    const subCategoryExists = await RoomSubCategoryRepo.getSubCategoryById(
      data.roomSubCategoryId
    );
    if (!subCategoryExists) {
      throw new Error("Room subcategory not found");
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
      roomSubCategoryId?: string;
    },
    userId: string
  ) {
    // Check if user is the owner of the room
    const isOwner = await RoomRepo.isUserRoomOwner(roomId, userId);
    if (!isOwner) {
      return null;
    }

    // Validate subcategory if provided
    if (updateData.roomSubCategoryId) {
      const subCategoryExists = await RoomSubCategoryRepo.getSubCategoryById(
        updateData.roomSubCategoryId
      );
      if (!subCategoryExists) {
        throw new Error("Room subcategory not found");
      }
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
  static async getRoomMessages(
    userId: string,
    roomId: string,
    page: number,
    limit: number
  ) {
    if (page < 0) {
      throw new Error("Page must be non-negative");
    }
    if (limit < 1 || limit > 50) {
      throw new Error("Limit must be between 1 and 50");
    }

    // Include userId in cache key
    const cacheKey = `roomMessages:user:${userId}:page:${page}:limit:${limit}`;
    const cached = await CacheUtil.get(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await RoomRepo.getRoomMessages(roomId);
    await CacheUtil.set(cacheKey, response);
    return response;
  }
}

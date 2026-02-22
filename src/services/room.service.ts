import RoomRepo from "../repositories/room.repository";
import RoomMemberRepo from "../repositories/room-member.repository";
import RoomSubCategoryRepo from "../repositories/room-subcategory.repository";
import MessageRepo from "../repositories/message.repository";
import CacheUtil from "../utils/cache.util";
import S3Util from "../utils/s3.util";
import S3PresignedUtil from "../utils/s3-presigned.util";

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
    position: any;
    metaData: any;
  }) {
    const roomByName = await RoomRepo.findRoomName(data.name);
    if (roomByName) {
      throw new Error("Name Already Exist!");
    }

    // Validate subcategory exists
    const subCategoryExists = await RoomSubCategoryRepo.getSubCategoryById(
      data.roomSubCategoryId,
    );
    if (!subCategoryExists) {
      throw new Error("Room subcategory not found");
    }

    // Create the room
    console.log("[RoomSvc] Calling RoomRepo.createRoom...");
    const room = await RoomRepo.createRoom(data);
    console.log("[RoomSvc] Room created in DB:", room.id);

    // Add owner as a member with 'owner' role
    console.log("[RoomSvc] Adding owner as member:", data.ownerId);
    await RoomRepo.addRoomMember({
      roomId: room.id,
      userId: data.ownerId,
      role: "owner",
    });
    console.log("[RoomSvc] Owner added as member.");

    return room;
  }

  /**
   * Get all rooms accessible to the user
   * Returns public rooms and private rooms where user is a member
   */
  static async getAllRooms(
    userId: string,
    page: number = 1,
    limit: number = 10,
    subcategoryId?: string,
  ) {
    const skip = (page - 1) * limit;

    const [rooms, totalCount] = await Promise.all([
      RoomRepo.getUserAccessibleRooms(userId, skip, limit, subcategoryId),
      RoomRepo.countUserAccessibleRooms(userId, subcategoryId),
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
    // We allow fetching room details for viewing even if not a member
    // Membership logic can be handled at the action level (e.g. sending messages)
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
      position?: any;
      metaData?: any;
    },
    userId: string,
  ) {
    // Check if user is the owner of the room
    const isOwner = await RoomRepo.isUserRoomOwner(roomId, userId);
    if (!isOwner) {
      return null;
    }

    // Validate subcategory if provided
    if (updateData.roomSubCategoryId) {
      const subCategoryExists = await RoomSubCategoryRepo.getSubCategoryById(
        updateData.roomSubCategoryId,
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
      userId,
    );
    if (isAlreadyMember) {
      return {
        success: true, // Auto-success if they are already in the room
        message: "User is already a member of this room",
        room: await RoomRepo.findRoomById(roomId),
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
  /**
   * Helper to map a raw message to the structure expected by the frontend,
   * including generating a signed S3 URL for voice messages.
   */
  static async mapMessageWithSignedUrl(msg: any) {
    let voiceNote = undefined;

    if (msg.voiceMessage) {
      const key = (S3Util as any).getKeyFromUrl(msg.voiceMessage.fileUrl);
      let signedUrl = msg.voiceMessage.fileUrl; // Fallback to raw

      if (key) {
        try {
          signedUrl = await S3PresignedUtil.getDownloadUrl(key);
        } catch (err) {
          console.error(`[RoomSvc] Error signing URL for key ${key}:`, err);
        }
      }

      voiceNote = {
        duration: msg.voiceMessage.metaData?.duration || 0,
        waveform: msg.voiceMessage.metaData?.waveform || [],
        audioUrl: signedUrl,
      };
    }

    return {
      ...msg,
      user: msg.author,
      voiceNote,
    };
  }

  static async getRoomMessages(
    userId: string,
    roomId: string,
    page: number,
    limit: number,
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

    const messages = await MessageRepo.getRoomMessages(roomId, page + 1, limit);

    // Map all messages and sign URLs in parallel
    const response = await Promise.all(
      messages.map((msg: any) => this.mapMessageWithSignedUrl(msg)),
    );

    await CacheUtil.set(cacheKey, response);
    return response;
  }
}

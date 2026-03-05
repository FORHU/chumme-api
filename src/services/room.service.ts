import { UserChatRole } from "@prisma/client";
import RoomRepo from "../repositories/room.repository";
import RoomUserChatRepo from "../repositories/room-user-chat.repository";
import MessageRepo from "../repositories/message.repository";
import S3Util from "../utils/s3.util";
import S3PresignedUtil from "../utils/s3-presigned.util";

export default class RoomSvc {
  static async fetchRoomList() {
    const response = await RoomRepo.fetchRoomList();
    return response.map(({ _count, ...room }) => ({
      ...room,
      count: _count.userChatRooms,
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
    roomCategoryId: string;
    position: any;
    metaData: any;
    keyName?: string;
    color: string;
    size: string;
    isAd: boolean;
  }) {
    const roomByName = await RoomRepo.findRoomName(data.name);
    if (roomByName) {
      throw new Error("Name Already Exist!");
    }

    // Create the room
    const room = await RoomRepo.createRoom({
      ...data,
    });

    // Add owner as a member with 'OWNER' role
    await RoomUserChatRepo.joinRoom(data.ownerId, room.id, UserChatRole.OWNER);

    return room;
  }

  /**
   * Get all rooms accessible to the user
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
   */
  static async getRoomById(roomId: string, userId: string) {
    return RoomRepo.findRoomById(roomId);
  }

  /**
   * Update room details
   */
  static async updateRoom(
    roomId: string,
    updateData: {
      name?: string;
      isPrivate?: boolean;
      note?: string;
      roomCategoryId?: string;
      position?: any;
      metaData?: any;
      keyName?: string;
    },
    userId: string,
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
    if (!user) {
      return { success: false, message: "User not found" };
    }

    const room = await RoomRepo.findRoomById(roomId);
    if (!room) {
      return { success: false, message: "Room not found" };
    }

    const isAlreadyMember = await RoomUserChatRepo.isMember(userId, roomId);
    if (isAlreadyMember) {
      return {
        success: true,
        message: "User is already a member of this room",
        room: await RoomRepo.findRoomById(roomId),
      };
    }

    await RoomUserChatRepo.joinRoom(userId, roomId, UserChatRole.MEMBER);

    return {
      success: true,
      message: "Successfully joined room",
      room: await RoomRepo.findRoomById(roomId),
    };
  }

  /**
   * Leave a room
   */
  static async leaveRoom(roomId: string, userId: string) {
    // Check if user is a member
    const isMember = await RoomUserChatRepo.isMember(userId, roomId);
    if (!isMember) {
      return false;
    }

    // Check if user is the owner
    const isOwner = await RoomRepo.isUserRoomOwner(roomId, userId);
    if (isOwner) {
      return false; // Owners cannot leave their own rooms
    }

    await RoomUserChatRepo.leaveRoom(userId, roomId);
    return true;
  }

  static async findById(roomId: string) {
    return RoomRepo.findById(roomId);
  }

  /**
   * Helper to map a raw message to the structure expected by the frontend
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
    if (page < 1) {
      page = 1;
    }

    // Verify membership
    const isMember = await RoomUserChatRepo.isMember(userId, roomId);
    if (!isMember) {
      throw new Error(
        "Access denied: You must be a member of this room to view messages",
      );
    }

    const messages = await MessageRepo.getRoomMessages(roomId, page, limit);

    // Map all messages and sign URLs in parallel
    const response = await Promise.all(
      messages.map((msg: any) => this.mapMessageWithSignedUrl(msg)),
    );

    return response;
  }
}

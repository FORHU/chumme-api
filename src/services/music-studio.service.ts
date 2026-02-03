import { StudioRole } from "@prisma/client";
import MusicStudioRepo from "../repositories/music-studio.repository";
import MusicRecordRepo from "../repositories/music-record.repository";
import FileRepo from "../repositories/file.repository";
import S3Util from "../utils/s3.util";

interface CreateStudioInput {
  name: string;
  keyName?: string; // Optional - if not set, studio is public
  note?: string;
  ownerId: string;
}

interface SaveRecordingInput {
  studioId: string;
  musicId: string;
  userIds: string[];
  audioBuffer: Buffer;
  filename: string;
  mimetype: string;
}

export default class MusicStudioSvc {
  /**
   * Create a new music studio (karaoke room)
   * Owner is automatically added as PRODUCER
   * If keyName is not provided, studio is public
   */
  static async createStudio(data: CreateStudioInput) {
    // Check if keyName already exists (only if provided)
    if (data.keyName) {
      const existing = await MusicStudioRepo.findByKeyName(data.keyName);
      if (existing) {
        throw new Error("A studio with this key name already exists");
      }
    }

    const studio = await MusicStudioRepo.create(data);

    return {
      message: "Studio created successfully",
      data: studio,
    };
  }

  /**
   * Get studio by ID
   */
  static async getStudioById(id: string) {
    const studio = await MusicStudioRepo.findById(id);
    if (!studio) {
      throw new Error("Studio not found");
    }
    return { message: "Studio fetched successfully", data: studio };
  }

  /**
   * Get all studios with pagination
   */
  static async getAllStudios(page?: number, limit?: number) {
    const result = await MusicStudioRepo.findAll({ page, limit });
    return { message: "Studios fetched successfully", ...result };
  }

  /**
   * Get studios owned by a user
   */
  static async getStudiosByOwner(ownerId: string) {
    const studios = await MusicStudioRepo.findByOwnerId(ownerId);
    return { message: "Owner studios fetched successfully", data: studios };
  }

  /**
   * Get studios a user has joined
   */
  static async getStudiosByUser(userId: string) {
    const studios = await MusicStudioRepo.findByUserId(userId);
    return { message: "User studios fetched successfully", data: studios };
  }

  /**
   * Join a studio
   * keyName only required if studio has one set (private studio)
   * Default role is LISTENER
   */
  static async joinStudio(
    studioId: string,
    userId: string,
    keyName?: string,
    role: StudioRole = StudioRole.LISTENER,
  ) {
    const studio = await MusicStudioRepo.findById(studioId);

    if (!studio) {
      throw new Error("Studio not found");
    }

    if (studio.deletedAt) {
      throw new Error("Studio has been closed");
    }

    // Validate keyName only if studio has one (private studio)
    if (studio.keyName && studio.keyName !== keyName) {
      throw new Error("Invalid studio key");
    }

    // Check if already in studio
    const isInStudio = await MusicStudioRepo.isUserInStudio(studioId, userId);
    if (isInStudio) {
      const membership = await MusicStudioRepo.getMembership(studioId, userId);
      return { message: "Already in studio", data: studio, membership };
    }

    const membership = await MusicStudioRepo.addUser(studioId, userId, role);
    const updatedStudio = await MusicStudioRepo.findById(studioId);

    return {
      message: "Joined studio successfully",
      data: updatedStudio,
      membership,
    };
  }

  /**
   * Leave a studio
   */
  static async leaveStudio(studioId: string, userId: string) {
    const studio = await MusicStudioRepo.findById(studioId);

    if (!studio) {
      throw new Error("Studio not found");
    }

    const isInStudio = await MusicStudioRepo.isUserInStudio(studioId, userId);
    if (!isInStudio) {
      throw new Error("User is not in this studio");
    }

    await MusicStudioRepo.removeUser(studioId, userId);
    return { message: "Left studio successfully" };
  }

  /**
   * Update a member's role (owner only)
   */
  static async updateMemberRole(
    studioId: string,
    requesterId: string,
    targetUserId: string,
    newRole: StudioRole,
  ) {
    const studio = await MusicStudioRepo.findById(studioId);

    if (!studio) {
      throw new Error("Studio not found");
    }

    // Only owner or producers can change roles
    const isOwner = studio.ownerId === requesterId;
    const requesterMembership = await MusicStudioRepo.getMembership(
      studioId,
      requesterId,
    );

    if (!isOwner && requesterMembership?.role !== StudioRole.PRODUCER) {
      throw new Error("Only owner or producers can change roles");
    }

    const updated = await MusicStudioRepo.updateMemberRole(
      studioId,
      targetUserId,
      newRole,
    );

    return { message: "Role updated successfully", data: updated };
  }

  /**
   * Get users in a studio with their roles
   */
  static async getStudioUsers(studioId: string) {
    const users = await MusicStudioRepo.getStudioUsers(studioId);
    return { message: "Studio users fetched successfully", data: users };
  }

  /**
   * Check if user is studio owner
   */
  static async isOwner(studioId: string, userId: string) {
    const studio = await MusicStudioRepo.findById(studioId);
    return studio?.ownerId === userId;
  }

  /**
   * Check if user is a singer/producer (can record)
   */
  static async canRecord(studioId: string, userId: string) {
    const membership = await MusicStudioRepo.getMembership(studioId, userId);
    if (!membership || !membership.isActive) return false;
    return (
      membership.role === StudioRole.SINGER ||
      membership.role === StudioRole.PRODUCER
    );
  }

  /**
   * Save a recording and link it to the studio
   * Only singers and producers are credited
   */
  static async saveRecording(data: SaveRecordingInput) {
    const studio = await MusicStudioRepo.findById(data.studioId);
    if (!studio) {
      throw new Error("Studio not found");
    }

    // Upload audio to S3
    const fileUrl = await S3Util.uploadFile(
      data.audioBuffer,
      data.filename,
      data.mimetype,
    );

    // Create file record
    const fileRecord = await FileRepo.createFile({
      filename: data.filename,
      fileUrl: fileUrl,
    });

    // Get singers/producers for recording credits
    const singers = await MusicStudioRepo.getStudioSingers(data.studioId);
    const singerIds = singers.map((s) => s.id);

    // Create music record with singers as participants
    const musicRecord = await MusicRecordRepo.create({
      userIds: singerIds.length > 0 ? singerIds : data.userIds,
      musicId: data.musicId,
      fileId: fileRecord.id,
    });

    // Link the recording to the studio
    await MusicStudioRepo.linkMusicRecord(data.studioId, musicRecord.id);

    return {
      message: "Recording saved successfully",
      data: musicRecord,
    };
  }

  /**
   * Close/delete a studio (owner only)
   */
  static async closeStudio(studioId: string, userId: string) {
    const studio = await MusicStudioRepo.findById(studioId);

    if (!studio) {
      throw new Error("Studio not found");
    }

    if (studio.ownerId !== userId) {
      throw new Error("Only the owner can close the studio");
    }

    await MusicStudioRepo.delete(studioId);
    return { message: "Studio closed successfully" };
  }

  /**
   * Update studio details (owner only)
   */
  static async updateStudio(
    studioId: string,
    userId: string,
    data: { name?: string; note?: string },
  ) {
    const studio = await MusicStudioRepo.findById(studioId);

    if (!studio) {
      throw new Error("Studio not found");
    }

    if (studio.ownerId !== userId) {
      throw new Error("Only the owner can update the studio");
    }

    const updated = await MusicStudioRepo.update(studioId, data);
    return { message: "Studio updated successfully", data: updated };
  }
}

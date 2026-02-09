import { prisma } from "../utils/prisma";
import { StudioRole, StudioType, RelayMode } from "@prisma/client";
import MusicStudioRepo from "../repositories/music-studio.repository";
import MusicRecordRepo from "../repositories/music-record.repository";
import FileRepo from "../repositories/file.repository";
import MusicStudioCacheSvc from "./music-studio-cache.service";
import logger from "../utils/logger";
import S3Util from "../utils/s3.util";
import { S3_CDN_URL } from "../config";

interface CreateStudioInput {
  name: string;
  keyName?: string; // Optional - if not set, studio is public
  note?: string;
  studioType: StudioType;
  relayMode?: RelayMode;
  relayInterval?: number;
  ownerId: string;
}

interface SaveRecordingInput {
  studioId: string;
  musicId: string;
  fileUrl: string;
  filename: string;
  mimetype: string;
  size?: number;
  metaData?: any; // Session/Performance metadata
  performanceMapping?: {
    startLine: number;
    endLine: number;
    singerId: string;
    vocalRoleIndex?: number;
  }[];
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
   * Start recording in a studio
   */
  static async startRecording(studioId: string, userId: string) {
    const isOwner = await this.isOwner(studioId, userId);
    if (!isOwner) {
      throw new Error("Only the owner can start recording");
    }

    await MusicStudioCacheSvc.setStudioState(studioId, "RECORDING");

    const timestamp = new Date().toISOString();
    logger.info(`[MusicStudio] Recording started`, {
      studioId,
      userId,
      timestamp,
    });

    return {
      message: "Recording started",
      timestamp,
    };
  }

  /**
   * Stop recording in a studio
   */
  static async stopRecording(studioId: string, userId: string) {
    const isOwner = await this.isOwner(studioId, userId);
    if (!isOwner) {
      throw new Error("Only the owner can stop recording");
    }

    await MusicStudioCacheSvc.setStudioState(studioId, "IDLE");

    const timestamp = new Date().toISOString();
    logger.info(`[MusicStudio] Recording stopped`, {
      studioId,
      userId,
      timestamp,
    });

    return {
      message: "Recording stopped",
      timestamp,
    };
  }

  /**
   * Get all studios with pagination
   */
  static async getAllStudios(
    page?: number,
    limit?: number,
    studioType?: StudioType,
    isPrivate?: boolean,
  ) {
    const result = await MusicStudioRepo.findAll({
      page,
      limit,
      studioType,
      isPrivate,
    });
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

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Create file record using data provided by frontend (already uploaded)
        const fileRecord = await FileRepo.createFile(
          {
            filename: data.filename,
            fileUrl: data.fileUrl,
            metaData: {
              mimetype: data.mimetype,
              size: data.size || 0,
            },
          },
          tx,
        );

        // Get active singers and producers from studio membership
        const singerIds = studio.members
          .filter((m) => m.role === "SINGER" || m.role === "PRODUCER")
          .map((m) => m.userId);

        // Create music record linked to this studio with singer credits
        const musicRecord = await MusicRecordRepo.create(
          {
            studioId: data.studioId,
            musicId: data.musicId,
            fileId: fileRecord.id,
            singerIds,
            metaData: data.metaData,
          },
          tx,
        );

        // If performance mapping provided, create music parts for this record
        if (data.performanceMapping && data.performanceMapping.length > 0) {
          await tx.musicPart.createMany({
            data: data.performanceMapping.map((p, index) => ({
              recordId: musicRecord.id,
              startLine: p.startLine,
              endLine: p.endLine,
              singerId: p.singerId,
              vocalRoleIndex: p.vocalRoleIndex || 1,
              order: index,
            })),
          });
        }

        return musicRecord;
      });

      logger.info(`[MusicStudio] Recording saved: ${result.id}`, {
        studioId: data.studioId,
        musicId: data.musicId,
        userIds: result.singers?.map((s: any) => s.id),
      });

      return {
        message: "Recording saved successfully",
        data: result,
      };
    } catch (err: any) {
      logger.error(`[MusicStudio] Failed to save recording`, {
        error: err.message,
        studioId: data.studioId,
      });
      throw err;
    }
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

    // 1. Clear session data from cache (Wipe everything instantly)
    const MusicStudioCacheSvc = (await import("./music-studio-cache.service"))
      .default;
    await MusicStudioCacheSvc.clearStudioSession(studioId);

    // 2. Delete from DB
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

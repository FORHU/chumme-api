import { prisma } from "../utils/prisma";
import path from "path";
import os from "os";
import fs from "fs";
import { StudioRole, StudioType, RelayMode } from "@prisma/client";
import MusicStudioRepo from "../repositories/music-studio.repository";
import MusicRecordRepo from "../repositories/music-record.repository";
import TempMusicRecordRepo from "../repositories/temp-music-record.repository";
import MusicRepo from "../repositories/music.repository";
import FileRepo from "../repositories/file.repository";
import MusicStudioCacheSvc from "./music-studio-cache.service";
import logger from "../utils/logger";
import S3Util from "../utils/s3.util";
import {
  overlayAudioFiles,
  batchOverlayAudioFiles,
  concatenateAudioFiles,
  mixVocalsWithBacking,
  removeVocals,
} from "../utils/audio.utils";
import { publishMergeJob } from "../listeners/audio-merge.listener";
import type { AudioMergeJob } from "../listeners/audio-merge.listener";
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
  metaData?: any;
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

    const startTime = Date.now(); // Master start time in Unix milliseconds (UTC)
    await MusicStudioCacheSvc.setRecordingStartTime(studioId, startTime);

    const timestamp = new Date(startTime).toISOString();
    logger.info(`[MusicStudio] Recording started`, {
      studioId,
      userId,
      startTime,
    });

    return {
      message: "Recording started",
      timestamp,
    };
  }

  /**
   * Stop recording in a studio
   * Preview must be triggered manually via the preview-recording endpoint.
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
   * Generates or retrieves a vocal-removed instrumental version of a song.
   * Caches the result in S3 to avoid redundant FFmpeg processing.
   */
  static async getOrCreateInstrumental(musicId: string): Promise<string> {
    const music = await MusicRepo.findById(musicId);
    if (!music || !music.musicFile?.fileUrl) {
      throw new Error("Music file not found");
    }

    if (music.isKaraoke) {
      return music.musicFile.fileUrl;
    }

    const instrumentalKey = `instrumentals/instrumental_${musicId}.mp3`;
    const instrumentalUrl = `${S3_CDN_URL}/${instrumentalKey}`;

    // Check if we already processed this song
    const exists = await S3Util.fileExists(instrumentalKey);
    if (exists) {
      logger.info(`[MusicStudio] Using cached instrumental for ${musicId}`);
      return instrumentalUrl;
    }

    logger.info(
      `[MusicStudio] No cached instrumental for ${musicId}. Generating...`,
    );
    const instrumentalBuffer = await removeVocals(music.musicFile.fileUrl);

    // Upload to permanent instrumentals folder
    await S3Util.uploadFileWithKey(
      instrumentalBuffer,
      instrumentalKey,
      "audio/mpeg",
    );

    return instrumentalUrl;
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
   * Preview a recording: merge temp chunks and return a temporary S3 URL
   * Does NOT create a MusicRecord or delete temp data.
   * Only owner or producers can trigger this.
   */
  static async previewRecording(data: {
    studioId: string;
    musicId: string;
    userId: string;
  }) {
    const isAuthorized = await this.canRecord(data.studioId, data.userId);
    if (!isAuthorized) {
      throw new Error("Only owner or producers can trigger a preview");
    }

    const studio = await MusicStudioRepo.findById(data.studioId);
    if (!studio) {
      throw new Error("Studio not found");
    }

    const music = await MusicRepo.findById(data.musicId);
    if (!music || !music.musicFile?.fileUrl) {
      throw new Error("Backing track not found for this music");
    }

    const backingTrackUrl = music.musicFile.fileUrl;

    try {
      // 1. Fetch temp records for this music + studio combo
      const tempRecords = await TempMusicRecordRepo.findByMusicIdAndStudioId(
        data.musicId,
        data.studioId,
      );
      if (!tempRecords.length) {
        logger.info(
          `[MusicStudio] No temp records for preview: studio=${data.studioId}, music=${data.musicId}`,
        );
        throw new Error("No audio chunks found for this studio session");
      }
      logger.info(
        `[MusicStudio] Found ${tempRecords.length} temp records for studio=${data.studioId}`,
      );

      // 2. Fetch active members to filter out disconnected users
      const activeMembers = await MusicStudioCacheSvc.getMembers(data.studioId);
      const activeUserIds = new Set(activeMembers.map((m) => m.userId));

      const filteredRecords = tempRecords.filter((r) => {
        const userId = (r.metaData as any)?.userId;
        return userId && activeUserIds.has(userId);
      });

      if (!filteredRecords.length) {
        throw new Error("No audio chunks found from active studio members");
      }

      // 3. Collect S3 URLs
      const audioUrls = filteredRecords
        .map((r) => r.file?.fileUrl)
        .filter(Boolean) as string[];

      const offsets = filteredRecords.map((r) => r.startTimeOffset || 0);

      if (!audioUrls.length) {
        throw new Error("No audio files found in temp chunks");
      }

      // 4. Publish merge job to RabbitMQ (returns immediately)
      const jobId = `preview_${data.studioId}_${Date.now()}`;
      if (audioUrls.length === 0) {
        throw new Error(
          "No recording chunks found to preview. Please record something first.",
        );
      }

      const job: AudioMergeJob = {
        jobId,
        studioId: data.studioId,
        musicId: data.musicId,
        studioType: studio.studioType as "CROWDSINGING" | "RELAYSINGING",
        audioUrls,
        offsets,
        backingTrackUrl,
        jobType: "preview",
      };

      await publishMergeJob(job);

      const ioExists = !!(global as any).io;
      if (!ioExists) {
        logger.warn(
          `[MusicStudioSvc] WARN: global.io is NOT defined. Socket events will NOT be sent!`,
        );
      }

      logger.info(`[MusicStudio] Preview job published: ${jobId}`, {
        studioId: data.studioId,
        musicId: data.musicId,
        chunkCount: audioUrls.length,
      });

      const response = {
        message: "Preview is being generated. You will be notified when ready.",
        data: {
          jobId,
          status: "processing" as const,
          chunkCount: audioUrls.length,
        },
      };
      logger.info(`[MusicStudioSvc] previewRecording returning`, { response });
      return response;
    } catch (err: any) {
      logger.error(`[MusicStudio] Failed to generate preview`, {
        error: err.message,
        studioId: data.studioId,
      });
      throw err;
    }
  }

  /**
   * Save a recording: merge temp chunks, upload to S3, create MusicRecord
   *
   * Flow:
   * 1. Fetch TempMusicRecords by studioId
   * 2. Merge audio files with overlayAudioFiles (FFmpeg)
   * 3. Upload merged buffer to S3 (normal upload, not presigned)
   * 4. Create File record in DB
   * 5. Create MusicRecord with singer credits
   * 6. Delete TempMusicRecords by studioId
   * 7. Delete temp S3 files by URL
   * 8. Return the created MusicRecord + File
   */
  static async saveRecording(data: SaveRecordingInput) {
    const studio = await MusicStudioRepo.findById(data.studioId);
    if (!studio) {
      throw new Error("Studio not found");
    }

    const music = await MusicRepo.findById(data.musicId);
    if (!music || !music.musicFile?.fileUrl) {
      throw new Error("Backing track not found for this music");
    }

    const backingTrackUrl = music.musicFile.fileUrl;

    try {
      const tempRecords = await TempMusicRecordRepo.findByMusicIdAndStudioId(
        data.musicId,
        data.studioId,
      );
      if (!tempRecords.length) {
        logger.info(
          `[MusicStudio] No temp records for studio=${data.studioId}, music=${data.musicId}`,
        );
        throw new Error("No audio chunks found for this studio session");
      }
      logger.info(`[MusicStudio] Found ${tempRecords.length} temp records`);

      // 2. Fetch active members to filter out disconnected users
      const activeMembers = await MusicStudioCacheSvc.getMembers(data.studioId);
      const activeUserIds = new Set(activeMembers.map((m) => m.userId));

      const filteredRecords = tempRecords.filter((r) => {
        const userId = (r.metaData as any)?.userId;
        return userId && activeUserIds.has(userId);
      });

      if (!filteredRecords.length) {
        logger.info(
          `[MusicStudio] No chunks from active members in studio=${data.studioId}. Active IDs: ${Array.from(activeUserIds)}`,
        );
        throw new Error("No audio chunks found from active studio members");
      }
      logger.info(
        `[MusicStudio] Filtered to ${filteredRecords.length} records from active users`,
      );

      // 3. Collect S3 URLs and offsets
      const audioUrls = filteredRecords
        .map((r) => r.file?.fileUrl)
        .filter(Boolean) as string[];

      const offsets = filteredRecords.map((r) => r.startTimeOffset || 0);

      if (!audioUrls.length) {
        throw new Error("No audio files found in temp chunks");
      }

      // 4. Get singer IDs
      const singerIds = [
        ...new Set([
          ...filteredRecords
            .map((r) => (r.metaData as any)?.userId)
            .filter(Boolean),
          ...activeMembers
            .filter(
              (m) =>
                (m.role === "SINGER" || m.role === "PRODUCER") &&
                m.isConnected === true,
            )
            .map((m) => m.userId),
        ]),
      ] as string[];

      // 5. Publish save job to RabbitMQ (returns immediately)
      const jobId = `save_${data.studioId}_${Date.now()}`;
      const job: AudioMergeJob = {
        jobId,
        studioId: data.studioId,
        musicId: data.musicId,
        studioType: studio.studioType as "CROWDSINGING" | "RELAYSINGING",
        audioUrls,
        offsets,
        backingTrackUrl,
        jobType: "save",
        singerIds,
        performanceMapping: data.performanceMapping,
        metaData: data.metaData,
      };

      await publishMergeJob(job);

      logger.info(`[MusicStudio] Save job published: ${jobId}`, {
        studioId: data.studioId,
        musicId: data.musicId,
        singerIds,
        chunkCount: audioUrls.length,
      });

      const response = {
        message:
          "Recording is being saved. You will be notified when complete.",
        data: {
          jobId,
          status: "processing" as const,
          chunkCount: audioUrls.length,
        },
      };
      logger.info(`[MusicStudioSvc] saveRecording returning`, { response });
      return response;
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

    // 2. Fetch temporary records to clean up S3
    const tempRecords = await TempMusicRecordRepo.findByStudioId(studioId);
    const musicIds = new Set(tempRecords.map((r) => r.musicId));

    // 3. Delete raw chunks from S3
    for (const record of tempRecords) {
      if (record.file?.fileUrl) {
        try {
          await S3Util.deleteFile(record.file.fileUrl);
        } catch (e) {
          logger.warn(
            `[MusicStudio] Failed to delete chunk on studio close: ${record.file.fileUrl}`,
          );
        }
      }
    }

    // 4. Delete preview files for each musicId from S3
    for (const musicId of musicIds) {
      try {
        const previewKey = `previews/preview_${studioId}_${musicId}.mp3`;
        const previewUrl = `${S3_CDN_URL}/${previewKey}`;
        await S3Util.deleteFile(previewUrl);
      } catch (e) {
        // Silently fail if preview doesn't exist
      }
    }

    // 5. Delete temporary records from DB
    await TempMusicRecordRepo.deleteByStudioId(studioId);

    // 6. Delete studio from DB
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

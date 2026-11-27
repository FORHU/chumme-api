import MusicRecordRepo from "../repositories/music-record.repository";
import MusicLibraryRepo from "../repositories/music-library.repository";
import MusicStudioSvc from "./music-studio.service";
import S3Util from "../utils/s3.util";
import { ForbiddenError, NotFoundError } from "../utils/error.util";
import {
  Viewer,
  canDeleteRecord,
  canManageFileKey,
  canViewRecord,
  isStaff,
  recordVisibility,
} from "./music-access.service";

interface CreateMusicRecordInput {
  studioId: string;
  musicId: string;
  fileId?: string;
  file?: {
    filename?: string;
    fileUrl?: string;
    metaData?: any;
  };
  singerIds?: string[];
  metaData?: any;
}

const keyOf = (fileUrl?: string | null) =>
  fileUrl ? S3Util.getKeyFromUrl(fileUrl) : undefined;

export default class MusicRecordSvc {
  /**
   * Create a new music recording (karaoke recording)
   *
   * Same gate as save-recording: only the room's host may file a recording in
   * it, and only from audio they uploaded. Otherwise anyone could drop a
   * recording into someone else's room, or wrap another user's file in a
   * record they can then read.
   */
  static async create(data: CreateMusicRecordInput, viewer: Viewer) {
    if (
      !isStaff(viewer) &&
      !(await MusicStudioSvc.isHost(data.studioId, viewer.id))
    ) {
      throw new ForbiddenError(
        "Only the room owner or a producer can save a recording in this room",
      );
    }

    let finalFileId = data.fileId;

    if (finalFileId) {
      const existing = await MusicLibraryRepo.findById(finalFileId);
      if (!existing) throw new NotFoundError("Music library record not found");
      if (!canManageFileKey(keyOf(existing.fileUrl), viewer)) {
        throw new ForbiddenError("You can only use audio you uploaded");
      }
    }

    // If file details are provided directly, create the MusicLibrary record first
    if (!finalFileId && data.file) {
      if (!canManageFileKey(keyOf(data.file.fileUrl), viewer)) {
        throw new ForbiddenError("You can only use audio you uploaded");
      }
      const newFile = await MusicLibraryRepo.create({
        filename: data.file.filename,
        fileUrl: data.file.fileUrl,
        metaData: data.file.metaData,
        fileType: "RECORDING",
      });
      finalFileId = newFile.id;
    }

    if (!finalFileId) {
      throw new Error("fileId or file details are required");
    }

    const record = await MusicRecordRepo.create({
      ...data,
      fileId: finalFileId,
    });
    return { message: "Music record created successfully", data: record };
  }

  /**
   * A live record the viewer may see. Soft-deleted ones 404 like missing ones.
   */
  private static async findVisible(id: string, viewer: Viewer) {
    const record = await MusicRecordRepo.findById(id);
    if (!record || record.deletedAt) {
      throw new NotFoundError("Music record not found");
    }
    if (!canViewRecord(record, viewer)) {
      throw new ForbiddenError("You can only open your own recordings");
    }
    return record;
  }

  /**
   * Get a music record by ID with pre-signed URL
   */
  static async getById(id: string, viewer: Viewer) {
    const record = await this.findVisible(id, viewer);
    return { message: "Music record fetched successfully", data: record };
  }

  /**
   * The viewer's recordings (everyone's, for staff), with pagination
   */
  static async getAll(viewer: Viewer, page?: number, limit?: number) {
    const result = await MusicRecordRepo.findAll({
      page,
      limit,
      visibleTo: recordVisibility(viewer),
    });
    return { message: "Music records fetched successfully", ...result };
  }

  /**
   * The viewer's recordings made in a specific studio. The studio's owner
   * sees every recording made in it.
   */
  static async getByStudioId(
    studioId: string,
    viewer: Viewer,
    page?: number,
    limit?: number,
  ) {
    const result = await MusicRecordRepo.findByStudioId(studioId, {
      page,
      limit,
      visibleTo: recordVisibility(viewer),
    });
    return {
      message: "Studio's music records fetched successfully",
      ...result,
    };
  }

  /**
   * The viewer's recordings of a specific song
   */
  static async getByMusicId(
    musicId: string,
    viewer: Viewer,
    page?: number,
    limit?: number,
  ) {
    const result = await MusicRecordRepo.findByMusicId(musicId, {
      page,
      limit,
      visibleTo: recordVisibility(viewer),
    });
    return {
      message: "Music recordings fetched successfully",
      ...result,
    };
  }

  /**
   * Delete a music record (soft delete). Only someone who sang on it (or
   * staff); the room owner can see it but not remove a singer's take.
   * Note: S3 files are intentionally kept for potential recovery
   */
  static async delete(id: string, viewer: Viewer) {
    const existing = await MusicRecordRepo.findById(id);
    if (!existing || existing.deletedAt) {
      throw new NotFoundError("Music record not found");
    }
    if (!canDeleteRecord(existing, viewer)) {
      throw new ForbiddenError("You can only delete recordings you sang on");
    }

    // Soft-delete the MusicRecord (sets deletedAt)
    await MusicRecordRepo.delete(id);
    return { message: "Music record deleted successfully" };
  }

  /**
   * Get all recordings of a specific user. Only that user (or staff) may ask:
   * recordings are private until there is a way to publish one.
   */
  static async getByUserId(
    userId: string,
    viewer: Viewer,
    page?: number,
    limit?: number,
  ) {
    if (userId !== viewer.id && !isStaff(viewer)) {
      throw new ForbiddenError("You can only list your own recordings");
    }
    const result = await MusicRecordRepo.findByUserId(userId, {
      page,
      limit,
    });
    return {
      message: "User's music records fetched successfully",
      ...result,
    };
  }
}

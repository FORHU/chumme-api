import MusicRecordRepo from "../repositories/music-record.repository";
import FileRepo from "../repositories/file.repository";

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

export default class MusicRecordSvc {
  /**
   * Create a new music recording (karaoke recording)
   */
  static async create(data: CreateMusicRecordInput) {
    let finalFileId = data.fileId;

    // If file details are provided directly, create the File record first
    if (!finalFileId && data.file) {
      const newFile = await FileRepo.createFile({
        filename: data.file.filename,
        fileUrl: data.file.fileUrl,
        metaData: data.file.metaData,
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
   * Get a music record by ID with pre-signed URL
   */
  static async getById(id: string) {
    const record = await MusicRecordRepo.findById(id);
    if (!record) {
      throw new Error("Music record not found");
    }

    return { message: "Music record fetched successfully", data: record };
  }

  /**
   * Get all music records with pagination
   */
  static async getAll(page?: number, limit?: number) {
    const result = await MusicRecordRepo.findAll({ page, limit });
    return { message: "Music records fetched successfully", ...result };
  }

  /**
   * Get all music records by a specific studio
   */
  static async getByStudioId(studioId: string, page?: number, limit?: number) {
    const result = await MusicRecordRepo.findByStudioId(studioId, {
      page,
      limit,
    });
    return {
      message: "Studio's music records fetched successfully",
      ...result,
    };
  }

  /**
   * Get all recordings of a specific song
   */
  static async getByMusicId(musicId: string, page?: number, limit?: number) {
    const result = await MusicRecordRepo.findByMusicId(musicId, {
      page,
      limit,
    });
    return {
      message: "Music recordings fetched successfully",
      ...result,
    };
  }

  /**
   * Delete a music record (soft delete)
   */
  static async delete(id: string) {
    const existing = await MusicRecordRepo.findById(id);
    if (!existing) {
      throw new Error("Music record not found");
    }
    await MusicRecordRepo.delete(id);
    return { message: "Music record deleted successfully" };
  }

  /**
   * Get all recordings of a specific user
   */
  static async getByUserId(userId: string, page?: number, limit?: number) {
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

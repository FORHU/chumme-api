import MusicRecordRepo from "../repositories/music-record.repository";

interface CreateMusicRecordInput {
  studioId: string;
  musicId: string;
  fileId: string;
}

export default class MusicRecordSvc {
  /**
   * Create a new music recording (karaoke recording)
   */
  static async create(data: CreateMusicRecordInput) {
    if (!data.studioId || !data.musicId || !data.fileId) {
      throw new Error("studioId, musicId, and fileId are required");
    }

    const record = await MusicRecordRepo.create(data);
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
}

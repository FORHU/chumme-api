import TempMusicRecordRepo from "../repositories/temp-music-record.repository";

export default class TempMusicRecordSvc {
  /**
   * Save a temporary chunk record
   */
  static async saveChunk(data: {
    fileId: string;
    studioId: string;
    userId: string;
    musicId: string;
    order?: number;
    startTimeOffset?: number;
    metaData?: any;
    recordDuration?: number;
  }) {
    const metaData = {
      ...data.metaData,
      userId: data.userId,
    };

    return TempMusicRecordRepo.create({
      fileId: data.fileId,
      studioId: data.studioId,
      musicId: data.musicId,
      order: data.order,
      startTimeOffset: data.startTimeOffset,
      metaData,
      recordDuration: data.recordDuration,
    });
  }

  /**
   * Get all chunks for a studio's current session
   */
  static async getChunksByStudio(studioId: string) {
    return TempMusicRecordRepo.findByStudioId(studioId);
  }

  /**
   * Get chunks for a specific music + studio combo
   */
  static async getChunksByMusicAndStudio(musicId: string, studioId: string) {
    return TempMusicRecordRepo.findByMusicIdAndStudioId(musicId, studioId);
  }

  /**
   * Delete all chunks for a studio (cleanup after merging)
   */
  static async deleteChunksByStudio(studioId: string) {
    return TempMusicRecordRepo.deleteByStudioId(studioId);
  }

  /**
   * Delete chunks for a specific music + studio combo
   */
  static async deleteChunksByMusicAndStudio(musicId: string, studioId: string) {
    return TempMusicRecordRepo.deleteByMusicIdAndStudioId(musicId, studioId);
  }
}

import MusicTempRecordRepo from "../repositories/music-temp-record.repository";

export default class MusicTempRecordSvc {
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

    const record = await MusicTempRecordRepo.create({
      fileId: data.fileId,
      studioId: data.studioId,
      musicId: data.musicId,
      order: data.order,
      startTimeOffset: data.startTimeOffset,
      metaData,
      recordDuration: data.recordDuration,
    });

    return record;
  }

  /**
   * Get all chunks for a studio's current session
   */
  static async getChunksByStudio(studioId: string) {
    return MusicTempRecordRepo.findByStudioId(studioId);
  }

  /**
   * Get chunks for a specific music + studio combo
   */
  static async getChunksByMusicAndStudio(musicId: string, studioId: string) {
    return MusicTempRecordRepo.findByMusicIdAndStudioId(musicId, studioId);
  }

  /**
   * Delete all chunks for a studio (cleanup after merging)
   */
  static async deleteChunksByStudio(studioId: string) {
    return MusicTempRecordRepo.deleteByStudioId(studioId);
  }

  /**
   * Delete chunks for a specific music + studio combo
   */
  static async deleteChunksByMusicAndStudio(musicId: string, studioId: string) {
    return MusicTempRecordRepo.deleteByMusicIdAndStudioId(musicId, studioId);
  }

  /**
   * Get the chunks for one uploaded take
   */
  static async getChunksByFile(
    studioId: string,
    musicId: string,
    fileId: string,
  ) {
    return MusicTempRecordRepo.findByFileId(studioId, musicId, fileId);
  }

  /**
   * Delete the chunks for one uploaded take
   */
  static async deleteChunksByFile(
    studioId: string,
    musicId: string,
    fileId: string,
  ) {
    return MusicTempRecordRepo.deleteByFileId(studioId, musicId, fileId);
  }
}

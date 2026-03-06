import fs from "fs";
import path from "path";
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

    // Harvest raw metadata for testing
    try {
      const harvestFile = path.join(process.cwd(), "raw_chunks_harvest.json");
      const entry = {
        timestamp: new Date().toISOString(),
        studioId: data.studioId,
        musicId: data.musicId,
        userId: data.userId,
        fileUrl: record.file.fileUrl,
        cdn_url: record.file.fileUrl,
        offset: data.startTimeOffset,
        duration: data.recordDuration,
      };
      let list = [];
      if (fs.existsSync(harvestFile)) {
        list = JSON.parse(fs.readFileSync(harvestFile, "utf-8"));
      }
      list.push(entry);
      fs.writeFileSync(harvestFile, JSON.stringify(list, null, 2));
    } catch (e) {
      // Don't block the main flow if harvesting fails
    }

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
}

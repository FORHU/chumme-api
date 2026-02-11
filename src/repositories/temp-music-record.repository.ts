import { prisma } from "../utils/prisma";

export default class TempMusicRecordRepo {
  /**
   * Create a new temporary music record (chunk)
   */
  static async create(data: {
    fileId: string;
    studioId: string;
    musicId: string;
    order?: number;
    startTimeOffset?: number;
    metaData?: any;
    recordDuration?: number;
  }) {
    return prisma.tempMusicRecord.create({
      data: {
        fileId: data.fileId,
        studioId: data.studioId,
        musicId: data.musicId,
        order: data.order,
        startTimeOffset: data.startTimeOffset,
        metaData: data.metaData,
        recordDuration: data.recordDuration,
      },
      include: {
        file: true,
      },
    });
  }

  /**
   * Find temporary records by Studio ID
   */
  static async findByStudioId(studioId: string) {
    return prisma.tempMusicRecord.findMany({
      where: { studioId },
      include: {
        file: true,
      },
      orderBy: { order: "asc" }, // Order by the explicit order field or default to time
    });
  }

  /**
   * Find temporary records by Music ID and Studio ID
   */
  static async findByMusicIdAndStudioId(musicId: string, studioId: string) {
    return prisma.tempMusicRecord.findMany({
      where: { musicId, studioId },
      include: {
        file: true,
      },
      orderBy: { order: "asc" },
    });
  }

  /**
   * Delete all temporary records by Studio ID
   */
  static async deleteByStudioId(studioId: string) {
    return prisma.tempMusicRecord.deleteMany({
      where: { studioId },
    });
  }

  /**
   * Delete all temporary records by Music ID and Studio ID
   */
  static async deleteByMusicIdAndStudioId(musicId: string, studioId: string) {
    return prisma.tempMusicRecord.deleteMany({
      where: { musicId, studioId },
    });
  }
}

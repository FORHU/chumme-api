import MusicLibraryRepo from "../repositories/music-library.repository";
import S3Util from "../utils/s3.util";
import FileSvc from "./file.service";

export default class MusicLibrarySvc {
  /**
   * Save a music library record (track or recording)
   */
  static async saveMusicFile(data: { filename?: string; fileUrl?: string }) {
    if (!data.fileUrl && !data.filename) {
      throw new Error(
        "Either fileUrl or filename is required to save a music library record.",
      );
    }

    const musicFile = await MusicLibraryRepo.create({
      filename: data.filename ?? null,
      fileUrl: FileSvc.sanitizeUrl(data.fileUrl),
    });

    return musicFile;
  }

  /**
   * Upload music file to S3 and save library record
   */
  static async uploadMusicFile(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    metaData?: any,
  ) {
    const fileUrl = await S3Util.uploadFile(fileBuffer, filename, mimeType);

    const musicFile = await MusicLibraryRepo.create({
      filename: filename,
      fileUrl: FileSvc.sanitizeUrl(fileUrl),
      metaData: metaData,
    });

    return musicFile;
  }

  /**
   * Find music library record by ID
   */
  static async getMusicFileById(id: string) {
    const musicFile = await MusicLibraryRepo.findById(id);
    if (!musicFile) {
      throw new Error("Music library record not found");
    }
    return musicFile;
  }

  /**
   * Delete music library record and S3 file
   */
  static async deleteMusicFile(id: string) {
    const musicFile = await MusicLibraryRepo.findById(id);
    if (!musicFile) {
      throw new Error("Music library record not found");
    }

    if (musicFile.fileUrl) {
      await S3Util.deleteFile(musicFile.fileUrl);
    }

    await MusicLibraryRepo.delete(id);
    return { message: "Music library record deleted successfully" };
  }
}

import FileRepo from "../repositories/file.repository";
import S3Util from "../utils/s3.util";
import FileSvc from "./file.service";

export default class VideoLibrarySvc {
  /**
   * Upload video file to S3 and save File record
   */
  static async uploadVideoFile(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    metaData?: any,
  ) {
    const fileUrl = await S3Util.uploadFile(fileBuffer, filename, mimeType);

    const file = await FileRepo.createFile({
      filename: filename,
      fileUrl: FileSvc.sanitizeUrl(fileUrl),
      metaData: metaData,
    });

    return file;
  }

  /**
   * Find file by ID
   */
  static async getVideoFileById(id: string) {
    const file = await FileRepo.findFileById(id);
    if (!file) {
      throw new Error("Video file record not found");
    }
    return file;
  }
}

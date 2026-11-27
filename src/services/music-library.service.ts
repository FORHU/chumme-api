import crypto from "crypto";
import MusicLibraryRepo from "../repositories/music-library.repository";
import S3PresignedUtil from "../utils/s3-presigned.util";
import S3Util from "../utils/s3.util";
import { ForbiddenError, NotFoundError } from "../utils/error.util";
import FileSvc from "./file.service";
import { Viewer, canManageFileKey } from "./music-access.service";

export default class MusicLibrarySvc {
  /**
   * Save a music library record (track or recording)
   */
  static async saveMusicFile(data: {
    filename?: string;
    fileUrl?: string;
    fileType?: any;
  }) {
    if (!data.fileUrl && !data.filename) {
      throw new Error(
        "Either fileUrl or filename is required to save a music library record.",
      );
    }

    const musicFile = await MusicLibraryRepo.create({
      filename: data.filename ?? null,
      fileUrl: FileSvc.sanitizeUrl(data.fileUrl),
      fileType: data.fileType,
    });

    return musicFile;
  }

  /**
   * Upload music file to S3 and save library record
   *
   * Keyed `uploads/<userId>/…` like a presigned upload, because the key is
   * the only record of who uploaded the file (see music-access).
   */
  static async uploadMusicFile(
    userId: string,
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    metaData?: any,
    fileType?: any,
  ) {
    const extension =
      (filename.split(".").pop() || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 8) || "bin";
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
    const fileUrl = await S3Util.uploadFileWithKey(
      fileBuffer,
      `uploads/${userId}/${unique}.${extension}`,
      mimeType,
    );

    const musicFile = await MusicLibraryRepo.create({
      filename: filename,
      fileUrl: FileSvc.sanitizeUrl(fileUrl),
      metaData: metaData,
      fileType: fileType,
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
   * Delete music library record and S3 file. Only the uploader, or staff.
   *
   * The row goes first: if a song or recording still points at it the delete
   * fails on the foreign key, and the S3 object must survive that.
   */
  static async deleteMusicFile(id: string, viewer: Viewer) {
    const musicFile = await MusicLibraryRepo.findById(id);
    if (!musicFile) {
      throw new NotFoundError("Music library record not found");
    }

    // The same key is checked and deleted, so the two cannot disagree.
    const key = musicFile.fileUrl
      ? S3Util.getKeyFromUrl(musicFile.fileUrl)
      : undefined;
    if (!canManageFileKey(key, viewer)) {
      throw new ForbiddenError("You can only delete files you uploaded");
    }

    await MusicLibraryRepo.delete(id);
    if (key) {
      await S3Util.deleteFileByKey(key);
    }
    return { message: "Music library record deleted successfully" };
  }

  /**
   * Get an upload pre-signed URL for MusicLibrary
   */
  static async getUploadUrl(
    key: string,
    contentType: string,
    contentLength?: number,
  ) {
    const response = await S3PresignedUtil.getUploadUrl(
      key,
      contentType,
      contentLength,
    );
    return { message: "Music Library Upload Registered", data: response };
  }

  /**
   * Get a download pre-signed URL for MusicLibrary. Only for a key the caller
   * uploaded (or any key, for staff): this used to sign whatever key it was
   * given, which opened the whole bucket. Songs in the catalogue don't need
   * it; their fileUrl is already a public CDN link.
   */
  static async getDownloadUrl(key: string, viewer: Viewer) {
    if (!canManageFileKey(key, viewer)) {
      throw new ForbiddenError("You can only download files you uploaded");
    }
    const response = await S3PresignedUtil.getDownloadUrl(key);
    return { message: "Music Library Download Registered", data: response };
  }
}

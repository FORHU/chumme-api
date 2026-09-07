import FileRepo from "../repositories/file.repository";
import S3PresignedUtil from "../utils/s3-presigned.util";
import S3Util from "../utils/s3.util";

export default class FileSvc {
  /**
   * Proactively clean up malformed URLs (typos in envs, trailing dots, etc)
   */
  static sanitizeUrl(url?: string | null): string | null {
    if (!url) return null;

    let sanitized = url.trim();

    // 1. Ensure protocol
    if (
      !sanitized.startsWith("http://") &&
      !sanitized.startsWith("https://") &&
      !sanitized.startsWith("file://")
    ) {
      sanitized = `https://${sanitized}`;
    }

    // 2. Fix the specific 'cloudfront.netr' typo reported by user
    sanitized = sanitized.replace(/cloudfront\.netr\//i, "cloudfront.net/");

    // 3. Remove trailing dots (FFmpeg/Android incompatible)
    sanitized = sanitized.replace(/\.+$/, "");

    try {
      sanitized = encodeURI(decodeURI(sanitized));
    } catch (e) {
      try {
        sanitized = encodeURI(sanitized);
      } catch (err) {
        console.warn(`[FileSvc] Failed to encode URL: ${sanitized}`, err);
      }
    }

    return sanitized;
  }

  static async saveFile(data: { filename?: string; fileUrl?: string }) {
    if (!data.fileUrl && !data.filename) {
      throw new Error(
        "Either fileUrl or filename is required to save a file record.",
      );
    }

    const file = await FileRepo.createFile({
      filename: data.filename ?? null,
      fileUrl: this.sanitizeUrl(data.fileUrl),
    });

    return file;
  }

  static async upsertFile(data: {
    id: string;
    filename?: string;
    fileUrl?: string;
  }) {
    if (!data.fileUrl && !data.filename) {
      throw new Error(
        "Either fileUrl or filename is required to upsert a file record.",
      );
    }

    if (!data.id) {
      throw new Error(
        "id is required for upsert. Use POST /api/file to create with auto-generated ID.",
      );
    }

    const result = await FileRepo.upsertFile(data.id, {
      filename: data.filename ?? null,
      fileUrl: this.sanitizeUrl(data.fileUrl),
    });

    return result; // { file, isUpdate }
  }

  static async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    metaData?: any,
  ) {
    const fileUrl = await S3Util.uploadFile(fileBuffer, filename, mimeType);

    const file = await FileRepo.createFile({
      filename: filename,
      fileUrl: this.sanitizeUrl(fileUrl),
      metaData: metaData,
    });
    return file;
  }

  static async getFileById(fileId: string) {
    const file = await FileRepo.findFileById(fileId);

    if (!file) {
      throw new Error("File not found");
    }

    return this.signFileUrl(file);
  }

  static async getAllFiles() {
    const files = await FileRepo.findAll();
    return Promise.all(files.map((file) => this.signFileUrl(file)));
  }

  static async signFileUrl(file: any) {
    if (file && file.fileUrl) {
      const key = S3Util.getKeyFromUrl(file.fileUrl);
      if (key) {
        try {
          const signedUrl = await S3PresignedUtil.getDownloadUrl(key);
          return { ...file, fileUrl: signedUrl };
        } catch (err) {
          console.error(`Error signing URL for file ${file.id}:`, err);
        }
      }
    }
    return file;
  }

  static async deleteFile(fileId: string) {
    const file = await FileRepo.findFileById(fileId);

    if (!file) {
      throw new Error("File not found");
    }

    if (file.fileUrl) {
      await S3Util.deleteFile(file.fileUrl);
    }

    await FileRepo.deleteFile(fileId);

    return { message: "File deleted successfully" };
  }

  static async getUploadUrl(key: string, contentType: string) {
    const response = await S3PresignedUtil.getUploadUrl(key, contentType);
    return { message: "File Uploaded Successfully", data: response };
  }

  static async getDownloadUrl(key: string) {
    const response = await S3PresignedUtil.getDownloadUrl(key);
    return { message: "File Downloaded Successfully", data: response };
  }

  static async getDownloadUrlById(id: string) {
    const file = await this.getFileById(id);
    if (!file || !file.fileUrl) {
      throw new Error("File has no URL");
    }

    const key = S3Util.getKeyFromUrl(file.fileUrl);
    if (!key) {
      throw new Error("Could not extract S3 key from file URL");
    }

    return this.getDownloadUrl(key);
  }
}

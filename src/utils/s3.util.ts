import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import {
  S3_CDN_URL,
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_S3_BUCKET_NAME,
} from "../config";
import crypto from "crypto";
import logger from "./logger";

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

export default class S3Util {
  /**
   * Upload file to S3
   * @param file - File buffer
   * @param filename - Original filename
   * @param mimeType - File MIME type
   * @returns S3 URL
   */
  static async uploadFile(
    file: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string> {
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(8).toString("hex");
    const extension = filename.split(".").pop();
    const key = `uploads/${timestamp}-${randomStr}.${extension}`;

    return this.uploadFileWithKey(file, key, mimeType);
  }

  /**
   * Upload file to S3 with a specific key (useful for overwriting)
   */
  static async uploadFileWithKey(
    file: Buffer,
    key: string,
    mimeType: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: mimeType,
    });

    await s3Client.send(command);

    let baseUrl = S3_CDN_URL;
    if (
      baseUrl &&
      !baseUrl.startsWith("http://") &&
      !baseUrl.startsWith("https://")
    ) {
      baseUrl = `https://${baseUrl}`;
    }

    return `${baseUrl}/${key}`;
  }

  /**
   * Delete file from S3
   * @param fileUrl - Full S3 URL
   */
  static async deleteFile(fileUrl: string): Promise<void> {
    // Correctly parse the key from any S3 or Cloudfront URL
    // 1. Try splitting by .com/ (Standard S3)
    // 2. Try splitting by .net/ (Cloudfront)
    // 3. Fallback to extracting everything after the first slash if protocol is present
    let key: string | undefined;
    if (fileUrl.includes(".com/")) {
      key = fileUrl.split(".com/")[1];
    } else if (fileUrl.includes(".net/")) {
      key = fileUrl.split(".net/")[1];
    } else {
      // Try to find the first single slash after http(s)://
      const matches = fileUrl.match(/^https?:\/\/[^\/]+\/(.+)$/);
      if (matches) {
        key = matches[1];
      }
    }

    if (!key) {
      logger.warn(`[S3] Could not parse key from URL: ${fileUrl}`);
      return; // Skip deletion instead of throwing to prevent crashing the flow
    }

    const command = new DeleteObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    logger.info(`[S3] Deleted: ${key}`);
  }

  /**
   * Delete file from S3 by Key
   * @param key - S3 Key
   */
  static async deleteFileByKey(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    logger.info(`[S3] Deleted: ${key}`);
  }

  /**
   * Check if file exists in S3
   * @param key - S3 Key
   */
  static async fileExists(key: string): Promise<boolean> {
    try {
      const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
      const command = new HeadObjectCommand({
        Bucket: AWS_S3_BUCKET_NAME,
        Key: key,
      });
      await s3Client.send(command);
      return true;
    } catch (err: any) {
      if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }
}

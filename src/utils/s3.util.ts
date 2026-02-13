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
    const key = fileUrl.split(".com/")[1];

    if (!key) {
      throw new Error("Invalid S3 URL format");
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

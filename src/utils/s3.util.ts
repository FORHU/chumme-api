import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
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
   * @param file - File buffer, stream, or string
   * @param filename - Original filename
   * @param mimeType - File MIME type
   * @returns S3 URL
   */
  static async uploadFile(
    file: Buffer | Readable | string,
    filename: string,
    mimeType: string,
  ): Promise<string> {
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(8).toString("hex");
    const extension = filename.split(".").pop();
    const key = `uploads/${timestamp}-${randomStr}.${extension}`;

    logger.info(`[S3] Uploading file: ${key}`);
    return this.uploadFileWithKey(file, key, mimeType);
  }

  /**
   * Upload file to S3 with a specific key (useful for overwriting)
   */
  static async uploadFileWithKey(
    file: Buffer | Readable | string,
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
    logger.info(`[S3] Uploaded successfully: ${key}`);

    let baseUrl = S3_CDN_URL;
    if (
      baseUrl &&
      !baseUrl.startsWith("http://") &&
      !baseUrl.startsWith("https://")
    ) {
      baseUrl = `https://${baseUrl}`;
    }

    return this.sanitizeUrl(`${baseUrl}/${key}`);
  }

  /**
   * Clean up URLs from potential environment mistakes (e.g. cloudfront.netr typo)
   */
  private static sanitizeUrl(url: string | undefined): string {
    if (!url) return "";

    // Fix the cloudfront.netr typo and remove trailing dots
    let cleanUrl = url
      .replace(/cloudfront\.netr/i, "cloudfront.net")
      .replace(/\.+$/, "");

    // Ensure it starts with https:// if it has a domain
    if (
      cleanUrl &&
      !cleanUrl.startsWith("http://") &&
      !cleanUrl.startsWith("https://") &&
      !cleanUrl.startsWith("/")
    ) {
      cleanUrl = `https://${cleanUrl}`;
    }

    return cleanUrl;
  }

  /**
   * Delete file from S3
   * @param fileUrl - Full S3 URL
   */
  static async deleteFile(fileUrl: string): Promise<void> {
    const key = this.getKeyFromUrl(fileUrl);

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
   * Get file from S3
   * @param fileUrl - Full S3 URL
   * @returns Buffer
   */
  static async getFile(fileUrl: string): Promise<Buffer> {
    const key = this.getKeyFromUrl(fileUrl);
    if (!key) {
      throw new Error(`Could not parse S3 key from URL: ${fileUrl}`);
    }

    const command = new GetObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error(`Empty response body for S3 key: ${key}`);
    }

    const streamToBuffer = async (stream: any): Promise<Buffer> => {
      const chunks: any[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    };

    return streamToBuffer(response.Body);
  }

  /**
   * Extracts the S3 Key from a URL
   */
  public static getKeyFromUrl(fileUrl: string): string | undefined {
    let key: string | undefined;

    try {
      const url = new URL(fileUrl);
      let path = url.pathname;
      if (path.startsWith("/")) {
        path = path.substring(1);
      }

      // If the path starts with the bucket name, it's path-style
      if (path.startsWith(`${AWS_S3_BUCKET_NAME}/`)) {
        key = path.substring(AWS_S3_BUCKET_NAME.length + 1);
      } else {
        key = path;
      }
    } catch (e) {
      // Fallback logic if URL parsing fails
      if (fileUrl.includes(".com/")) {
        key = fileUrl.split(".com/")[1];
      } else if (fileUrl.includes(".net/")) {
        key = fileUrl.split(".net/")[1];
      } else {
        // Try to find the first single slash after http(s)://
        const matches = fileUrl.match(/^https?:\/\/[^/]+\/(.+)$/);
        if (matches) {
          key = matches[1];
        }
      }

      // Double check for bucket name in fallback results
      if (key && key.startsWith(`${AWS_S3_BUCKET_NAME}/`)) {
        key = key.substring(AWS_S3_BUCKET_NAME.length + 1);
      }
    }

    return key;
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

  /**
   * Delete all files from S3 matching a given prefix.
   * Useful for cleaning up timestamped files (e.g. old preview versions).
   * @param prefix - S3 key prefix to match
   */
  static async deleteByPrefix(prefix: string): Promise<number> {
    const listCommand = new ListObjectsV2Command({
      Bucket: AWS_S3_BUCKET_NAME,
      Prefix: prefix,
    });

    const response = await s3Client.send(listCommand);
    const objects = response.Contents || [];

    if (objects.length === 0) return 0;

    let deleted = 0;
    for (const obj of objects) {
      if (obj.Key) {
        try {
          await this.deleteFileByKey(obj.Key);
          deleted++;
        } catch (e) {
          logger.warn(`[S3] Failed to delete ${obj.Key}: ${e}`);
        }
      }
    }

    logger.info(
      `[S3] Deleted ${deleted}/${objects.length} objects with prefix: ${prefix}`,
    );
    return deleted;
  }
}

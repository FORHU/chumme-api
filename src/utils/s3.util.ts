import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME } from "../config";
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
        mimeType: string
    ): Promise<string> {
        const timestamp = Date.now();
        const randomStr = crypto.randomBytes(8).toString("hex");
        const extension = filename.split(".").pop();
        const key = `uploads/${timestamp}-${randomStr}.${extension}`;

        const command = new PutObjectCommand({
            Bucket: AWS_S3_BUCKET_NAME,
            Key: key,
            Body: file,
            ContentType: mimeType,
        });

        await s3Client.send(command);
        const url = `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
        logger.info(`[S3] Uploaded: ${url}`);
        return url;
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
}

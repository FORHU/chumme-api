import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AWS_S3_BUCKET_NAME } from "../config";
import s3Client from "./s3-client";

/**
 * Function to get an UPLOAD (PUT) URL
 * @param key - The S3 object key (path)
 * @param contentType - The MIME type of the file
 * @returns A promise that resolves to the signed upload URL
 */
const getUploadUrl = async (key: string, contentType: string) => {
  const command = new PutObjectCommand({
    Bucket: AWS_S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType, // Critical: must match the mobile app's upload header
  });

  // URL expires in 5 minutes (300 seconds)
  return await getSignedUrl(s3Client, command, { expiresIn: 300 });
};

/**
 * Function to get a DOWNLOAD (GET) URL
 * @param key - The S3 object key (path)
 * @param bucket - Optional override for the bucket name
 * @param contentDisposition - Optional Content-Disposition header value (e.g. `attachment; filename="foo.apk"`)
 * @returns A promise that resolves to the signed download URL
 */
const getDownloadUrl = async (
  key: string,
  bucket: string = AWS_S3_BUCKET_NAME,
  contentDisposition?: string,
) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ...(contentDisposition && {
      ResponseContentDisposition: contentDisposition,
    }),
  });

  // URL expires in 1 hour (3600 seconds)
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

export default { getUploadUrl, getDownloadUrl };

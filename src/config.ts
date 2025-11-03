import * as dotenv from "dotenv";
dotenv.config();

export const DATABASE_URL = process.env.DATABASE_URL as string;
export const PORT = Number(process.env.PORT || 3001);
export const SECRET_KEY = process.env.SECRET_KEY as string;
export const isDev = process.env.NODE_ENV !== "production";
export const MAILER_TRANSPORT_HOST = process.env
    .MAILER_TRANSPORT_HOST as string;
export const MAILER_TRANSPORT_PORT = Number(
    process.env.MAILER_TRANSPORT_PORT || 465
);
export const MAILER_TRANSPORT_SECURE =
    process.env.MAILER_TRANSPORT_SECURE === "true";
export const MAILER_EMAIL = process.env.MAILER_EMAIL as string;
export const MAILER_PASSWORD = process.env.MAILER_PASSWORD as string;
export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET as string;
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET as string;
export const ACCESS_TOKEN_EXPIRY = (process.env.ACCESS_TOKEN_EXPIRY as any);
export const REDIS_HOST = process.env.REDIS_HOST as string;
export const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD as string;
export const REDIS_TTL_SECONDS = Number(process.env.REDIS_TTL_SECONDS) || 3600;
export const SERVICE_ACCOUNT = process.env.SERVICE_ACCOUNT as string;

// AWS S3 Configuration
export const AWS_REGION = process.env.AWS_REGION || "ap-southeast-1";
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID as string;
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY as string;
export const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME as string;

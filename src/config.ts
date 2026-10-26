import * as dotenv from "dotenv";
dotenv.config();

export const DATABASE_URL = process.env.DATABASE_URL as string;
export const PORT = Number(process.env.PORT || 3002);
export const SECRET_KEY = process.env.SECRET_KEY as string;
export const isDev = process.env.NODE_ENV !== "production";
// Browser origins allowed to call the API, comma-separated. Empty = none: the
// mobile app sends no Origin header, so it is unaffected either way.
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
export const MAILER_TRANSPORT_HOST = process.env
  .MAILER_TRANSPORT_HOST as string;
export const MAILER_TRANSPORT_PORT = Number(
  process.env.MAILER_TRANSPORT_PORT || 465,
);
export const MAILER_TRANSPORT_SECURE =
  process.env.MAILER_TRANSPORT_SECURE === "true";
export const MAILER_EMAIL = process.env.MAILER_EMAIL as string;
export const MAILER_PASSWORD = process.env.MAILER_PASSWORD as string;
export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET as string;
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET as string;
export const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY as any;
export const REDIS_HOST = process.env.REDIS_HOST as string;
export const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD as string;
export const REDIS_TTL_SECONDS = Number(process.env.REDIS_TTL_SECONDS) || 3600;
export const SERVICE_ACCOUNT = process.env.SERVICE_ACCOUNT as string;
export const S3_CDN_URL = (process.env.S3_CDN_URL as string)
  ?.replace(/cloudfront\.netr$/, "cloudfront.net")
  ?.replace(/\.$/, "");
// AWS S3 Configuration
export const AWS_REGION = process.env.AWS_REGION || "ap-southeast-1";
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID as string;
export const AWS_SECRET_ACCESS_KEY = process.env
  .AWS_SECRET_ACCESS_KEY as string;
export const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME as string;

export const CHAT_WONDER_API_URL = process.env.CHAT_WONDER_API_URL as string;

// SQS Configuration. AWS_SQS_ENDPOINT is set ONLY locally (LocalStack, see
// docker-compose.yml); when present the SQS client uses dummy credentials so
// the real AWS keys above (still used for S3) never reach the emulator.
// Unset in deployed environments, where the SDK talks to real SQS.
export const AWS_SQS_ENDPOINT = (process.env.AWS_SQS_ENDPOINT || "").trim();
export const MEDIA_PROCESSING_QUEUE_URL = process.env
  .MEDIA_PROCESSING_QUEUE_URL as string;
export const AUDIO_MERGE_QUEUE_URL = process.env
  .AUDIO_MERGE_QUEUE_URL as string;
export const INGESTION_JOBS_QUEUE_URL = process.env
  .INGESTION_JOBS_QUEUE_URL as string;
// SQS has no message priority, so ingestion jobs at or above
// INGESTION_HIGH_PRIORITY go to their own queue with their own consumer and
// cannot be starved by the self-feeding backfill backlog in the main one.
export const INGESTION_JOBS_HIGH_QUEUE_URL = process.env
  .INGESTION_JOBS_HIGH_QUEUE_URL as string;
// Every queue the app sends to or consumes, by name, for health reporting.
export const JOB_QUEUE_URLS: Record<string, string> = {
  media_processing: MEDIA_PROCESSING_QUEUE_URL,
  audio_merge: AUDIO_MERGE_QUEUE_URL,
  ingestion_jobs: INGESTION_JOBS_QUEUE_URL,
  ingestion_jobs_high: INGESTION_JOBS_HIGH_QUEUE_URL,
};

// SNS Configuration. Same local-only rule as AWS_SQS_ENDPOINT. Events published
// to this topic reach every queue whose subscription filter matches the
// eventType (the routing key) — see docker/localstack/init-queues.sh.
export const AWS_SNS_ENDPOINT = (process.env.AWS_SNS_ENDPOINT || "").trim();
export const CHUMME_EVENTS_TOPIC_ARN = process.env
  .CHUMME_EVENTS_TOPIC_ARN as string;

// Room-message translation backend: "google" (Cloud Translation v2, the
// default) or "forhu" (FORHU's chat-wonder v2 agent). Neither path uses OpenAI.
// See utils/translation/translate-text.util.ts for how the choice is made.
// `||` rather than `??` throughout on purpose: the deploy writes an unset
// GitHub variable as an empty string, and that should fall back, not break
// every call.
export const TRANSLATION_PROVIDER = (
  process.env.TRANSLATION_PROVIDER || "google"
)
  .trim()
  .toLowerCase();
export const GOOGLE_TRANSLATE_API_KEY = (
  process.env.GOOGLE_TRANSLATE_API_KEY || ""
).trim();
// FORHU's service. The name predates the provider switch; it is kept so the
// existing GitHub variable still applies.
export const TRANSLATION_API_URL = (
  process.env.TRANSLATION_API_URL || "https://chat-dev.forhu.ai"
).replace(/\/+$/, "");

// Sports demo fixtures (seeded by `npm run db:seed:sports:demo`) are merged
// into the fixture list only while this is "true". Off by default so a
// production deploy never shows invented matches.
export const SPORTS_DEMO_MODE = process.env.SPORTS_DEMO_MODE === "true";

// Google OAuth Configuration
export const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || "").trim();
export const GOOGLE_ANDROID_CLIENT_ID = (
  process.env.GOOGLE_ANDROID_CLIENT_ID || ""
).trim();

// Facebook OAuth Configuration
export const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID as string;
export const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET as string;

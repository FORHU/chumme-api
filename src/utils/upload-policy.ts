import crypto from "crypto";

/**
 * What a user is allowed to upload, and where it goes.
 *
 * The object key is built HERE, from the authenticated user id — never taken
 * from the request. Before this, `/files/get-upload-url` signed whatever key the
 * caller sent, so any client could mint a presigned PUT for any path in the
 * bucket, including overwriting another user's object. The `recordings/<userId>/`
 * shape looked server-enforced but was assembled client-side in `s3util.ts`;
 * the client simply chose to include its own id.
 */

export type UploadCategory = "recordings" | "images" | "videos" | "uploads";

interface CategoryRule {
  /** MIME types accepted, matched exactly or by `type/*` prefix. */
  allow: string[];
  maxBytes: number;
}

const MB = 1024 * 1024;

/**
 * Deliberately tight. A limit that is merely "generous" is not a limit — an
 * authenticated user filling the bucket is the cheapest abuse available once
 * signing works again.
 */
const RULES: Record<UploadCategory, CategoryRule> = {
  // Voice notes and karaoke takes.
  recordings: { allow: ["audio/"], maxBytes: 50 * MB },
  images: { allow: ["image/"], maxBytes: 15 * MB },
  videos: { allow: ["video/"], maxBytes: 200 * MB },
  // The catch-all the app uses for song files.
  uploads: { allow: ["audio/", "image/", "video/"], maxBytes: 200 * MB },
};

export const UPLOAD_CATEGORIES = Object.keys(RULES) as UploadCategory[];

/**
 * Extension by MIME type, so the key never contains a client-supplied filename.
 *
 * A filename from the request is a path-traversal vector (`../../`) and an
 * extension-spoofing one. Deriving it from the content type we are about to
 * sign keeps the two consistent by construction.
 */
const EXTENSIONS: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  // Recorder output the app can produce but that is easy to miss: iOS hands
  // back .caf when it is not asked for m4a, and Android can emit 3gpp or amr.
  // Without these the object still uploads — the allowlist matches on the
  // `audio/` prefix — but the key would end `.bin`, which some players refuse.
  "audio/x-caf": "caf",
  "audio/3gpp": "3gp",
  "audio/amr": "amr",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export class UploadPolicyError extends Error {}

export function isUploadCategory(value: unknown): value is UploadCategory {
  return typeof value === "string" && value in RULES;
}

/**
 * Validates the request and returns the key to sign.
 *
 * Throws `UploadPolicyError` for anything a caller could have got right, so the
 * controller can answer 400 rather than 500.
 */
export function planUpload(params: {
  userId: string;
  category: unknown;
  contentType: unknown;
  contentLength: unknown;
  /** Optional grouping inside the category, e.g. a room id. Sanitised below. */
  prefix?: unknown;
}): { key: string; contentType: string; contentLength: number } {
  const { userId } = params;
  if (!userId) throw new UploadPolicyError("Not authenticated");

  if (!isUploadCategory(params.category)) {
    throw new UploadPolicyError(
      `category must be one of: ${UPLOAD_CATEGORIES.join(", ")}`,
    );
  }
  const rule = RULES[params.category];

  const contentType = String(params.contentType ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!contentType) throw new UploadPolicyError("contentType is required");

  const permitted = rule.allow.some((a) =>
    a.endsWith("/") ? contentType.startsWith(a) : contentType === a,
  );
  if (!permitted) {
    throw new UploadPolicyError(
      `${contentType} is not allowed in ${params.category}`,
    );
  }

  const contentLength = Number(params.contentLength);
  if (!Number.isInteger(contentLength) || contentLength <= 0) {
    throw new UploadPolicyError("contentLength must be a positive integer");
  }
  if (contentLength > rule.maxBytes) {
    throw new UploadPolicyError(
      `File is too large for ${params.category} (max ${Math.floor(rule.maxBytes / MB)}MB)`,
    );
  }

  // Only [a-z0-9_-], and never path separators or dot segments.
  const prefix =
    typeof params.prefix === "string"
      ? params.prefix.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64)
      : "";

  const extension = EXTENSIONS[contentType] ?? "bin";
  const unique = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

  const key = [params.category, userId, prefix, `${unique}.${extension}`]
    .filter(Boolean)
    .join("/");

  return { key, contentType, contentLength };
}

import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { prisma } from "../utils/prisma";
import S3Util from "../utils/s3.util";
import S3PresignedUtil from "../utils/s3-presigned.util";
import {
  extractVideoFrame,
  getMediaMetadata,
  MediaMetadata,
  trimVideoStart,
} from "../utils/media.utils";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/error.util";
import logger from "../utils/logger";

export const ADMIN_VOICE_MAX_SECONDS = 30;
export const ADMIN_VIDEO_MAX_SECONDS = 30;
export const MEMBER_VOICE_MAX_SECONDS = 7;

// A recorder stopped exactly on the limit still writes a little padding.
const DURATION_TOLERANCE_SECONDS = 0.5;

export type RoomMediaKind = "voice" | "video";

/** What `assertAllowed` lets through. */
export interface AllowedMedia {
  /** Seconds, as measured (or, with ffprobe down, as reported). */
  duration: number;
  /**
   * Set when a video is over the limit: it's kept, cut down to its first
   * `trimTo` seconds (`trimVideo`), the way Facebook trims a long story.
   */
  trimTo?: number;
}

/** Containers a trimmed video can keep, by extension. */
const VIDEO_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

/** A video's still, stored in its File `metaData` next to `duration`. */
export interface VideoPoster {
  posterUrl: string;
  /**
   * Of the poster: the shape of the picture the right way up, with any black
   * bars baked into the file left out.
   */
  width: number;
  height: number;
}

export interface RoomMediaLimits {
  isAdmin: boolean;
  maxVoiceSeconds: number;
  /** 0 means the user may not send video at all */
  maxVideoSeconds: number;
}

/**
 * What a user may record or upload in a Circle room.
 *
 * Community Admin — whoever created the room, or the Circle it belongs to —
 * may send voice and video up to 30s each. Everyone else gets 7s of voice and
 * no video.
 *
 * Durations are measured from the uploaded file with ffprobe. The duration the
 * client reports is display metadata only and is never trusted for the limit.
 */
export default class RoomMediaPolicySvc {
  static limitsFor(isAdmin: boolean): RoomMediaLimits {
    return isAdmin
      ? {
          isAdmin,
          maxVoiceSeconds: ADMIN_VOICE_MAX_SECONDS,
          maxVideoSeconds: ADMIN_VIDEO_MAX_SECONDS,
        }
      : {
          isAdmin,
          maxVoiceSeconds: MEMBER_VOICE_MAX_SECONDS,
          maxVideoSeconds: 0,
        };
  }

  static async isCommunityAdmin(roomId: string, userId: string) {
    const room = await prisma.chummeSubCategory.findUnique({
      where: { id: roomId },
      select: {
        ownerId: true,
        chummeCategory: { select: { ownerId: true } },
      },
    });
    if (!room) throw new NotFoundError("Room not found");
    return room.ownerId === userId || room.chummeCategory?.ownerId === userId;
  }

  static async getLimits(roomId: string, userId: string) {
    return this.limitsFor(await this.isCommunityAdmin(roomId, userId));
  }

  /**
   * ffprobe the stored file. Private bucket, so probe through a signed URL.
   */
  static async probeFile(fileId: string): Promise<MediaMetadata> {
    return getMediaMetadata(await this.readableUrl(fileId));
  }

  private static async readableUrl(fileId: string): Promise<string> {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { fileUrl: true, deletedAt: true },
    });
    if (!file || file.deletedAt || !file.fileUrl) {
      throw new NotFoundError("Media file not found");
    }

    const key = (S3Util as any).getKeyFromUrl(file.fileUrl);
    return key ? await S3PresignedUtil.getDownloadUrl(key) : file.fileUrl;
  }

  /**
   * A still from the video for the chat bubble to show before it plays.
   * Returns null on any failure: a message is never held back for want of a
   * poster, and the app falls back to loading the video's first frame.
   */
  static async makePoster(params: {
    fileId: string;
    userId: string;
    duration: number;
  }): Promise<VideoPoster | null> {
    try {
      // Not frame 0: phone clips often open on black or a fade-in.
      const at = Math.min(1, params.duration / 3);
      const frame = await extractVideoFrame(
        await this.readableUrl(params.fileId),
        at,
      );
      // Same folder shape as client uploads (upload-policy.ts).
      const key = `images/${params.userId}/posters/${Date.now()}-${crypto.randomBytes(4).toString("hex")}.jpg`;
      const posterUrl = await S3Util.uploadFileWithKey(
        frame.buffer,
        key,
        "image/jpeg",
      );
      return { posterUrl, width: frame.width, height: frame.height };
    } catch (err) {
      logger.error(
        `[RoomMediaPolicySvc] Could not make a poster for file ${params.fileId}:`,
        err,
      );
      return null;
    }
  }

  /**
   * Cuts a stored video down to its first `seconds` and puts the cut in its
   * place: a new object, the File pointed at it, the original deleted. Returns
   * the cut's measured length. Throws a 400 when it can't be cut, so an
   * over-long video is still refused rather than sent whole.
   */
  static async trimVideo(params: {
    fileId: string;
    userId: string;
    seconds: number;
  }): Promise<number> {
    const file = await prisma.file.findUnique({
      where: { id: params.fileId },
      select: { fileUrl: true },
    });
    const originalUrl = file?.fileUrl ?? null;
    const originalKey = originalUrl
      ? (S3Util as any).getKeyFromUrl(originalUrl)
      : undefined;
    const ext = path
      .extname(originalKey ?? "")
      .slice(1)
      .toLowerCase();
    const source = await this.readableUrl(params.fileId);
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "trim-"));

    try {
      let outExt = ext in VIDEO_TYPES ? ext : "mp4";
      let out = path.join(dir, `trimmed.${outExt}`);
      try {
        await trimVideoStart(source, params.seconds, out);
      } catch (err) {
        // Streams the container won't take as they are: re-encode to MP4,
        // slower but always playable.
        logger.warn(
          `[RoomMediaPolicySvc] Copy-trim failed for file ${params.fileId}, re-encoding:`,
          err,
        );
        outExt = "mp4";
        out = path.join(dir, "trimmed-reencoded.mp4");
        await trimVideoStart(source, params.seconds, out, {
          reencode: true,
          timeoutMs: 240000,
        });
      }

      const meta = await getMediaMetadata(out);
      if (!meta.hasVideo || meta.duration <= 0) {
        throw new Error("the trimmed file has no readable video");
      }

      // Beside the original, so it stays in the uploader's folder.
      const stem = originalKey
        ? originalKey.replace(/\.[^./]+$/, "")
        : `videos/${params.userId}/${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
      const fileUrl = await S3Util.uploadFileWithKey(
        await fs.promises.readFile(out),
        `${stem}-first${params.seconds}s.${outExt}`,
        VIDEO_TYPES[outExt],
      );
      await prisma.file.update({
        where: { id: params.fileId },
        data: { fileUrl },
      });
      if (originalUrl) {
        // The full-length upload isn't needed any more. Not awaited.
        S3Util.deleteFile(originalUrl).catch((err) =>
          logger.warn(
            `[RoomMediaPolicySvc] Could not delete the untrimmed upload of file ${params.fileId}:`,
            err,
          ),
        );
      }
      logger.info(
        `[RoomMediaPolicySvc] Trimmed file ${params.fileId} to ${meta.duration.toFixed(1)}s`,
      );
      return meta.duration;
    } catch (err) {
      logger.error(
        `[RoomMediaPolicySvc] Could not trim file ${params.fileId}:`,
        err,
      );
      throw new BadRequestError(
        `Couldn't shorten this video to ${params.seconds} seconds. Trim it and try again.`,
      );
    } finally {
      fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * Throws unless this user may attach this file to a message in this room.
   * The duration in seconds is measured when the file can be probed,
   * otherwise the client-reported one (still held to the same limit).
   *
   * A video over the limit isn't refused when its length was measured: it
   * comes back with `trimTo`, for the caller to cut it down (`trimVideo`).
   * One whose length couldn't be measured is refused, since ffmpeg is likely
   * down too.
   */
  static async assertAllowed(params: {
    roomId: string;
    userId: string;
    kind: RoomMediaKind;
    fileId: string;
    reportedDuration?: number;
  }): Promise<AllowedMedia> {
    const limits = await this.getLimits(params.roomId, params.userId);
    const max =
      params.kind === "video" ? limits.maxVideoSeconds : limits.maxVoiceSeconds;

    if (max === 0) {
      throw new ForbiddenError(
        "Only the community admin can upload videos in this room",
      );
    }

    let meta: MediaMetadata | null = null;
    try {
      meta = await this.probeFile(params.fileId);
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      // An ffprobe/S3 outage must not take chat media down with it (it once
      // blocked every voice note: no arm64 binary), so fall back below.
      logger.error(
        `[RoomMediaPolicySvc] Could not probe file ${params.fileId}:`,
        err,
      );
    }

    if (meta && params.kind === "video" && !meta.hasVideo) {
      throw new BadRequestError("Video message must be a video file");
    }
    if (meta && params.kind === "voice" && !meta.hasAudio) {
      throw new BadRequestError("Voice message must be an audio file");
    }

    // ffprobe reports 0 when the container has no duration
    const reported = Number(params.reportedDuration);
    const duration =
      meta && meta.duration > 0
        ? meta.duration
        : Number.isFinite(reported) && reported > 0
          ? reported
          : 0;
    if (duration <= 0) {
      throw new BadRequestError("Could not read the length of this recording");
    }
    if (!meta || meta.duration <= 0) {
      logger.warn(
        `[RoomMediaPolicySvc] Using client-reported duration ${duration}s for file ${params.fileId}`,
      );
    }

    if (duration > max + DURATION_TOLERANCE_SECONDS) {
      const measured = meta != null && meta.duration > 0;
      if (params.kind === "video" && measured) {
        return { duration, trimTo: max };
      }
      throw new BadRequestError(
        `${params.kind === "video" ? "Videos" : "Voice messages"} can be at most ${max} seconds`,
      );
    }

    return { duration };
  }
}

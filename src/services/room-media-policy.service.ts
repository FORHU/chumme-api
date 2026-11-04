import { prisma } from "../utils/prisma";
import S3Util from "../utils/s3.util";
import S3PresignedUtil from "../utils/s3-presigned.util";
import { getMediaMetadata, MediaMetadata } from "../utils/media.utils";
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
    return (
      room.ownerId === userId || room.chummeCategory?.ownerId === userId
    );
  }

  static async getLimits(roomId: string, userId: string) {
    return this.limitsFor(await this.isCommunityAdmin(roomId, userId));
  }

  /**
   * ffprobe the stored file. Private bucket, so probe through a signed URL.
   */
  static async probeFile(fileId: string): Promise<MediaMetadata> {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { fileUrl: true, deletedAt: true },
    });
    if (!file || file.deletedAt || !file.fileUrl) {
      throw new NotFoundError("Media file not found");
    }

    const key = (S3Util as any).getKeyFromUrl(file.fileUrl);
    const url = key
      ? await S3PresignedUtil.getDownloadUrl(key)
      : file.fileUrl;
    return getMediaMetadata(url);
  }

  /**
   * Throws unless this user may attach this file to a message in this room.
   * Returns the measured duration in seconds.
   */
  static async assertAllowed(params: {
    roomId: string;
    userId: string;
    kind: RoomMediaKind;
    fileId: string;
  }) {
    const limits = await this.getLimits(params.roomId, params.userId);
    const max =
      params.kind === "video" ? limits.maxVideoSeconds : limits.maxVoiceSeconds;

    if (max === 0) {
      throw new ForbiddenError(
        "Only the community admin can upload videos in this room",
      );
    }

    let meta: MediaMetadata;
    try {
      meta = await this.probeFile(params.fileId);
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      logger.error(
        `[RoomMediaPolicySvc] Could not probe file ${params.fileId}:`,
        err,
      );
      throw new BadRequestError("Could not read the length of this recording");
    }

    if (params.kind === "video" && !meta.hasVideo) {
      throw new BadRequestError("Video message must be a video file");
    }
    if (params.kind === "voice" && !meta.hasAudio) {
      throw new BadRequestError("Voice message must be an audio file");
    }
    // ffprobe reports 0 when the container has no duration; failing closed
    // here is the only way the limit can't be bypassed with such a file.
    if (!meta.duration || meta.duration <= 0) {
      throw new BadRequestError("Could not read the length of this recording");
    }

    if (meta.duration > max + DURATION_TOLERANCE_SECONDS) {
      throw new BadRequestError(
        `${params.kind === "video" ? "Videos" : "Voice messages"} can be at most ${max} seconds`,
      );
    }

    return meta.duration;
  }
}

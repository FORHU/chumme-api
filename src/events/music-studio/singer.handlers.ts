import { Server } from "socket.io";
import { MusicStudioRole } from "@prisma/client";
import MusicStudioSvc from "../../services/music-studio.service";
import MusicStudioRepo from "../../repositories/music-studio.repository";
import MusicStudioCacheSvc from "../../services/music-studio-cache.service";
import RedisUtil from "../../utils/redis.util";
import { AuthenticatedSocket, StudioActionPayload } from "./types";

export const registerSingerHandlers = (
  io: Server,
  socket: AuthenticatedSocket,
) => {
  /**
   * REQUEST SINGER ROLE
   */
  socket.on("request_singer", async (data: StudioActionPayload) => {
    try {
      const { studioId } = data;

      if (!studioId) {
        return socket.emit("request_singer_failed", {
          message: "studioId is required",
        });
      }

      const membership = await MusicStudioRepo.getMembership(
        studioId,
        socket.user.id,
      );

      if (!membership || !membership.isActive) {
        return socket.emit("request_singer_failed", {
          message: "You must be in the studio to request singer role",
        });
      }

      if (membership.role !== MusicStudioRole.LISTENER) {
        return socket.emit("request_singer_failed", {
          message: "You are already a singer or producer",
        });
      }

      // Rate limiting
      const lastRequestKey = `studio:ratelimit:${socket.user.id}`;
      const redis = RedisUtil.useConnection();
      const isRateLimited = redis ? await redis.get(lastRequestKey) : null;

      if (isRateLimited) {
        return socket.emit("request_singer_failed", {
          message: "Please wait 30 seconds before requesting again",
        });
      }

      if (redis) {
        await redis.set(lastRequestKey, "1", { EX: 30 });
      }

      await MusicStudioCacheSvc.addSingerRequest(studioId, socket.user.id, {
        userId: socket.user.id,
        user: socket.user,
      });

      socket.to(studioId).emit("singer_request", {
        userId: socket.user.id,
        user: socket.user,
        studioId,
      });

      socket.emit("request_singer_sent", {
        message: "Your request to sing has been sent",
      });

      console.log(
        `[MusicStudio] ${socket.user.name} requested singer in ${studioId}`,
      );
    } catch (err: any) {
      console.error("[MusicStudio] Request singer error:", err);
      socket.emit("request_singer_failed", {
        message: err.message || "Failed to request singer role",
      });
    }
  });

  /**
   * CANCEL SINGER REQUEST (by the listener who made it)
   */
  socket.on("cancel_singer_request", async (data: StudioActionPayload) => {
    try {
      const { studioId } = data;

      if (!studioId) {
        return socket.emit("cancel_singer_request_failed", {
          message: "studioId is required",
        });
      }

      const removed = await MusicStudioCacheSvc.removeSingerRequest(
        studioId,
        socket.user.id,
      );

      if (!removed) {
        return socket.emit("cancel_singer_request_failed", {
          code: "REQUEST_NOT_PENDING",
          message: "You have no pending request to cancel",
        });
      }

      io.to(studioId).emit("singer_request_cancelled", {
        studioId,
        userId: socket.user.id,
        reason: "CANCELLED",
      });

      console.log(
        `[MusicStudio] ${socket.user.name} cancelled singer request in ${studioId}`,
      );
    } catch (err: any) {
      console.error("[MusicStudio] Cancel singer request error:", err);
      socket.emit("cancel_singer_request_failed", {
        message: err.message || "Failed to cancel singer request",
      });
    }
  });

  /**
   * APPROVE SINGER REQUEST
   */
  socket.on(
    "approve_singer",
    async (data: { studioId: string; userId: string }) => {
      try {
        const { studioId, userId } = data;

        if (!studioId || !userId) {
          return socket.emit("approve_singer_failed", {
            message: "studioId and userId are required",
          });
        }

        // The listener may have cancelled (or left) while the host looked at
        // the request; approving it then would make them a singer anyway.
        if (!(await MusicStudioCacheSvc.hasSingerRequest(studioId, userId))) {
          return socket.emit("approve_singer_failed", {
            code: "REQUEST_NOT_PENDING",
            userId,
            message: "This request is no longer pending",
          });
        }

        const result = await MusicStudioSvc.updateMemberRole(
          studioId,
          socket.user.id,
          userId,
          MusicStudioRole.SINGER,
        );

        await Promise.all([
          MusicStudioCacheSvc.removeSingerRequest(studioId, userId),
          MusicStudioCacheSvc.addMember(studioId, userId, {
            userId: userId,
            name: result.data.user.name,
            role: MusicStudioRole.SINGER,
            vocalRoleIndex: result.data.vocalRoleIndex,
          }),
        ]);

        io.to(studioId).emit("singer_approved", {
          userId,
          approvedBy: socket.user.id,
          studioId,
        });

        console.log(
          `[MusicStudio] ${socket.user.name} approved ${userId} as singer`,
        );
      } catch (err: any) {
        console.error("[MusicStudio] Approve singer error:", err);
        socket.emit("approve_singer_failed", {
          message: err.message || "Failed to approve singer",
        });
      }
    },
  );

  /**
   * REJECT SINGER REQUEST
   */
  socket.on(
    "reject_singer",
    async (data: { studioId: string; userId: string }) => {
      try {
        const { studioId, userId } = data;

        if (!studioId || !userId) {
          return socket.emit("reject_singer_failed", {
            message: "studioId and userId are required",
          });
        }

        const studio = await MusicStudioRepo.findById(studioId);
        if (!studio) {
          return socket.emit("reject_singer_failed", {
            message: "Studio not found",
          });
        }

        const isOwner = studio.ownerId === socket.user.id;
        const membership = await MusicStudioRepo.getMembership(
          studioId,
          socket.user.id,
        );

        if (!isOwner && membership?.role !== MusicStudioRole.PRODUCER) {
          return socket.emit("reject_singer_failed", {
            message: "Only owner or producers can reject requests",
          });
        }

        if (!(await MusicStudioCacheSvc.hasSingerRequest(studioId, userId))) {
          return socket.emit("reject_singer_failed", {
            code: "REQUEST_NOT_PENDING",
            userId,
            message: "This request is no longer pending",
          });
        }

        await MusicStudioCacheSvc.removeSingerRequest(studioId, userId);

        io.to(studioId).emit("singer_rejected", {
          userId,
          rejectedBy: socket.user.id,
          studioId,
        });

        console.log(
          `[MusicStudio] ${socket.user.name} rejected ${userId}'s request`,
        );
      } catch (err: any) {
        console.error("[MusicStudio] Reject singer error:", err);
        socket.emit("reject_singer_failed", {
          message: err.message || "Failed to reject singer request",
        });
      }
    },
  );

  /**
   * QUEUE MANAGEMENT
   */
  socket.on("queue_add", async (data: { studioId: string; userId: string }) => {
    try {
      const { studioId, userId } = data;

      const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
      const membership = await MusicStudioRepo.getMembership(
        studioId,
        socket.user.id,
      );
      if (!isOwner && membership?.role !== MusicStudioRole.PRODUCER) {
        return socket.emit("queue_action_failed", { message: "Unauthorized" });
      }

      await MusicStudioCacheSvc.addToQueue(studioId, userId);
      const updatedQueue = await MusicStudioCacheSvc.getQueue(studioId);

      io.to(studioId).emit("queue_updated", { studioId, queue: updatedQueue });
    } catch (err: any) {
      socket.emit("queue_action_failed", { message: err.message });
    }
  });

  socket.on(
    "queue_remove",
    async (data: { studioId: string; userId: string }) => {
      try {
        const { studioId, userId } = data;

        const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
        const membership = await MusicStudioRepo.getMembership(
          studioId,
          socket.user.id,
        );
        if (!isOwner && membership?.role !== MusicStudioRole.PRODUCER) {
          return socket.emit("queue_action_failed", {
            message: "Unauthorized",
          });
        }

        await MusicStudioCacheSvc.removeFromQueue(studioId, userId);
        const updatedQueue = await MusicStudioCacheSvc.getQueue(studioId);

        io.to(studioId).emit("queue_updated", {
          studioId,
          queue: updatedQueue,
        });
      } catch (err: any) {
        socket.emit("queue_action_failed", { message: err.message });
      }
    },
  );

  socket.on(
    "queue_reorder",
    async (data: { studioId: string; userIds: string[] }) => {
      try {
        const { studioId, userIds } = data;

        const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
        const membership = await MusicStudioRepo.getMembership(
          studioId,
          socket.user.id,
        );
        if (!isOwner && membership?.role !== MusicStudioRole.PRODUCER) {
          return socket.emit("queue_action_failed", {
            message: "Unauthorized",
          });
        }

        await MusicStudioCacheSvc.reorderQueue(studioId, userIds);
        const updatedQueue = await MusicStudioCacheSvc.getQueue(studioId);

        io.to(studioId).emit("queue_updated", {
          studioId,
          queue: updatedQueue,
        });
      } catch (err: any) {
        socket.emit("queue_action_failed", { message: err.message });
      }
    },
  );
};

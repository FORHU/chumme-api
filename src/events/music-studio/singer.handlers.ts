import { Server } from "socket.io";
import { StudioRole } from "@prisma/client";
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

      if (membership.role !== StudioRole.LISTENER) {
        return socket.emit("request_singer_failed", {
          message: "You are already a singer or producer",
        });
      }

      // Rate limiting
      const lastRequestKey = `studio:ratelimit:${socket.user.id}`;
      const isRateLimited = await RedisUtil.useConnection().get(lastRequestKey);

      if (isRateLimited) {
        return socket.emit("request_singer_failed", {
          message: "Please wait 30 seconds before requesting again",
        });
      }

      await RedisUtil.useConnection().set(lastRequestKey, "1", { EX: 30 });

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

        const result = await MusicStudioSvc.updateMemberRole(
          studioId,
          socket.user.id,
          userId,
          StudioRole.SINGER,
        );

        await Promise.all([
          MusicStudioCacheSvc.removeSingerRequest(studioId, userId),
          MusicStudioCacheSvc.addMember(studioId, userId, {
            userId: userId,
            name: result.data.user.name,
            role: StudioRole.SINGER,
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

        if (!isOwner && membership?.role !== StudioRole.PRODUCER) {
          return socket.emit("reject_singer_failed", {
            message: "Only owner or producers can reject requests",
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
      if (!isOwner && membership?.role !== StudioRole.PRODUCER) {
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
        if (!isOwner && membership?.role !== StudioRole.PRODUCER) {
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
        if (!isOwner && membership?.role !== StudioRole.PRODUCER) {
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

import { Server } from "socket.io";
import { StudioRole } from "@prisma/client";
import MusicStudioSvc from "../../services/music-studio.service";
import MusicStudioRepo from "../../repositories/music-studio.repository";
import MusicStudioCacheSvc from "../../services/music-studio-cache.service";
import { PresenceBatcher } from "../../utils/presence-batcher";
import {
  AuthenticatedSocket,
  CreateStudioPayload,
  JoinStudioPayload,
  StudioActionPayload,
  UpdateRolePayload,
} from "./types";

export const registerSessionHandlers = (
  io: Server,
  socket: AuthenticatedSocket,
  presenceBatcher: PresenceBatcher,
) => {
  /**
   * CREATE STUDIO
   */
  socket.on("create_studio", async (data: CreateStudioPayload) => {
    try {
      const { name, keyName, note, maxMembers } = data;

      if (!name) {
        return socket.emit("create_studio_failed", {
          message: "name is required",
        });
      }

      const result = await MusicStudioSvc.createStudio({
        name,
        keyName,
        note,
        ownerId: socket.user.id,
      });

      const studioId = result.data!.id;

      if (maxMembers) {
        await MusicStudioCacheSvc.setMaxMembers(studioId, maxMembers);
      }

      socket.join(studioId);

      socket.emit("studio_created", {
        studioId,
        name,
        message: "Studio created successfully",
        data: result.data,
      });

      console.log(
        `[MusicStudio] ✔ ${socket.user.name} created studio: ${name}`,
      );
    } catch (err: any) {
      console.error("[MusicStudio] Create studio error:", err);
      socket.emit("create_studio_failed", {
        message: err.message || "Failed to create studio",
      });
    }
  });

  /**
   * JOIN STUDIO
   */
  socket.on("join_studio", async (data: JoinStudioPayload) => {
    try {
      const { studioId, keyName, role } = data;

      if (!studioId) {
        return socket.emit("join_studio_failed", {
          message: "studioId is required",
        });
      }

      const result = await MusicStudioSvc.joinStudio(
        studioId,
        socket.user.id,
        keyName,
        role,
      );

      socket.join(studioId);

      const [activeUsersCount, maxMembers] = await Promise.all([
        MusicStudioCacheSvc.getMembers(studioId).then((m) => m.length),
        MusicStudioCacheSvc.getMaxMembers(studioId),
      ]);

      if (activeUsersCount >= maxMembers) {
        return socket.emit("join_studio_failed", {
          message: `Studio is full (max ${maxMembers} members)`,
        });
      }

      await MusicStudioCacheSvc.addMember(studioId, socket.user.id, {
        userId: socket.user.id,
        name: socket.user.name,
        role:
          role ||
          (result.membership?.role as StudioRole) ||
          StudioRole.LISTENER,
      });

      const [activeUsers, currentState, pendingRequests, queue] =
        await Promise.all([
          MusicStudioCacheSvc.getMembers(studioId),
          MusicStudioCacheSvc.getStudioState(studioId),
          MusicStudioCacheSvc.getSingerRequests(studioId),
          MusicStudioCacheSvc.getQueue(studioId),
        ]);

      socket.emit("join_studio_success", {
        studioId,
        message: result.message,
        data: result.data,
        users: activeUsers,
        state: currentState,
        requests: pendingRequests,
        queue: queue,
      });

      presenceBatcher.addJoin(studioId, socket.user.id);

      console.log(
        `[MusicStudio] ✔ ${socket.user.name} joined studio: ${studioId} (Redis cached)`,
      );
    } catch (err: any) {
      console.error("[MusicStudio] Join studio error:", err);
      socket.emit("join_studio_failed", {
        message: err.message || "Failed to join studio",
      });
    }
  });

  /**
   * UPDATE ROLE
   */
  socket.on("update_role", async (data: UpdateRolePayload) => {
    try {
      const { studioId, targetUserId, role } = data;

      if (!studioId || !targetUserId || !role) {
        return socket.emit("update_role_failed", {
          message: "studioId, targetUserId, and role are required",
        });
      }

      const result = await MusicStudioSvc.updateMemberRole(
        studioId,
        socket.user.id,
        targetUserId,
        role,
      );

      await MusicStudioCacheSvc.addMember(studioId, targetUserId, {
        userId: targetUserId,
        name: result.data.user.name,
        role: role,
      });

      io.to(studioId).emit("role_updated", {
        studioId,
        targetUserId,
        newRole: role,
        updatedBy: socket.user.id,
      });

      console.log(
        `[MusicStudio] ✔ ${socket.user.name} updated role for ${targetUserId} to ${role}`,
      );
    } catch (err: any) {
      console.error("[MusicStudio] Update role error:", err);
      socket.emit("update_role_failed", {
        message: err.message || "Failed to update role",
      });
    }
  });

  /**
   * SET MAX MEMBERS
   */
  socket.on(
    "set_max_members",
    async (data: { studioId: string; count: number }) => {
      try {
        const { studioId, count } = data;

        if (!studioId || !count || count < 1) {
          return socket.emit("set_max_members_failed", {
            message: "studioId and a valid count are required",
          });
        }

        const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
        if (!isOwner) {
          return socket.emit("set_max_members_failed", {
            message: "Only the owner can change the member limit",
          });
        }

        await MusicStudioCacheSvc.setMaxMembers(studioId, count);

        io.to(studioId).emit("max_members_updated", {
          studioId,
          maxMembers: count,
          updatedBy: socket.user.id,
        });

        console.log(
          `[MusicStudio] ✔ Max members for ${studioId} set to ${count}`,
        );
      } catch (err: any) {
        console.error("[MusicStudio] Set max members error:", err);
        socket.emit("set_max_members_failed", {
          message: err.message || "Failed to set member limit",
        });
      }
    },
  );

  /**
   * MAKE ALL SINGERS
   */
  socket.on("make_all_singers", async (data: { studioId: string }) => {
    try {
      const { studioId } = data;

      if (!studioId) {
        return socket.emit("make_all_singers_failed", {
          message: "studioId is required",
        });
      }

      const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
      if (!isOwner) {
        return socket.emit("make_all_singers_failed", {
          message: "Only the owner can upgrade everyone",
        });
      }

      const updatedMembers = await MusicStudioRepo.updateAllMembersRole(
        studioId,
        StudioRole.SINGER,
      );

      await Promise.all(
        updatedMembers.map((member) =>
          MusicStudioCacheSvc.addMember(studioId, member.id, {
            userId: member.id,
            name: member.name,
            role: member.role,
          }),
        ),
      );

      io.to(studioId).emit("all_users_upgraded", {
        studioId,
        newRole: StudioRole.SINGER,
        updatedBy: socket.user.id,
        allUsers: updatedMembers,
      });

      console.log(`[MusicStudio] Bulk upgrade in ${studioId}`);
    } catch (err: any) {
      console.error("[MusicStudio] Make all singers error:", err);
      socket.emit("make_all_singers_failed", {
        message: err.message || "Failed to upgrade all users",
      });
    }
  });

  /**
   * LEAVE STUDIO
   */
  socket.on("leave_studio", async (data: StudioActionPayload) => {
    try {
      const { studioId } = data;

      if (!studioId) {
        return socket.emit("leave_studio_failed", {
          message: "studioId is required",
        });
      }

      await MusicStudioSvc.leaveStudio(studioId, socket.user.id);
      socket.leave(studioId);

      const socketsInRoom = await io.in(studioId).fetchSockets();
      const usersInRoom = socketsInRoom.map((s: any) => s.user);

      socket.emit("leave_studio_success", {
        studioId,
        message: "Left studio successfully",
      });

      presenceBatcher.addLeave(studioId, socket.user.id);

      await Promise.all([
        MusicStudioCacheSvc.removeMember(studioId, socket.user.id),
        MusicStudioCacheSvc.removeSingerRequest(studioId, socket.user.id),
      ]);

      console.log(
        `[MusicStudio] ✔ ${socket.user.name} left studio: ${studioId}`,
      );
    } catch (err: any) {
      console.error("[MusicStudio] Leave studio error:", err);
      socket.emit("leave_studio_failed", {
        message: err.message || "Failed to leave studio",
      });
    }
  });

  /**
   * CLOSE STUDIO
   */
  socket.on("close_studio", async (data: StudioActionPayload) => {
    try {
      const { studioId } = data;

      if (!studioId) {
        return socket.emit("close_studio_failed", {
          message: "studioId is required",
        });
      }

      await MusicStudioSvc.closeStudio(studioId, socket.user.id);

      io.to(studioId).emit("studio_closed", {
        studioId,
        message: "Studio has been closed by the owner",
      });

      const socketsInRoom = await io.in(studioId).fetchSockets();
      socketsInRoom.forEach((s) => s.leave(studioId));

      console.log(`[MusicStudio] ✔ Studio closed: ${studioId}`);
    } catch (err: any) {
      console.error("[MusicStudio] Close studio error:", err);
      socket.emit("close_studio_failed", {
        message: err.message || "Failed to close studio",
      });
    }
  });

  /**
   * DISCONNECT
   */
  socket.on("disconnect", async () => {
    try {
      const studios = await MusicStudioRepo.findByUserId(socket.user.id);

      for (const studio of studios) {
        const studioId = studio.id;
        const userId = socket.user.id;

        // 1. Mark as disconnected in Redis
        await MusicStudioCacheSvc.updateMemberStatus(studioId, userId, false);

        // 2. Wait for 15 seconds (grace period)
        setTimeout(async () => {
          try {
            // 3. Check if they are still disconnected (they might have joined back on this or another server)
            const member = await MusicStudioCacheSvc.getMember(
              studioId,
              userId,
            );

            if (member && !member.isConnected) {
              // Still disconnected after 15s -> Perform final cleanup
              presenceBatcher.addLeave(studioId, userId);

              await Promise.all([
                MusicStudioCacheSvc.removeMember(studioId, userId),
                MusicStudioCacheSvc.removeSingerRequest(studioId, userId),
                MusicStudioRepo.removeUser(studioId, userId),
              ]);

              console.log(
                `[MusicStudio] User ${userId} removed after grace period from ${studioId}`,
              );
            } else {
              console.log(
                `[MusicStudio] User ${userId} reconnected to ${studioId}, cancellation of removal`,
              );
            }
          } catch (err) {
            console.error("[MusicStudio] Grace period cleanup error:", err);
          }
        }, 15000); // 15 seconds
      }

      console.log(
        "[MusicStudio] Client disconnected (grace period started):",
        socket.user.id,
      );
    } catch (err) {
      console.error("[MusicStudio] Disconnect error:", err);
    }
  });
};

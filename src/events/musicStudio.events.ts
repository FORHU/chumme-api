import { Server, Socket } from "socket.io";
import { StudioRole } from "@prisma/client";
import authenticateSocket from "../middleware/authenticate-sockets.middleware";
import MusicStudioSvc from "../services/music-studio.service";
import MusicStudioRepo from "../repositories/music-studio.repository";

interface AuthenticatedSocket extends Socket {
  user?: any;
}

interface CreateStudioPayload {
  name: string;
  keyName?: string; // Optional - if not set, studio is public
  note?: string;
}

interface JoinStudioPayload {
  studioId: string;
  keyName?: string; // Optional - only required for private studios
  role?: StudioRole; // LISTENER | SINGER | PRODUCER
}

interface StudioActionPayload {
  studioId: string;
}

interface UpdateRolePayload {
  studioId: string;
  targetUserId: string;
  role: StudioRole;
}

interface SaveRecordingPayload {
  studioId: string;
  musicId: string;
  audioData?: Buffer;
}

export default (io: Server) => {
  io.use((socket: AuthenticatedSocket, next) => {
    authenticateSocket(socket, (err?: Error) => {
      if (err) {
        console.error("[MusicStudio] Socket authentication failed!");
        next(err);
      } else {
        console.log("[MusicStudio] Socket authenticated successfully!");
        next();
      }
    });
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log("[MusicStudio] User connected:", socket.user.id);

    /**
     * CREATE STUDIO
     * Owner creates a new karaoke room (keyName optional for public studios)
     */
    socket.on("create_studio", async (data: CreateStudioPayload) => {
      try {
        const { name, keyName, note } = data;

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

        // Join the socket room
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
     * User joins an existing karaoke room (keyName optional for public studios)
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
          keyName, // Can be undefined for public studios
          role, // Will default to LISTENER if not provided
        );

        // Join the socket room
        socket.join(studioId);

        // Get current users in studio
        const socketsInRoom = await io.in(studioId).fetchSockets();
        const usersInRoom = socketsInRoom.map((s: any) => s.user);

        socket.emit("join_studio_success", {
          studioId,
          message: result.message,
          data: result.data,
          users: usersInRoom,
        });

        // Notify others in the studio
        socket.to(studioId).emit("user_joined_studio", {
          userId: socket.user.id,
          user: socket.user,
          studioId,
          allUsers: usersInRoom,
        });

        console.log(
          `[MusicStudio] ✔ ${socket.user.name} joined studio: ${studioId}`,
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
     * Owner/Producer updates a member's role
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

        // Notify the target user
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
     * LEAVE STUDIO
     * User leaves the karaoke room
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

        // Leave the socket room
        socket.leave(studioId);

        // Get remaining users
        const socketsInRoom = await io.in(studioId).fetchSockets();
        const usersInRoom = socketsInRoom.map((s: any) => s.user);

        socket.emit("leave_studio_success", {
          studioId,
          message: "Left studio successfully",
        });

        // Notify others
        socket.to(studioId).emit("user_left_studio", {
          userId: socket.user.id,
          user: socket.user,
          studioId,
          allUsers: usersInRoom,
        });

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
     * START RECORDING
     * Owner starts the recording session
     */
    socket.on("start_recording", async (data: StudioActionPayload) => {
      try {
        const { studioId } = data;

        if (!studioId) {
          return socket.emit("start_recording_failed", {
            message: "studioId is required",
          });
        }

        // Verify user is owner
        const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
        if (!isOwner) {
          return socket.emit("start_recording_failed", {
            message: "Only the owner can start recording",
          });
        }

        const timestamp = new Date().toISOString();

        // Notify all users in the studio
        io.to(studioId).emit("recording_started", {
          studioId,
          startedBy: socket.user.id,
          timestamp,
        });

        console.log(
          `[MusicStudio] ✔ Recording started in studio: ${studioId}`,
        );
      } catch (err: any) {
        console.error("[MusicStudio] Start recording error:", err);
        socket.emit("start_recording_failed", {
          message: err.message || "Failed to start recording",
        });
      }
    });

    /**
     * STOP RECORDING
     * Owner stops the recording session
     */
    socket.on("stop_recording", async (data: StudioActionPayload) => {
      try {
        const { studioId } = data;

        if (!studioId) {
          return socket.emit("stop_recording_failed", {
            message: "studioId is required",
          });
        }

        // Verify user is owner
        const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
        if (!isOwner) {
          return socket.emit("stop_recording_failed", {
            message: "Only the owner can stop recording",
          });
        }

        const timestamp = new Date().toISOString();

        // Notify all users in the studio
        io.to(studioId).emit("recording_stopped", {
          studioId,
          stoppedBy: socket.user.id,
          timestamp,
        });

        console.log(
          `[MusicStudio] ✔ Recording stopped in studio: ${studioId}`,
        );
      } catch (err: any) {
        console.error("[MusicStudio] Stop recording error:", err);
        socket.emit("stop_recording_failed", {
          message: err.message || "Failed to stop recording",
        });
      }
    });

    /**
     * AUDIO CHUNK
     * Real-time audio streaming between users
     */
    socket.on(
      "audio_chunk",
      async (data: { studioId: string; chunk: Buffer | string }) => {
        const { studioId, chunk } = data;

        if (!studioId || !chunk) return;

        // Broadcast to other users in the studio (not back to sender)
        socket.to(studioId).emit("audio_chunk", {
          userId: socket.user.id,
          chunk,
          timestamp: Date.now(),
        });
      },
    );

    /**
     * SAVE RECORDING
     * Save the final recording to S3 and database
     */
    socket.on("save_recording", async (data: SaveRecordingPayload) => {
      try {
        const { studioId, musicId, audioData } = data;

        if (!studioId || !musicId) {
          return socket.emit("save_recording_failed", {
            message: "studioId and musicId are required",
          });
        }

        // Verify user is owner
        const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
        if (!isOwner) {
          return socket.emit("save_recording_failed", {
            message: "Only the owner can save the recording",
          });
        }

        // Get all users in the studio
        const studioUsers = await MusicStudioRepo.getStudioUsers(studioId);
        const userIds = studioUsers.map((u: { id: string }) => u.id);

        // Note: In production, audioData would come from client or be compiled server-side
        // For now, we'll expect the client to send the final audio buffer
        if (!audioData) {
          return socket.emit("save_recording_failed", {
            message: "audioData is required",
          });
        }

        const result = await MusicStudioSvc.saveRecording({
          studioId,
          musicId,
          userIds,
          audioBuffer: Buffer.isBuffer(audioData)
            ? audioData
            : Buffer.from(audioData as ArrayBuffer),
          filename: `studio_${studioId}_${Date.now()}.webm`,
          mimetype: "audio/webm",
        });

        // Notify all users
        io.to(studioId).emit("recording_saved", {
          studioId,
          musicRecordId: result.data.id,
          message: "Recording saved successfully",
        });

        console.log(`[MusicStudio] ✔ Recording saved for studio: ${studioId}`);
      } catch (err: any) {
        console.error("[MusicStudio] Save recording error:", err);
        socket.emit("save_recording_failed", {
          message: err.message || "Failed to save recording",
        });
      }
    });

    /**
     * CLOSE STUDIO
     * Owner closes the studio permanently
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

        // Notify all users and force them to leave
        io.to(studioId).emit("studio_closed", {
          studioId,
          message: "Studio has been closed by the owner",
        });

        // Remove all sockets from the room
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
     * Handle user disconnection
     */
    socket.on("disconnect", async () => {
      try {
        // Get studios the user was in
        const studios = await MusicStudioRepo.findByUserId(socket.user.id);

        for (const studio of studios) {
          // Notify others in each studio
          socket.to(studio.id).emit("user_left_studio", {
            userId: socket.user.id,
            user: socket.user,
            studioId: studio.id,
            reason: "disconnected",
          });

          // Remove user from studio in DB
          await MusicStudioRepo.removeUser(studio.id, socket.user.id);
        }

        console.log("[MusicStudio] Client disconnected:", socket.user.id);
      } catch (err) {
        console.error("[MusicStudio] Disconnect error:", err);
      }
    });
  });
};

import { Server } from "socket.io";
import { StudioRole } from "@prisma/client";
import MusicStudioSvc from "../../services/music-studio.service";
import MusicStudioRepo from "../../repositories/music-studio.repository";
import MusicStudioCacheSvc from "../../services/music-studio-cache.service";
import {
  AuthenticatedSocket,
  StudioActionPayload,
  SaveRecordingPayload,
} from "./types";

export const registerProductionHandlers = (
  io: Server,
  socket: AuthenticatedSocket,
) => {
  // Throttling for high-frequency events
  const lastLyricSync = new Map<string, number>();
  /**
   * RECORDING COUNTDOWN
   */
  socket.on(
    "recording_countdown",
    async (data: { studioId: string; seconds?: number }) => {
      try {
        const { studioId, seconds = 3 } = data;

        if (!studioId) {
          return socket.emit("recording_countdown_failed", {
            message: "studioId is required",
          });
        }

        const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
        const membership = await MusicStudioRepo.getMembership(
          studioId,
          socket.user.id,
        );

        if (!isOwner && membership?.role !== StudioRole.PRODUCER) {
          return socket.emit("recording_countdown_failed", {
            message: "Only owner or producers can start countdown",
          });
        }

        io.to(studioId).emit("countdown_started", {
          studioId,
          seconds,
          startedBy: socket.user.id,
        });

        console.log(`[MusicStudio] Countdown in ${studioId}`);
      } catch (err: any) {
        socket.emit("recording_countdown_failed", {
          message: err.message || "Failed to start countdown",
        });
      }
    },
  );

  /**
   * START RECORDING
   */
  socket.on("start_recording", async (data: StudioActionPayload) => {
    try {
      const { studioId } = data;

      if (!studioId) {
        return socket.emit("start_recording_failed", {
          message: "studioId is required",
        });
      }

      const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
      if (!isOwner) {
        return socket.emit("start_recording_failed", {
          message: "Only the owner can start recording",
        });
      }

      await MusicStudioCacheSvc.setStudioState(studioId, "RECORDING");

      io.to(studioId).emit("recording_started", {
        studioId,
        startedBy: socket.user.id,
        timestamp: new Date().toISOString(),
      });

      console.log(`[MusicStudio] Recording started in ${studioId}`);
    } catch (err: any) {
      socket.emit("start_recording_failed", {
        message: err.message || "Failed to start recording",
      });
    }
  });

  /**
   * STOP RECORDING
   */
  socket.on("stop_recording", async (data: StudioActionPayload) => {
    try {
      const { studioId } = data;

      if (!studioId) {
        return socket.emit("stop_recording_failed", {
          message: "studioId is required",
        });
      }

      const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
      if (!isOwner) {
        return socket.emit("stop_recording_failed", {
          message: "Only the owner can stop recording",
        });
      }

      await MusicStudioCacheSvc.setStudioState(studioId, "IDLE");

      io.to(studioId).emit("recording_stopped", {
        studioId,
        stoppedBy: socket.user.id,
        timestamp: new Date().toISOString(),
      });

      console.log(`[MusicStudio] Recording stopped in ${studioId}`);
    } catch (err: any) {
      socket.emit("stop_recording_failed", {
        message: err.message || "Failed to stop recording",
      });
    }
  });

  /**
   * SAVE RECORDING
   */
  socket.on("save_recording", async (data: SaveRecordingPayload) => {
    try {
      const { studioId, musicId, audioData } = data;

      if (!studioId || !musicId || !audioData) {
        return socket.emit("save_recording_failed", {
          message: "Missing required fields",
        });
      }

      const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
      if (!isOwner) {
        return socket.emit("save_recording_failed", {
          message: "Only the owner can save the recording",
        });
      }

      const studioUsers = await MusicStudioRepo.getStudioUsers(studioId);
      const userIds = studioUsers.map((u: { id: string }) => u.id);

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

      await MusicStudioCacheSvc.setStudioState(studioId, "IDLE");

      io.to(studioId).emit("recording_saved", {
        studioId,
        musicRecordId: result.data.id,
        message: "Recording saved successfully",
      });

      console.log(`[MusicStudio] Recording saved for studio: ${studioId}`);
    } catch (err: any) {
      socket.emit("save_recording_failed", {
        message: err.message || "Failed to save recording",
      });
    }
  });

  /**
   * PLAY RECORDING
   */
  socket.on(
    "play_recording",
    async (data: { studioId: string; audioData?: Buffer }) => {
      try {
        const { studioId, audioData } = data;

        if (!studioId) {
          return socket.emit("play_recording_failed", {
            message: "studioId is required",
          });
        }

        io.to(studioId).emit("playback_started", {
          studioId,
          startedBy: socket.user.id,
          timestamp: new Date().toISOString(),
          audioData,
        });

        console.log(`[MusicStudio] Playback in ${studioId}`);
      } catch (err: any) {
        socket.emit("play_recording_failed", {
          message: err.message || "Failed to play recording",
        });
      }
    },
  );

  /**
   * DISCARD RECORDING
   */
  socket.on("discard_recording", async (data: StudioActionPayload) => {
    try {
      const { studioId } = data;

      if (!studioId) {
        return socket.emit("discard_recording_failed", {
          message: "studioId is required",
        });
      }

      const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
      if (!isOwner) {
        return socket.emit("discard_recording_failed", {
          message: "Only the owner can discard recording",
        });
      }

      io.to(studioId).emit("recording_discarded", {
        studioId,
        discardedBy: socket.user.id,
        timestamp: new Date().toISOString(),
      });

      console.log(`[MusicStudio] Discarded in ${studioId}`);
    } catch (err: any) {
      socket.emit("discard_recording_failed", {
        message: err.message || "Failed to discard recording",
      });
    }
  });

  /**
   * SYNC LYRICS
   */
  socket.on(
    "sync_lyrics",
    async (data: { studioId: string; lineIndex: number }) => {
      try {
        const { studioId, lineIndex } = data;

        if (!studioId || lineIndex === undefined) return;

        // Throttling: only allow 3 syncs per second (333ms)
        const now = Date.now();
        const lastSync = lastLyricSync.get(studioId) || 0;
        if (now - lastSync < 333) return;
        lastLyricSync.set(studioId, now);

        const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
        const membership = await MusicStudioRepo.getMembership(
          studioId,
          socket.user.id,
        );

        if (!isOwner && membership?.role !== StudioRole.PRODUCER) return;

        await MusicStudioCacheSvc.setLyricIndex(studioId, lineIndex);

        socket.to(studioId).emit("lyric_progress", {
          studioId,
          lineIndex,
          syncedBy: socket.user.id,
        });
      } catch (err: any) {
        console.error("[MusicStudio] Sync lyrics error:", err);
      }
    },
  );

  /**
   * SELECT SONG
   */
  socket.on(
    "select_song",
    async (data: { studioId: string; musicId: string }) => {
      try {
        const { studioId, musicId } = data;

        if (!studioId || !musicId) {
          return socket.emit("select_song_failed", {
            message: "studioId and musicId are required",
          });
        }

        const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
        const membership = await MusicStudioRepo.getMembership(
          studioId,
          socket.user.id,
        );

        if (!isOwner && membership?.role !== StudioRole.PRODUCER) {
          return socket.emit("select_song_failed", {
            message: "Only owner or producers can select songs",
          });
        }

        await Promise.all([
          MusicStudioCacheSvc.setStudioState(studioId, "IDLE"),
          MusicStudioCacheSvc.setLyricIndex(studioId, 0),
        ]);

        io.to(studioId).emit("song_changed", {
          studioId,
          musicId,
          selectedBy: socket.user.id,
        });

        console.log(`[MusicStudio] Song changed to ${musicId} in ${studioId}`);
      } catch (err: any) {
        socket.emit("select_song_failed", {
          message: err.message || "Failed to select song",
        });
      }
    },
  );
};

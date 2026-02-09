import { Server } from "socket.io";
import { StudioRole, StudioType } from "@prisma/client";
import MusicRepo from "../../repositories/music.repository";
import MusicStudioSvc from "../../services/music-studio.service";
import MusicStudioRepo from "../../repositories/music-studio.repository";
import MusicStudioCacheSvc from "../../services/music-studio-cache.service";
import RelayManager from "../../utils/relay-manager";
import MusicQueueSvc from "../../services/music-queue.service";
import {
  AuthenticatedSocket,
  PassMicrophonePayload,
  SaveRecordingPayload,
  StudioActionPayload,
  UpdateRolePayload,
  SetRelayModePayload,
  UpdateVocalRolePayload,
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

        // --- AUTOMATED MIC ROTATION LOGIC ---
        const { nextSingerId, targetRoleIndex } =
          await RelayManager.getNextAutoSingerId(studioId, lineIndex);

        if (targetRoleIndex !== null) {
          await MusicStudioCacheSvc.setCurrentRoleIndex(
            studioId,
            targetRoleIndex,
          );
        }

        if (nextSingerId) {
          const singerInfo = await MusicStudioCacheSvc.getMember(
            studioId,
            nextSingerId,
          );
          await MusicStudioCacheSvc.setCurrentSinger(studioId, nextSingerId);
          io.to(studioId).emit("microphone_passed", {
            studioId,
            currentSinger: nextSingerId,
            currentSingerName: singerInfo?.name || "Unknown",
            currentRoleIndex: targetRoleIndex,
            passedBy: "SYSTEM",
            reason: "AUTO_RELAY",
          });
        }
      } catch (err: any) {
        console.error("[MusicStudio] Sync lyrics error:", err);
      }
    },
  );

  /**
   * SELECT SONG
   */
  /**
   * SELECT SONG
   */
  socket.on(
    "select_song",
    async (data: { studioId: string; musicId: string }) => {
      try {
        const { studioId, musicId } = data;
        if (!studioId || !musicId) return;

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

        const result = await MusicQueueSvc.playNow(
          studioId,
          musicId,
          socket.user.id,
        );

        io.to(studioId).emit("song_changed", result);
      } catch (err: any) {
        socket.emit("select_song_failed", {
          message: err.message || "Failed to select song",
        });
      }
    },
  );

  /**
   * QUEUE A SONG
   */
  socket.on(
    "queue_song",
    async (data: { studioId: string; musicId: string }) => {
      try {
        const { studioId, musicId } = data;
        if (!studioId || !musicId) return;

        // Verify user is singer or producer
        const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
        const membership = await MusicStudioRepo.getMembership(
          studioId,
          socket.user.id,
        );
        if (
          !isOwner &&
          membership?.role !== StudioRole.PRODUCER &&
          membership?.role !== StudioRole.SINGER
        ) {
          return socket.emit("queue_song_failed", {
            message: "Only singers or producers can queue songs",
          });
        }

        const queue = await MusicQueueSvc.addToQueue(
          studioId,
          musicId,
          socket.user.id,
          socket.user.name,
        );

        io.to(studioId).emit("queue_updated", { studioId, queue });
      } catch (err: any) {
        socket.emit("queue_song_failed", {
          message: err.message || "Failed to queue song",
        });
      }
    },
  );

  /**
   * REMOVE QUEUED SONG
   */
  socket.on(
    "remove_queued_song",
    async (data: { studioId: string; index: number }) => {
      try {
        const { studioId, index } = data;
        if (!studioId || index === undefined) return;

        const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
        const membership = await MusicStudioRepo.getMembership(
          studioId,
          socket.user.id,
        );

        if (!isOwner && membership?.role !== StudioRole.PRODUCER) {
          return socket.emit("queue_action_failed", {
            message: "Only owner or producers can remove items",
          });
        }

        const queue = await MusicQueueSvc.removeFromQueue(studioId, index);

        io.to(studioId).emit("queue_updated", { studioId, queue });
      } catch (err: any) {
        socket.emit("queue_action_failed", {
          message: err.message || "Failed to remove item",
        });
      }
    },
  );

  /**
   * PLAY NEXT SONG (Pop from Queue)
   */
  socket.on("play_next_song", async (data: { studioId: string }) => {
    try {
      const { studioId } = data;
      if (!studioId) return;

      const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
      const membership = await MusicStudioRepo.getMembership(
        studioId,
        socket.user.id,
      );

      if (!isOwner && membership?.role !== StudioRole.PRODUCER) {
        return socket.emit("queue_action_failed", {
          message: "Only owner or producers can skip/play next",
        });
      }

      const { songChangedData, newQueue } = await MusicQueueSvc.playNext(
        studioId,
        socket.user.id,
      );

      io.to(studioId).emit("song_changed", songChangedData);
      io.to(studioId).emit("queue_updated", { studioId, queue: newQueue });
    } catch (err: any) {
      socket.emit("queue_action_failed", {
        message: err.message || "Failed to play next song",
      });
    }
  });

  /**
   * PASS MICROPHONE (RELAYSINGING)
   */
  socket.on("pass_microphone", async (data: PassMicrophonePayload) => {
    try {
      const { studioId, targetUserId } = data;

      if (!studioId) return;

      const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
      const membership = await MusicStudioRepo.getMembership(
        studioId,
        socket.user.id,
      );
      const currentSingerId =
        await MusicStudioCacheSvc.getCurrentSinger(studioId);

      const canPass =
        isOwner ||
        membership?.role === StudioRole.PRODUCER ||
        (membership?.role === StudioRole.SINGER &&
          socket.user.id === currentSingerId);

      if (!canPass) {
        return socket.emit("pass_microphone_failed", {
          message: "You don't have permission to pass the mic right now",
        });
      }

      // Check if target is eligible to sing
      if (targetUserId) {
        const targetCanSing = await MusicStudioSvc.canRecord(
          studioId,
          targetUserId,
        );
        if (!targetCanSing) {
          return socket.emit("pass_microphone_failed", {
            message: "Target user is not a singer or producer",
          });
        }
      }

      await MusicStudioCacheSvc.setCurrentSinger(studioId, targetUserId);
      const singerInfo = targetUserId
        ? await MusicStudioCacheSvc.getMember(studioId, targetUserId)
        : null;

      io.to(studioId).emit("microphone_passed", {
        studioId,
        currentSinger: targetUserId,
        currentSingerName:
          singerInfo?.name || (targetUserId ? "Unknown" : null),
        passedBy: socket.user.id,
      });

      console.log(`[MusicStudio] Mic passed to ${targetUserId} in ${studioId}`);
    } catch (err: any) {
      socket.emit("pass_microphone_failed", { message: err.message });
    }
  });

  /**
   * SET RELAY MODE
   */
  socket.on("set_relay_mode", async (data: SetRelayModePayload) => {
    try {
      const { studioId, mode, interval } = data;
      const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
      if (!isOwner) return;

      await Promise.all([
        MusicStudioRepo.update(studioId, {
          relayMode: mode,
          relayInterval: interval,
        }),
        MusicStudioCacheSvc.setRelayMode(studioId, mode),
        interval
          ? MusicStudioCacheSvc.setRelayInterval(studioId, interval)
          : Promise.resolve(),
      ]);

      io.to(studioId).emit("relay_mode_changed", {
        studioId,
        mode,
        interval,
      });
    } catch (err: any) {
      socket.emit("relay_action_failed", { message: err.message });
    }
  });

  /**
   * UPDATE VOCAL ROLE
   */
  socket.on("update_vocal_role", async (data: UpdateVocalRolePayload) => {
    try {
      const { studioId, userId, vocalRoleIndex } = data;
      const isOwner = await MusicStudioSvc.isOwner(studioId, socket.user.id);
      if (!isOwner) return;

      // Update DB
      await MusicStudioRepo.updateVocalRole(studioId, userId, vocalRoleIndex);

      // Update Cache/Members
      const member = await MusicStudioCacheSvc.getMember(studioId, userId);
      if (member) {
        member.vocalRoleIndex = vocalRoleIndex;
        await MusicStudioCacheSvc.addMember(studioId, userId, member);
      }

      io.to(studioId).emit("vocal_role_updated", {
        studioId,
        userId,
        vocalRoleIndex,
      });
    } catch (err: any) {
      socket.emit("vocal_role_failed", { message: err.message });
    }
  });
};

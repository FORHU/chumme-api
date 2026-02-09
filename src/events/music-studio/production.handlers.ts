import { Server } from "socket.io";
import { StudioRole, StudioType } from "@prisma/client";
import MusicRepo from "../../repositories/music.repository";
import MusicStudioSvc from "../../services/music-studio.service";
import MusicStudioRepo from "../../repositories/music-studio.repository";
import MusicStudioCacheSvc from "../../services/music-studio-cache.service";
import RelayManager from "../../utils/relay-manager";
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
   * Helper: Change Active Song
   */
  const changeActiveSong = async (
    studioId: string,
    musicId: string,
    userId: string,
  ) => {
    const music = await MusicRepo.findById(musicId);
    if (!music) throw new Error("Music not found");

    // Reset Studio State
    const promises: Promise<any>[] = [
      MusicStudioCacheSvc.setStudioState(studioId, "IDLE"),
      MusicStudioCacheSvc.setLyricIndex(studioId, 0),
      MusicStudioCacheSvc.setActiveSong(studioId, musicId),
    ];

    if (music.isKaraoke && music.parts) {
      promises.push(MusicStudioCacheSvc.setPhrasing(studioId, music.parts));
    }
    await Promise.all(promises);

    // Initial Singer Assignment
    const { nextSingerId, targetRoleIndex } =
      await RelayManager.getNextAutoSingerId(studioId, 0);

    if (targetRoleIndex !== null) {
      await MusicStudioCacheSvc.setCurrentRoleIndex(studioId, targetRoleIndex);
    }

    if (nextSingerId) {
      await MusicStudioCacheSvc.setCurrentSinger(studioId, nextSingerId);
    } else {
      const existingSinger =
        await MusicStudioCacheSvc.getCurrentSinger(studioId);
      if (!existingSinger) {
        const members = await MusicStudioCacheSvc.getMembers(studioId);
        const firstEligible = members.find(
          (m) => m.role === StudioRole.SINGER || m.role === StudioRole.PRODUCER,
        );
        if (firstEligible) {
          await MusicStudioCacheSvc.setCurrentSinger(
            studioId,
            firstEligible.userId,
          );
        }
      }
    }

    const finalSinger = await MusicStudioCacheSvc.getCurrentSinger(studioId);
    let finalSingerName = null;
    if (finalSinger) {
      const singerInfo = await MusicStudioCacheSvc.getMember(
        studioId,
        finalSinger,
      );
      finalSingerName = singerInfo?.name || "Unknown";
    }

    io.to(studioId).emit("song_changed", {
      studioId,
      musicId,
      currentSinger: finalSinger || null,
      currentSingerName: finalSingerName,
      currentRoleIndex: targetRoleIndex,
      selectedBy: userId,
    });
    console.log(`[MusicStudio] Song changed to ${musicId} in ${studioId}`);
  };

  /**
   * SELECT SONG (Play Immediately)
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

        await changeActiveSong(studioId, musicId, socket.user.id);
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

        // Verify music exists
        const music = await MusicRepo.findById(musicId);
        if (!music) throw new Error("Music not found");

        // Add to queue
        const queueItem = {
          musicId: music.id,
          title: music.title,
          artist: music.musicArtist?.name || "Unknown Artist",
          cover: music.musicArtist?.imageUrl || null,
          queuedBy: socket.user.id,
          queuedByName: socket.user.name,
        };

        await MusicStudioCacheSvc.addMusicToQueue(studioId, queueItem);

        // Emit update
        const queue = await MusicStudioCacheSvc.getMusicQueue(studioId);
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

        // Permissions: Owner/Producer can remove anyone's. Requester can remove their own?
        // For simplicity: Owner/Producer only for now, or check queuedBy.
        // Let's stick to Owner/Producer for management simplicity.
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

        await MusicStudioCacheSvc.removeMusicFromQueue(studioId, index);

        const queue = await MusicStudioCacheSvc.getMusicQueue(studioId);
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

      const nextItem = await MusicStudioCacheSvc.popNextMusic(studioId);
      if (nextItem) {
        await changeActiveSong(studioId, nextItem.musicId, socket.user.id);

        // Emit updated queue
        const queue = await MusicStudioCacheSvc.getMusicQueue(studioId);
        io.to(studioId).emit("queue_updated", { studioId, queue });
      } else {
        socket.emit("queue_action_failed", { message: "Queue is empty" });
      }
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

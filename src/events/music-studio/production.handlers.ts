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
          await MusicStudioCacheSvc.setCurrentSinger(studioId, nextSingerId);
          io.to(studioId).emit("microphone_passed", {
            studioId,
            currentSinger: nextSingerId,
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

        const [music, isOwner] = await Promise.all([
          MusicRepo.findById(musicId),
          MusicStudioSvc.isOwner(studioId, socket.user.id),
        ]);

        const membership = await MusicStudioRepo.getMembership(
          studioId,
          socket.user.id,
        );

        if (!isOwner && membership?.role !== StudioRole.PRODUCER) {
          return socket.emit("select_song_failed", {
            message: "Only owner or producers can select songs",
          });
        }

        const promises: Promise<any>[] = [
          MusicStudioCacheSvc.setStudioState(studioId, "IDLE"),
          MusicStudioCacheSvc.setLyricIndex(studioId, 0),
          MusicStudioCacheSvc.setActiveSong(studioId, musicId),
        ];

        // If song has phrasing templates, load them to cache
        if (music && music.isKaraoke && music.parts) {
          promises.push(MusicStudioCacheSvc.setPhrasing(studioId, music.parts));
        }

        await Promise.all(promises);

        // --- INITIAL SINGER ASSIGNMENT ---
        const { nextSingerId, targetRoleIndex } =
          await RelayManager.getNextAutoSingerId(studioId, 0);

        if (targetRoleIndex !== null) {
          await MusicStudioCacheSvc.setCurrentRoleIndex(
            studioId,
            targetRoleIndex,
          );
        }

        if (nextSingerId) {
          await MusicStudioCacheSvc.setCurrentSinger(studioId, nextSingerId);
        } else {
          // If no new singer is suggested, check if anyone is currently holding it.
          // If not, we might want to pick the "first" eligible person regardless of "newness".
          const existingSinger =
            await MusicStudioCacheSvc.getCurrentSinger(studioId);
          if (!existingSinger) {
            const members = await MusicStudioCacheSvc.getMembers(studioId);
            const firstEligible = members.find(
              (m) =>
                m.role === StudioRole.SINGER || m.role === StudioRole.PRODUCER,
            );
            if (firstEligible) {
              await MusicStudioCacheSvc.setCurrentSinger(
                studioId,
                firstEligible.userId,
              );
            }
          }
        }

        const finalSinger =
          await MusicStudioCacheSvc.getCurrentSinger(studioId);

        io.to(studioId).emit("song_changed", {
          studioId,
          musicId,
          currentSinger: finalSinger || null,
          currentRoleIndex: targetRoleIndex,
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

  /**
   * GET KARAOKE LIST
   * Fetch songs where isKaraoke is true
   */
  socket.on("get_karaoke_list", async (data: { studioId: string }) => {
    try {
      const songs = await MusicRepo.findAll({ isKaraoke: true });
      socket.emit("karaoke_list", {
        studioId: data.studioId,
        songs,
      });
    } catch (err: any) {
      socket.emit("get_karaoke_list_failed", {
        message: err.message || "Failed to fetch karaoke songs",
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

      io.to(studioId).emit("microphone_passed", {
        studioId,
        currentSinger: targetUserId,
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

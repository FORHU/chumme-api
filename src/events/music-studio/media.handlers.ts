import { Server } from "socket.io";
import MusicStudioSvc from "../../services/music-studio.service";
import MusicStudioCacheSvc from "../../services/music-studio-cache.service";
import { AuthenticatedSocket } from "./types";
import { StudioType } from "@prisma/client";
import MusicLibrarySvc from "../../services/music-library.service";
import MusicTempRecordSvc from "../../services/music-temp-record.service";

export const registerMediaHandlers = (
  io: Server,
  socket: AuthenticatedSocket,
) => {
  /**
   * AUDIO CHUNK
   * Real-time audio streaming between studio users.
   *
   * Flow:
   * 1. Validate input (studioId, chunk, userId, musicId)
   * 2. Verify file exists in DB
   * 3. Role gate — only SINGER / PRODUCER can stream
   * 4. Mode gate:
   *    - CROWDSINGING / COMPETITION → everyone streams freely
   *    - RELAYSINGING → only the current singer (unless chorus / role 0)
   * 5. Broadcast chunk to other studio members
   * 6. Persist chunk as TempMusicRecord for later FFmpeg merge
   */
  socket.on(
    "audio_chunk",
    async (
      data: {
        studioId: string;
        chunk: Record<string, any>;
        userId: string;
        musicId: string;
        order?: number;
        timestamp?: number;
      },
      callback?: (response: any) => void,
    ) => {
      const { studioId, chunk, userId, musicId, timestamp, order } = data;

      // 1. Validation
      if (!studioId || !chunk?.fileId) {
        if (callback) callback({ error: "Invalid payload" });
        return;
      }
      const file = await MusicLibrarySvc.getMusicFileById(chunk.fileId);
      if (!file) {
        console.log("[MusicStudio] audio_chunk dropped: file not found", {
          fileId: chunk.fileId,
        });
        return;
      }

      // 3. Role gate — only Singers & Producers can stream audio
      const canStream = await MusicStudioSvc.canRecord(
        studioId,
        socket.user.id,
      );
      if (!canStream) {
        console.log("[MusicStudio] audio_chunk dropped: user cannot record", {
          userId: socket.user.id,
          studioId,
        });
        return;
      }

      // 4. Mode gate — RELAYSINGING: only the current singer can stream
      const studioStatePromise = MusicStudioCacheSvc.getStudioType(studioId);
      const startTimePromise =
        MusicStudioCacheSvc.getRecordingStartTime(studioId);

      const [cachedType, recordingStartTime] = await Promise.all([
        studioStatePromise,
        startTimePromise,
      ]);

      if (cachedType === StudioType.RELAYSINGING) {
        const [currentSinger, currentRoleIndex] = await Promise.all([
          MusicStudioCacheSvc.getCurrentSinger(studioId),
          MusicStudioCacheSvc.getCurrentRoleIndex(studioId),
        ]);

        console.log("[MusicStudio] RELAYSINGING check:", {
          currentSinger,
          currentRoleIndex,
          myId: socket.user.id,
        });

        // Role 0 = "All-Sing" / Chorus → everyone streams
        if (currentRoleIndex !== 0) {
          if (currentSinger && currentSinger !== socket.user.id) {
            console.log(
              "[MusicStudio] audio_chunk dropped: not the current singer in Relay mode",
            );
            return; // Not the current singer — drop chunk
          }
        }
      }

      // 5. Calculate start time offset (for sync)
      // Note: recordingStartTime and timestamp must be Unix milliseconds (UTC)
      // for international compatibility across different time zones.
      let startTimeOffset: number | undefined;
      if (recordingStartTime && timestamp) {
        // Offset in seconds (Universal relative time)
        startTimeOffset = (timestamp - recordingStartTime) / 1000;
        // Clamp to positive
        if (startTimeOffset < 0) startTimeOffset = 0;
      }

      // 6. Broadcast to other users in the studio
      socket.to(studioId).emit("audio_chunk", {
        userId: socket.user.id,
        file,
        timestamp: timestamp || Date.now(),
        startTimeOffset,
      });

      // 7. Persist chunk for later FFmpeg merge (saveRecording flow)
      try {
        await MusicTempRecordSvc.saveChunk({
          fileId: chunk.fileId,
          studioId,
          userId: socket.user.id,
          musicId,
          order,
          startTimeOffset,
          metaData: chunk.metaData,
          recordDuration: chunk.duration,
        });

        // Acknowledge receipt if callback provided
        if (typeof callback === "function") {
          callback({ success: true });
        }
      } catch (err: any) {
        console.error("[MusicStudio] Failed to save temp chunk:", err);
        if (typeof callback === "function") {
          callback({ error: err.message || "Failed to save chunk" });
        }
      }
    },
  );
};

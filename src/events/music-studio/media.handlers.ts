import { Server } from "socket.io";
import MusicStudioSvc from "../../services/music-studio.service";
import MusicStudioCacheSvc from "../../services/music-studio-cache.service";
import { AuthenticatedSocket } from "./types";
import { MusicStudioType } from "@prisma/client";
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
   * 3. Resolve studio mode (cache, falling back to the studio row)
   * 4. Role gate:
   *    - CROWDSINGING / COMPETITION → any active member can stream
   *    - otherwise → only SINGER / PRODUCER
   * 5. Turn gate:
   *    - CROWDSINGING / COMPETITION → everyone streams freely
   *    - RELAYSINGING → only the current singer (unless chorus / role 0)
   * 6. Calculate start time offset for sync
   * 7. Broadcast chunk to other studio members
   * 8. Persist chunk as TempMusicRecord for later FFmpeg merge
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
      const { studioId, chunk, musicId, timestamp, order } = data;

      // 1. Validation
      if (!studioId || !chunk?.fileId) {
        if (callback) callback({ error: "Invalid payload" });
        return;
      }
      // getMusicFileById throws when the record is missing, so guard it — an
      // uncaught throw here would abort the handler without acking, leaving the
      // client to believe the chunk was persisted.
      let file;
      try {
        file = await MusicLibrarySvc.getMusicFileById(chunk.fileId);
      } catch {
        file = null;
      }
      if (!file) {
        console.log("[MusicStudio] audio_chunk dropped: file not found", {
          fileId: chunk.fileId,
        });
        if (callback) callback({ error: "Audio file not found" });
        return;
      }

      // 3. Resolve the studio mode first — the role gate below depends on it.
      const studioStatePromise = MusicStudioCacheSvc.getStudioType(studioId);
      const startTimePromise =
        MusicStudioCacheSvc.getRecordingStartTime(studioId);

      const [cachedType, recordingStartTime] = await Promise.all([
        studioStatePromise,
        startTimePromise,
      ]);

      // 4. Role gate — CROWDSINGING/COMPETITION let any member stream, which is
      // the whole point of those modes; elsewhere it stays Singers & Producers.
      // This check used to run before the mode was known and always demanded a
      // SINGER/PRODUCER role, so it silently overrode the open-mode rule the
      // header documents: joiners are persisted as LISTENER, so every take from
      // anyone but the owner was dropped here after already reaching S3.
      const canStream = await MusicStudioSvc.canStream(
        studioId,
        socket.user.id,
        cachedType,
      );
      if (!canStream) {
        console.log("[MusicStudio] audio_chunk dropped: user cannot record", {
          userId: socket.user.id,
          studioId,
          studioType: cachedType,
        });
        if (callback)
          callback({ error: "You are not allowed to record in this studio" });
        return;
      }

      // 5. Mode gate — RELAYSINGING: only the current singer can stream
      if (cachedType === MusicStudioType.RELAYSINGING) {
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
            if (callback)
              callback({ error: "It is not your turn to sing yet" });
            return; // Not the current singer — drop chunk
          }
        }
      }

      // 6. Calculate start time offset (for sync)
      // Note: recordingStartTime and timestamp must be Unix milliseconds (UTC)
      // for international compatibility across different time zones.
      let startTimeOffset: number | undefined;
      if (recordingStartTime && timestamp) {
        // Offset in seconds (Universal relative time)
        startTimeOffset = (timestamp - recordingStartTime) / 1000;
        // Clamp to positive
        if (startTimeOffset < 0) startTimeOffset = 0;
      }

      // 7. Broadcast to other users in the studio
      socket.to(studioId).emit("audio_chunk", {
        userId: socket.user.id,
        file,
        timestamp: timestamp || Date.now(),
        startTimeOffset,
      });

      // 8. Persist chunk for later FFmpeg merge (saveRecording flow)
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

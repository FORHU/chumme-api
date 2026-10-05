import { Server } from "socket.io";
import MusicStudioSvc from "../../services/music-studio.service";
import MusicStudioCacheSvc from "../../services/music-studio-cache.service";
import { AuthenticatedSocket } from "./types";
import { MusicStudioType } from "@prisma/client";
import MusicLibrarySvc from "../../services/music-library.service";
import MusicTempRecordSvc from "../../services/music-temp-record.service";
import logger from "../../utils/logger";

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
        logger.debug("[MusicStudio] audio_chunk dropped: file not found", {
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
        logger.debug("[MusicStudio] audio_chunk dropped: user cannot record", {
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

        logger.debug("[MusicStudio] RELAYSINGING check:", {
          currentSinger,
          currentRoleIndex,
          myId: socket.user.id,
        });

        // Role 0 = "All-Sing" / Chorus → everyone streams
        if (currentRoleIndex !== 0) {
          if (currentSinger && currentSinger !== socket.user.id) {
            logger.debug(
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
        logger.error("[MusicStudio] Failed to save temp chunk:", err);
        if (typeof callback === "function") {
          callback({ error: err.message || "Failed to save chunk" });
        }
      }
    },
  );

  /**
   * DISCARD TAKES (Retake)
   * Host-only. Deletes every participant's temp records for this studio + song
   * so a Save after Retake can't merge the discarded round. (A new
   * start-recording also clears them, but Retake → Save never calls it.)
   */
  socket.on(
    "discard_takes",
    async (data: { studioId: string; musicId: string }) => {
      try {
        const { studioId, musicId } = data;

        if (!studioId || !musicId) {
          return socket.emit("discard_takes_failed", {
            message: "studioId and musicId are required",
          });
        }

        if (!(await MusicStudioSvc.isHost(studioId, socket.user.id))) {
          return socket.emit("discard_takes_failed", {
            message: "Only owner or producers can discard takes",
          });
        }

        const state = await MusicStudioCacheSvc.getStudioState(studioId);
        if (state === "RECORDING") {
          return socket.emit("discard_takes_failed", {
            code: "RECORDING_IN_PROGRESS",
            message: "Stop the take before discarding",
          });
        }

        const { count } = await MusicTempRecordSvc.deleteChunksByMusicAndStudio(
          musicId,
          studioId,
        );

        io.to(studioId).emit("takes_discarded", {
          studioId,
          musicId,
          discardedCount: count,
          discardedBy: socket.user.id,
        });

        console.log(
          `[MusicStudio] ${socket.user.name} discarded ${count} temp records in ${studioId}`,
        );
      } catch (err: any) {
        console.error("[MusicStudio] Discard takes error:", err);
        socket.emit("discard_takes_failed", {
          message: err.message || "Failed to discard takes",
        });
      }
    },
  );

  /**
   * DELETE TAKE
   * Removes one uploaded take (all temp records for its fileId). Allowed for
   * the host or the singer who recorded it.
   */
  socket.on(
    "delete_take",
    async (data: { studioId: string; musicId: string; fileId: string }) => {
      try {
        const { studioId, musicId, fileId } = data;

        if (!studioId || !musicId || !fileId) {
          return socket.emit("delete_take_failed", {
            message: "studioId, musicId and fileId are required",
          });
        }

        const records = await MusicTempRecordSvc.getChunksByFile(
          studioId,
          musicId,
          fileId,
        );
        if (!records.length) {
          return socket.emit("delete_take_failed", {
            code: "TAKE_NOT_FOUND",
            fileId,
            message: "Take not found",
          });
        }

        const ownerId = (records[0].metaData as any)?.userId ?? null;
        const isTakeOwner = ownerId === socket.user.id;
        if (
          !isTakeOwner &&
          !(await MusicStudioSvc.isHost(studioId, socket.user.id))
        ) {
          return socket.emit("delete_take_failed", {
            message: "Only the host or the take's singer can delete it",
          });
        }

        await MusicTempRecordSvc.deleteChunksByFile(studioId, musicId, fileId);

        io.to(studioId).emit("take_deleted", {
          studioId,
          musicId,
          fileId,
          userId: ownerId,
          deletedBy: socket.user.id,
        });
      } catch (err: any) {
        console.error("[MusicStudio] Delete take error:", err);
        socket.emit("delete_take_failed", {
          message: err.message || "Failed to delete take",
        });
      }
    },
  );
};

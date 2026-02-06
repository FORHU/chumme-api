import { Server } from "socket.io";
import MusicStudioSvc from "../../services/music-studio.service";
import MusicStudioCacheSvc from "../../services/music-studio-cache.service";
import { AuthenticatedSocket } from "./types";
import { StudioType } from "@prisma/client";

export const registerMediaHandlers = (
  io: Server,
  socket: AuthenticatedSocket,
) => {
  /**
   * AUDIO CHUNK
   * Real-time audio streaming between users
   */
  socket.on(
    "audio_chunk",
    async (data: { studioId: string; chunk: Buffer | string }) => {
      const { studioId, chunk } = data;

      if (!studioId || !chunk) return;

      // Role-based streaming check (Singers/Producers only)
      const canStream = await MusicStudioSvc.canRecord(
        studioId,
        socket.user.id,
      );
      if (!canStream) return;

      // Mode-specific check: RELAYSINGING (only current singer can stream)
      const cachedType = await MusicStudioCacheSvc.getStudioType(studioId);

      if (cachedType === StudioType.RELAYSINGING) {
        const [currentSinger, currentRoleIndex] = await Promise.all([
          MusicStudioCacheSvc.getCurrentSinger(studioId),
          MusicStudioCacheSvc.getCurrentRoleIndex(studioId),
        ]);

        // Role 0 is "All-Sing" / Chorus bypass
        if (currentRoleIndex === 0) {
          // Allow everyone to stream
        } else if (currentSinger && currentSinger !== socket.user.id) {
          return; // Not the current singer, drop the chunk
        }
      }

      // Broadcast to other users in the studio
      socket.to(studioId).emit("audio_chunk", {
        userId: socket.user.id,
        chunk,
        timestamp: Date.now(),
      });
    },
  );
};

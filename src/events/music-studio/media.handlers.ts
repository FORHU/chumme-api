import { Server } from "socket.io";
import MusicStudioSvc from "../../services/music-studio.service";
import { AuthenticatedSocket } from "./types";

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

      // Role-based streaming check
      const canStream = await MusicStudioSvc.canRecord(
        studioId,
        socket.user.id,
      );
      if (!canStream) return;

      // Broadcast to other users in the studio
      socket.to(studioId).emit("audio_chunk", {
        userId: socket.user.id,
        chunk,
        timestamp: Date.now(),
      });
    },
  );
};

import { Server } from "socket.io";
import SportMessageSvc from "../../services/sport-message.service";
import logger from "../../utils/logger";

/**
 * Live chat in a match room.
 *
 * Separate from the Circles handlers on purpose. A match room has no
 * membership, no key password, no presence roster and no threads — joining is
 * just subscribing to a fixture's broadcast channel. Reusing `join_room` would
 * have meant teaching every Circle code path about a room type that shares none
 * of its rules.
 */

/**
 * Namespaced so a fixture id can never collide with a ChummeSubCategory id in
 * socket.io's flat room registry — both are UUIDs, and a collision would cross
 * two unrelated conversations into each other.
 */
const roomKey = (eventId: string) => `sport:${eventId}`;

export const registerMatchRoomHandlers = (io: Server, socket: any) => {
  socket.on("sport_join", (data: any) => {
    const eventId = typeof data === "string" ? data : data?.eventId;
    if (!eventId) {
      return socket.emit("sport_join_failed", { message: "eventId missing" });
    }

    socket.join(roomKey(eventId));
    socket.emit("sport_join_success", { eventId });
  });

  socket.on("sport_leave", (data: any) => {
    const eventId = typeof data === "string" ? data : data?.eventId;
    if (eventId) socket.leave(roomKey(eventId));
  });

  socket.on("sport_message", async (data: any) => {
    try {
      const {
        eventId,
        sportTeamId,
        content,
        voiceMessageId,
        duration,
        waveform,
      } = data ?? {};

      if (!eventId || !sportTeamId) {
        return socket.emit("sport_message_failed", {
          message: "eventId and sportTeamId are required",
        });
      }

      // The service re-validates that the claimed side is actually playing.
      // Doing it there rather than here means the HTTP path cannot skip it.
      const message = await SportMessageSvc.sendMessage({
        sportEventId: eventId,
        sportTeamId,
        authorId: socket.user.id,
        content,
        voiceMessageId,
        duration,
        waveform,
      });

      // Broadcast to everyone including the sender: the client renders from the
      // server's row, so an optimistic local copy would have a different id and
      // duplicate once the real one arrived.
      io.to(roomKey(eventId)).emit("sport_message", message);
    } catch (error: any) {
      logger.warn(`[MatchRoom] send failed: ${error?.message ?? error}`);
      socket.emit("sport_message_failed", {
        message: error?.message ?? "Could not send message",
      });
    }
  });
};

/**
 * Pushes an auto-posted match event to anyone currently in the room.
 *
 * The poller writes system messages from the worker process, which has no
 * socket server — without this, a goal announcement would sit in the database
 * until the reader happened to refetch.
 */
export const broadcastMatchSystemMessage = (
  io: Server,
  eventId: string,
  message: unknown,
) => {
  io.to(roomKey(eventId)).emit("sport_message", message);
};

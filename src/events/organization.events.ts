import { Server, Socket } from "socket.io";
import authenticateSocket from "../middleware/authenticate-sockets.middleware";
import RoomUserChatSvc from "../services/room-user-chat.service";
import CircleCacheSvc from "../services/circle-cache.service";
import { registerRoomHandlers } from "./circles/room.handlers";
import { registerMatchRoomHandlers } from "./sports/match-room.handlers";
import { PresenceBatcher } from "../utils/presence-batcher";

interface AuthenticatedSocket extends Socket {
  user?: any;
}

export default (io: Server) => {
  const presenceBatcher = new PresenceBatcher(
    io,
    (roomId) => CircleCacheSvc.getRoomPresence(roomId),
    "circle_presence_update",
  );

  io.use((socket: AuthenticatedSocket, next) => {
    authenticateSocket(socket, (err?: Error) => {
      if (err) {
        console.error("[Circles] Socket authentication failed!");
        next(err);
      } else {
        console.log("[Circles] Socket authenticated successfully!");
        next();
      }
    });
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log("[Circles] User connected:", socket.user.id);

    // Register modular Circles handlers
    registerRoomHandlers(io, socket, presenceBatcher);

    // Match rooms share the connection but nothing else — their events are
    // namespaced `sport_*` and their room keys prefixed, so the two chat
    // systems cannot reach into one another.
    registerMatchRoomHandlers(io, socket);

    socket.on("disconnect", async () => {
      try {
        const userRooms = await RoomUserChatSvc.getRoomsByUserId(
          socket.user.id,
        );

        for (const room of userRooms) {
          const roomId = room.chummeSubCategoryId;
          const userId = socket.user.id;

          // 1. Mark as disconnected in Redis
          await CircleCacheSvc.updatePresenceStatus(roomId, userId, false);

          // 2. Wait for 15 seconds (grace period)
          setTimeout(async () => {
            try {
              // 3. Check if they are still disconnected
              const presence = await CircleCacheSvc.getMemberPresence(
                roomId,
                userId,
              );

              if (presence && !presence.isConnected) {
                // Still disconnected -> Cleanup
                presenceBatcher.addLeave(roomId, userId);
                await CircleCacheSvc.removeRoomPresence(roomId, userId);
                console.log(
                  `[Circles] User ${userId} removed after grace period from ${roomId}`,
                );
              }
            } catch (err) {
              console.error("[Circles] Grace period cleanup error:", err);
            }
          }, 15000);
        }

        console.log(
          "[Circles] Client disconnected (grace period started):",
          socket.user.id,
        );
      } catch (err) {
        console.error("[Circles] Disconnect error:", err);
      }
    });
  });
};

import { Server } from "socket.io";
import authenticateSocket from "../middleware/authenticate-sockets.middleware";
import { AuthenticatedSocket } from "./music-studio/types";
import { registerSessionHandlers } from "./music-studio/session.handlers";
import { registerSingerHandlers } from "./music-studio/singer.handlers";
import { registerProductionHandlers } from "./music-studio/production.handlers";
import { registerMediaHandlers } from "./music-studio/media.handlers";
import MusicStudioCacheSvc from "../services/music-studio-cache.service";
import { PresenceBatcher } from "../utils/presence-batcher";
import logger from "../utils/logger";

export default (io: Server) => {
  const presenceBatcher = new PresenceBatcher(
    io,
    (studioId) => MusicStudioCacheSvc.getMembers(studioId),
    "studio_presence_update",
  );
  // Middleware for socket authentication
  io.use((socket: AuthenticatedSocket, next) => {
    authenticateSocket(socket, (err?: Error) => {
      if (err) {
        logger.warn("[MusicStudio] Socket authentication failed!");
        next(err);
      } else {
        logger.debug("[MusicStudio] Socket authenticated successfully!");
        next();
      }
    });
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    logger.debug("[MusicStudio] User connected:", socket.user.id);

    // Register modular handlers
    registerSessionHandlers(io, socket, presenceBatcher);
    registerSingerHandlers(io, socket);
    registerProductionHandlers(io, socket);
    registerMediaHandlers(io, socket);
  });
};

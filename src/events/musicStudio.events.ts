import { Server } from "socket.io";
import authenticateSocket from "../middleware/authenticate-sockets.middleware";
import { AuthenticatedSocket } from "./music-studio/types";
import { registerSessionHandlers } from "./music-studio/session.handlers";
import { registerSingerHandlers } from "./music-studio/singer.handlers";
import { registerProductionHandlers } from "./music-studio/production.handlers";
import { registerMediaHandlers } from "./music-studio/media.handlers";

export default (io: Server) => {
  // Middleware for socket authentication
  io.use((socket: AuthenticatedSocket, next) => {
    authenticateSocket(socket, (err?: Error) => {
      if (err) {
        console.error("[MusicStudio] Socket authentication failed!");
        next(err);
      } else {
        console.log("[MusicStudio] Socket authenticated successfully!");
        next();
      }
    });
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log("[MusicStudio] User connected:", socket.user.id);

    // Register modular handlers
    registerSessionHandlers(io, socket);
    registerSingerHandlers(io, socket);
    registerProductionHandlers(io, socket);
    registerMediaHandlers(io, socket);
  });
};

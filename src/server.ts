// src/server.ts
import app from "./app";
import { PORT } from "./config";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import socketHandler from "./socketHandler";

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: "*" },
});

socketHandler(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



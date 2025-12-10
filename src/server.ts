// src/server.ts
import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { PORT } from "./config";
import initializeSocket from "./socket";

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Initialize socket events
initializeSocket(io);

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

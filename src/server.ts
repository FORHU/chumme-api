// src/server.ts
import express from "express";
import http from "http";
import { Server } from "socket.io";
import socketHandler from "./socketHandler"; // your handler

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }, // allow all origins for testing
});

socketHandler(io); // attach your socket events

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// src/socketHandler.ts
import { Server, Socket } from "socket.io";

interface JoinData {
  room: string;
}

interface ChatMessage {
  user: string;
  message: string;
  room?: string;
}

export default (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });

    socket.on("join", (data: JoinData) => {
      console.log(`Client ${socket.id} joined room:`, data.room);
      socket.join(data.room);
      socket.emit("joined", { room: data.room, message: "Welcome!" });
    });

    socket.on("chat_message", (data: ChatMessage) => {
      console.log(`Message from ${data.user}: ${data.message}`);
      if (data.room) {
        io.to(data.room).emit("chat_message", data);
      } else {
        io.emit("chat_message", data);
      }
    });
  });
};

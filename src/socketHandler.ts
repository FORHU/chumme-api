import { Server, Socket } from "socket.io";

interface JoinData {
  room: string;
}

interface ChatMessage {
  user: string;
  message: string;
  room?: string;
  timestamp?: string;
  count?: number;
}

export default (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("join", (data: JoinData) => {
      console.log(`${socket.id} joined room: ${data.room}`);
      socket.join(data.room);
      socket.emit("joined", { room: data.room, message: "Welcome!" });
    });

    // socket.on("chat_message", (data: ChatMessage) => {
    //   console.log(`Message from ${data.user}: ${data.message}`);
    //   io.to(data.room || "").emit("chat_message", data); // send to room
    //   socket.emit("message_sent", data); // confirm sent to sender
    // });

    socket.on("chat_message", (data: ChatMessage) => {
      console.log(`Message from ${data.user}: ${data.message}`);
      // Send to everyone in the room except the sender
      if (data.room) {
        socket.to(data.room).emit("chat_message", data);
      }
      // Confirm sent only to sender
      socket.emit("message_sent", data);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};

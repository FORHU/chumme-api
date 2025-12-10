import { Server, Socket } from "socket.io";

export default (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join_room", (roomId: string) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on("leave_room", (roomId: string) => {
      socket.leave(roomId);
      console.log(`User ${socket.id} left room ${roomId}`);
    });

    socket.on("send_message", (data: any) => {
      console.log(`Message in room ${data.roomId}:`, data);
      // Broadcast to everyone in the room (including sender)
      // socket.to(data.roomId).emit("receive_message", data); 
    
      io.to(data.roomId).emit("receive_message", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected", socket.id);
    });
  });
};

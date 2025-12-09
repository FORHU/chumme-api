import { Server, Socket } from "socket.io";
interface ChatMessage {
  username: string;
  text: string;
}

export default (io: Server) => {
  const namespace = io.of("/organization-chat");

  let connectedUsers = 0;

  namespace.on("connection", (socket: Socket) => {
    console.log("User connected to organization chat");

    connectedUsers++;
    // Broadcast updated user count
    namespace.emit("usersCount", connectedUsers);

    // Listen for incoming chat messages
    socket.on("sendMessage", (message: ChatMessage) => {
      // Broadcast to all clients except the sender
      socket.broadcast.emit("receiveMessage", message);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      connectedUsers--;
      // Broadcast updated user count
      namespace.emit("usersCount", connectedUsers);
    });
  });
};


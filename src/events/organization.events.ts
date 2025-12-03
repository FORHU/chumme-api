import { Server } from "socket.io";
import UserChatSvc from "../services/userChat.service";

export default (io: Server) => {
  // io.on("connection", (socket) => {
  //     console.log("Client connected to /organization");

  //     socket.on("disconnect", () => {
  //         console.log("Client disconnected from /organization");
  //     });

  //     socket.on("join", (data) => {
  //         console.log("Client joined /organization", data);
  //     });

  //     socket.on("chat_message", (data) => {
  //         console.log("Client sent chat message", data);
  //     });
  // });

  // io.on("connection", async (data: Record<any, string>) => {
  //    await UserChatSvc.findRoomChatByUserId(data.userId);
  // })
  io.on("connection", (socket) => {
    console.log("+++++++++++++ Client connected:", socket.id);
// a6n_iburaLuiB4ETAAAB
    socket.on("init_user", async (data: { userId: string }) => {
      const room = await UserChatSvc.findRoomChatByUserId(data.userId);
      console.log("+++++++++++++ roomroom:", room);

      socket.emit("user_rooms", room);
    });

  });
};

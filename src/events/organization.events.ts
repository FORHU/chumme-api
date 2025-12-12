import { Server, Socket } from "socket.io";
import RoomSvc from "../services/room.service";
import authenticateSocket from "../middleware/authenticate-sockets.middleware";
import UserChatSvc from "../services/user-chat.service";
import MessageSvc from "../services/message.service";
import RoomMemberSvc from "../services/room-member.service";
interface ChatMessage {
  username: string;
  text: string;
}
interface AuthenticatedSocket extends Socket {
  user?: any;
}

export default (io: Server) => {
  io.use((socket: AuthenticatedSocket, next) => {
    authenticateSocket(socket, (err?: Error) => {
      if (err) {
        console.error("Socket authentication failed!");
        next(err);
      } else {
        console.log("Socket authenticated successfully!");
        next();
      }
    });
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log("User connected:", socket.user.id);

    socket.join("organization-chat");

    socket.on("join_room", async ({ room_id }) => {
      try {
        const room = await RoomSvc.findById(room_id);
        if (!room) {
          return socket.emit("join_room_failed", {
            room_id,
            message: "Room does not exist",
          });
        }
        const existing = await UserChatSvc.findUserInRoom(
          socket.user.id,
          room_id
        );
  
        if (existing?.length === 0) {
          const userChatRole = "member";
          await UserChatSvc.createUserChat(
            socket.user.id,
            room_id,
            userChatRole
          );
          console.log(`✔ ${socket.user.id} join the room ${room_id}`);
        } else {
          return socket.emit("join_room_info", {
            message: "User already in the room",
          });
        }

        socket.join(room_id);

        socket.emit("join_room_success", {
          room_id,
          message: "Successfully joined room",
        });

        socket.to(room_id).emit("user_joined", {
          userId: socket.user.id,
          user: socket.user,
          room_id,
        });
      } catch (err) {
        console.error(err);
      }
    });

    socket.on("send_message_to_room", async (data: any) => {
      const { room_id, message, attachments = [] } = data;
      if (!room_id)
        return socket.emit("not_allowed", { message: "room_id missing" });

      if (!message || message.trim() === "") return;

      const isMember = await UserChatSvc.findUserInRoom(
        socket.user.id,
        room_id
      );

      if (!isMember?.length) {
        return socket.emit("not_allowed", {
          message: "You are not a member of this room.",
        });
      }

      io.to(room_id).emit("send_message_to_room", {
        room_id,
        sender: socket.user,
        content: message,
        attachments: [],
        createdAt: new Date().toISOString(),
      });
      await MessageSvc.createMessage(room_id, socket.user.id, message);
      console.log(`✔ ${socket.user.id} sent a message in ${room_id}: ${message}`);
    });

    socket.on("leave_room", async ({ room_id, roomName }) => {
      try {
        const room = await RoomSvc.findById(room_id);
        if (!room) {
          return socket.emit("leave_room_failed", {
            message: "Room does not exist",
          });
        }

        const existing = await UserChatSvc.findUserInRoom(
          socket.user.id,
          room_id
        );

        if (existing?.length) {
          await UserChatSvc.leaveUserChat(socket.user.id, room_id);
          console.log(`✔ ${socket.user.id} left the room ${room_id}`);
        } else {
          return socket.emit("join_room_info", {
            message: "User already left the room",
          });
        }

        socket.leave(room_id);
        socket.leave(roomName);

        socket.emit("leave_room_success", {
          room_id,
          roomName,
          message: "Successfully left the room",
        });

        socket.to(room_id).emit("user_leave", {
          userId: socket.user.id,
          user: socket.user,
          room_id,
        });
      } catch (err) {
        console.error(err);
        socket.emit("leave_room_failed", {
          message: "Unexpected error leaving room",
        });
      }
    });

    socket.on("disconnect", async () => {
      const userRoom = await RoomMemberSvc.getRoomsByUserId(socket.user.id);
      const roomName = userRoom.map((rooms) => rooms.room.name);
      if (roomName[0]) {
        socket.leave(roomName[0]);
      }
      if (socket.user?.id) await RoomMemberSvc.leaveAllRooms(socket.user.id);
      console.log(
        "Client disconnected from organization namespace",
        socket.user.id
      );
    });
  });
};

import { Server } from "socket.io";
import RoomSvc from "../../services/room.service";
import UserChatSvc from "../../services/user-chat.service";
import MessageSvc from "../../services/message.service";
import CircleCacheSvc from "../../services/circle-cache.service";
import { PresenceBatcher } from "../../utils/presence-batcher";

export const registerRoomHandlers = (
  io: Server,
  socket: any,
  presenceBatcher: PresenceBatcher,
) => {
  /**
   * JOIN ROOM
   */
  socket.on("join_room", async (data: any) => {
    try {
      const room_id = typeof data === "string" ? data : data.room_id;
      const roomName =
        typeof data === "object" ? data.roomName : "Unknown Room";

      if (!room_id) {
        return socket.emit("join_room_failed", { message: "room_id missing" });
      }

      const room = await RoomSvc.findById(room_id);
      if (!room) {
        return socket.emit("join_room_failed", {
          room_id,
          message: "Room does not exist",
        });
      }

      // Persistent Membership (UserChat)
      const existing = await UserChatSvc.findUserInRoom(
        socket.user.id,
        room_id,
      );
      if (existing?.length === 0) {
        await UserChatSvc.createUserChat(socket.user.id, room_id, "member");
        console.log(
          `[Circles] Persistent membership created for ${socket.user.id} in ${room_id}`,
        );
      }

      // Ephemeral Presence (Redis)
      await CircleCacheSvc.addRoomPresence(room_id, socket.user.id, {
        userId: socket.user.id,
        name: socket.user.name,
        avatar: socket.user.avatar,
      });

      socket.join(room_id);

      socket.emit("join_room_success", {
        room_id,
        message: "Successfully joined room",
      });

      presenceBatcher.addJoin(room_id, socket.user.id);

      console.log(
        `[Circles] ✔ ${socket.user.name} joined room: ${roomName} (${room_id})`,
      );
    } catch (err) {
      console.error("[Circles] Join room error:", err);
      socket.emit("join_room_failed", { message: "Internal server error" });
    }
  });

  /**
   * SEND MESSAGE
   */
  socket.on("send_message_to_room", async (data: any) => {
    try {
      const { room_id, message, roomName, voiceMessageId } = data;
      if (!room_id || !message || message.trim() === "") {
        return socket.emit("not_allowed", {
          message: "Missing required fields",
        });
      }

      // Check membership (Persistent)
      const isMember = await UserChatSvc.findUserInRoom(
        socket.user.id,
        room_id,
      );
      if (!isMember?.length) {
        return socket.emit("not_allowed", {
          message: "You are not a member of this room.",
        });
      }

      const newMessage = await MessageSvc.createMessage(
        room_id,
        socket.user.id,
        message,
        voiceMessageId,
      );

      const mappedMessage = await RoomSvc.mapMessageWithSignedUrl(newMessage);

      io.to(room_id).emit("send_message_to_room", {
        ...mappedMessage,
        room_id,
      });

      console.log(
        `[Circles] 💬 ${socket.user.name} in ${roomName}: ${message.substring(0, 30)}${message.length > 30 ? "..." : ""}`,
      );
    } catch (err) {
      console.error("[Circles] Send message error:", err);
    }
  });

  /**
   * LEAVE ROOM (Presence only, keeps persistent membership)
   */
  socket.on("leave_room", async (data: any) => {
    try {
      const room_id = typeof data === "string" ? data : data.room_id;
      if (!room_id) return;

      await CircleCacheSvc.removeRoomPresence(room_id, socket.user.id);
      socket.leave(room_id);

      presenceBatcher.addLeave(room_id, socket.user.id);

      socket.emit("leave_room_success", { room_id });
      console.log(
        `[Circles] 🚪 ${socket.user.name} left room presence: ${room_id}`,
      );
    } catch (err) {
      console.error("[Circles] Leave room error:", err);
    }
  });
};

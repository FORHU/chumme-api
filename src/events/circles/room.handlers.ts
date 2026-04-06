import { Server } from "socket.io";
import ChummeSubCategorySvc from "../../services/chumme-subcategory.service";
import RoomUserChatSvc from "../../services/room-user-chat.service";
import RoomMessageSvc from "../../services/room-message.service";
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

      const room = await ChummeSubCategorySvc.findById(room_id);
      if (!room) {
        return socket.emit("join_room_failed", {
          room_id,
          message: "Room does not exist",
        });
      }

      // Persistent Membership (RoomUserChat)
      const isMember = await RoomUserChatSvc.checkMembership(
        socket.user.id,
        room_id,
      );
      if (!isMember) {
        await RoomUserChatSvc.joinRoom(
          socket.user.id,
          room_id,
          data.keyPassword,
          "MEMBER",
        );
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
      const { room_id, message, roomName, voiceMessageId, parentMessageId, duration, waveform } =
        data;
      if (!room_id || !message || message.trim() === "") {
        return socket.emit("not_allowed", {
          message: "Missing required fields",
        });
      }

      // 1. Send message via service (it will check membership)
      const newMessage = await RoomMessageSvc.createMessage({
        chummeSubCategoryId: room_id,
        userId: socket.user.id,
        content: message,
        voiceMessageId,
        parentMessageId,
      });

      // 2. Map message for frontend
      const mappedMessage =
        await ChummeSubCategorySvc.mapMessageWithSignedUrl(newMessage);

      // 3. If client sent duration/waveform, enrich the voiceNote
      if (mappedMessage.voiceNote && (duration || waveform)) {
        mappedMessage.voiceNote.duration = duration || mappedMessage.voiceNote.duration;
        mappedMessage.voiceNote.waveform = waveform || mappedMessage.voiceNote.waveform;
      }

      // 4. Broadcast
      io.to(room_id).emit("send_message_to_room", {
        ...mappedMessage,
        room_id,
      });

      console.log(
        `[Circles] 💬 ${socket.user.name} in ${roomName}: ${message.substring(0, 30)}${message.length > 30 ? "..." : ""}`,
      );
    } catch (err: any) {
      console.error("[Circles] Send message error:", err);
      socket.emit("error", {
        message: err.message || "Failed to send message",
      });
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

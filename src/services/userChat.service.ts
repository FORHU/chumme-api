import UserChatRepo from "../repositories/userChat.repository";
import CacheUtil from "../utils/cache.util";

export default class UserChatSvc {
  static async fetchActiveRooms(userId: string) {
    return await UserChatRepo.fetchActiveRooms(userId);
    // return await UserChatRepo.findRoomChatByUserId(userId);
  }
  static async getRoomMembers(roomId: string) {
    return await UserChatRepo.getRoomMembers(roomId);
  }
  static async createUserChatRoom(userId: string, name: string, note: string) {
    const roomByName = await UserChatRepo.fetchRoomName(name);
    if (roomByName) {
      throw new Error("Name Already Exist!");
    }
    const chatRoom = await UserChatRepo.createUserChatRoom(userId, name, note);
    // const usersInChatRoom = await UserChatRepo.createUserChat(
    //   chatRoom.id,
    //   userId
    // );
    
    return {
      message: "Room has been Created!",
      room: chatRoom,
      // userChat: usersInChatRoom,
    };
  }

  static async fetchRoomById(roomId: string){
    return await UserChatRepo.fetchRoomById(roomId);
  }

  static async fetchRoomNameList() {
    return await UserChatRepo.fetchRoomNameList();
  }

  static async removeUserInRoomChat(
    userId: string,
    roomId: string,
    memberId: string
  ) {
    const checkMember = await UserChatRepo.findRoomMember(roomId, memberId);
    if (userId === memberId) {
      throw new Error("Cannot remove chat creator!");
    }

    const usersInChat = await UserChatRepo.removeUserInRoomChat(
      roomId,
      memberId
    );

    return usersInChat;
  }

  static async updateUserChatRoomPrivacy(roomId: string, isPrivate: boolean) {
    const usersInChat = await UserChatRepo.updateUserChatRoomPrivacy(
      roomId,
      isPrivate
    );

    return usersInChat;
  }
  static async deleteRoomChat(userId: string, roomId: string) {
    return await UserChatRepo.deleteRoomChat(roomId, userId);
  }
}

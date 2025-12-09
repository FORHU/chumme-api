import RoomMemberRepo from "../repositories/roomMember.repository";

export default class RoomMemberSvc {
  /**
   * Get room members
   * Only room members can view the member list
   */
  static async getRoomMembers(roomId: string, userId: string) {
    // Check if user is a member of the room
    const isMember = await RoomMemberRepo.isUserRoomMember(roomId, userId);
    if (!isMember) {
      return null;
    }

    return RoomMemberRepo.getRoomMembers(roomId);
  }
}

import MessageRepo from "../repositories/message.repository";
import RoomSvc from "../services/room.service";

const AD_INTERVAL = 10; // every 10 messages

export default class MessageAdSvc {
  static async shouldInsertAd(roomId: string) {
    const room = await RoomSvc.findById(roomId);
    if (!room || typeof room !== "object" || !(room as any).shouldInsertAd) {
      return false;
    }

    const count = await MessageRepo.count({
      roomId,
      isAd: false, // count only real messages
    });

    return count > 0 && count % AD_INTERVAL === 0;
  }

  static async createAdMessage(
    roomId: string,
    adContent: string,
    authorId: string,
    adMeta: { adType: string; label?: string; campaign?: string },
  ) {
    return MessageRepo.createAdMessage(roomId, authorId, adContent, adMeta);
  }
}

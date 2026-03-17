import RedisUtil from "../utils/redis.util";

/**
 * Service to handle Circle room ephemeral data in Redis.
 */
export default class CircleCacheSvc {
  private static readonly CIRCLE_PREFIX = "circle:";
  private static readonly TTL = 86400; // 24 hours

  private static get client() {
    return RedisUtil.useConnection();
  }

  static async addRoomPresence(roomId: string, userId: string, userData: any) {
    if (!this.client) return;
    const key = `${this.CIRCLE_PREFIX}${roomId}:presence`;
    const data = {
      ...userData,
      isConnected: true,
      lastSeen: new Date().toISOString(),
    };
    await this.client.hSet(key, userId, JSON.stringify(data));
    await this.client.expire(key, this.TTL);
  }

  static async removeRoomPresence(roomId: string, userId: string) {
    if (!this.client) return;
    const key = `${this.CIRCLE_PREFIX}${roomId}:presence`;
    await this.client.hDel(key, userId);
  }

  static async updatePresenceStatus(
    roomId: string,
    userId: string,
    isConnected: boolean,
  ) {
    if (!this.client) return;
    const key = `${this.CIRCLE_PREFIX}${roomId}:presence`;
    const memberJson = await this.client.hGet(key, userId);
    if (memberJson) {
      const memberData = JSON.parse(memberJson);
      memberData.isConnected = isConnected;
      memberData.lastSeen = new Date().toISOString();
      await this.client.hSet(key, userId, JSON.stringify(memberData));
    }
  }

  static async getRoomPresence(roomId: string) {
    if (!this.client) return [];
    const key = `${this.CIRCLE_PREFIX}${roomId}:presence`;
    const members = await this.client.hGetAll(key);
    return Object.values(members).map((m) => JSON.parse(m));
  }

  static async getMemberPresence(roomId: string, userId: string) {
    if (!this.client) return null;
    const key = `${this.CIRCLE_PREFIX}${roomId}:presence`;
    const memberJson = await this.client.hGet(key, userId);
    return memberJson ? JSON.parse(memberJson) : null;
  }
}

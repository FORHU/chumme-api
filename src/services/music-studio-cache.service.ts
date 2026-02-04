import RedisUtil from "../utils/redis.util";

/**
 * Service to handle Music Studio ephemeral data in Redis.
 * Caches: active members, recording state, singer requests, and lyric sync.
 */
export default class MusicStudioCacheSvc {
  private static readonly STUDIO_PREFIX = "studio:";
  private static readonly TTL = 86400; // 24 hours in seconds

  private static get client() {
    return RedisUtil.useConnection();
  }

  /**
   * Add a member to the studio cache
   */
  static async addMember(studioId: string, userId: string, userData: any) {
    const key = `${this.STUDIO_PREFIX}${studioId}:members`;
    const data = {
      ...userData,
      isConnected: true,
      lastSeen: new Date().toISOString(),
    };
    await this.client.hSet(key, userId, JSON.stringify(data));
    await this.client.expire(key, this.TTL);
  }

  /**
   * Remove a member from the studio cache
   */
  static async removeMember(studioId: string, userId: string) {
    const key = `${this.STUDIO_PREFIX}${studioId}:members`;
    await this.client.hDel(key, userId);
  }

  /**
   * Update member connection status
   */
  static async updateMemberStatus(
    studioId: string,
    userId: string,
    isConnected: boolean,
  ) {
    const key = `${this.STUDIO_PREFIX}${studioId}:members`;
    const memberJson = await this.client.hGet(key, userId);
    if (memberJson) {
      const memberData = JSON.parse(memberJson);
      memberData.isConnected = isConnected;
      memberData.lastSeen = new Date().toISOString();
      await this.client.hSet(key, userId, JSON.stringify(memberData));
    }
  }

  /**
   * Get all active members in the studio
   */
  static async getMembers(studioId: string) {
    const key = `${this.STUDIO_PREFIX}${studioId}:members`;
    const members = await this.client.hGetAll(key);
    return Object.values(members).map((m) => JSON.parse(m));
  }

  /**
   * Get a specific member from the studio cache
   */
  static async getMember(studioId: string, userId: string) {
    const key = `${this.STUDIO_PREFIX}${studioId}:members`;
    const memberJson = await this.client.hGet(key, userId);
    return memberJson ? JSON.parse(memberJson) : null;
  }

  /**
   * Set recording state (IDLE, RECORDING, PLAYBACK)
   */
  static async setStudioState(studioId: string, state: string) {
    const key = `${this.STUDIO_PREFIX}${studioId}:state`;
    await this.client.set(key, state, { EX: this.TTL });
  }

  /**
   * Get current studio state
   */
  static async getStudioState(studioId: string) {
    const key = `${this.STUDIO_PREFIX}${studioId}:state`;
    return (await this.client.get(key)) || "IDLE";
  }

  /**
   * Add a singer request
   */
  static async addSingerRequest(
    studioId: string,
    userId: string,
    userData: any,
  ) {
    const key = `${this.STUDIO_PREFIX}${studioId}:requests`;
    await this.client.hSet(
      key,
      userId,
      JSON.stringify({
        ...userData,
        requestedAt: new Date().toISOString(),
      }),
    );
    await this.client.expire(key, this.TTL);
  }

  /**
   * Remove a singer request (after approval/rejection)
   */
  static async removeSingerRequest(studioId: string, userId: string) {
    const key = `${this.STUDIO_PREFIX}${studioId}:requests`;
    await this.client.hDel(key, userId);
  }

  /**
   * Get all pending singer requests
   */
  static async getSingerRequests(studioId: string) {
    const key = `${this.STUDIO_PREFIX}${studioId}:requests`;
    const requests = await this.client.hGetAll(key);
    return Object.values(requests).map((r) => JSON.parse(r));
  }

  /**
   * Sync lyric progress
   */
  static async setLyricIndex(studioId: string, index: number) {
    const key = `${this.STUDIO_PREFIX}${studioId}:lyric`;
    await this.client.set(key, index.toString(), { EX: this.TTL });
  }

  /**
   * Get current lyric progress
   */
  static async getLyricIndex(studioId: string) {
    const key = `${this.STUDIO_PREFIX}${studioId}:lyric`;
    const index = await this.client.get(key);
    return index ? parseInt(index) : 0;
  }

  /**
   * Set max members for a studio
   */
  static async setMaxMembers(studioId: string, count: number) {
    const key = `${this.STUDIO_PREFIX}${studioId}:maxMembers`;
    await this.client.set(key, count.toString(), { EX: this.TTL });
  }

  /**
   * Get max members for a studio (default 20)
   */
  static async getMaxMembers(studioId: string) {
    const key = `${this.STUDIO_PREFIX}${studioId}:maxMembers`;
    const count = await this.client.get(key);
    return count ? parseInt(count) : 20;
  }

  /**
   * Add a user to the performance queue
   */
  static async addToQueue(studioId: string, userId: string) {
    const key = `${this.STUDIO_PREFIX}${studioId}:queue`;
    await this.client.rPush(key, userId);
    await this.client.expire(key, this.TTL);
  }

  /**
   * Remove a user from the performance queue
   */
  static async removeFromQueue(studioId: string, userId: string) {
    const key = `${this.STUDIO_PREFIX}${studioId}:queue`;
    await this.client.lRem(key, 0, userId);
  }

  /**
   * Get the current performance queue
   */
  static async getQueue(studioId: string) {
    const key = `${this.STUDIO_PREFIX}${studioId}:queue`;
    return this.client.lRange(key, 0, -1);
  }

  /**
   * Reorder the performance queue (atomically replace)
   */
  static async reorderQueue(studioId: string, userIds: string[]) {
    const key = `${this.STUDIO_PREFIX}${studioId}:queue`;
    await this.client
      .multi()
      .del(key)
      .rPush(key, userIds.length > 0 ? userIds : ["__EMPTY__"]) // Redis rPush needs at least one element for multi
      .expire(key, this.TTL)
      .exec();

    // If we added __EMPTY__, remove it (hack to handle empty reorders in multi)
    if (userIds.length === 0) {
      await this.client.del(key);
    } else {
      await this.client.lRem(key, 0, "__EMPTY__");
    }
  }

  /**
   * Clear all session data (on studio close)
   */
  static async clearStudioSession(studioId: string) {
    const keys = [
      `${this.STUDIO_PREFIX}${studioId}:members`,
      `${this.STUDIO_PREFIX}${studioId}:state`,
      `${this.STUDIO_PREFIX}${studioId}:requests`,
      `${this.STUDIO_PREFIX}${studioId}:lyric`,
      `${this.STUDIO_PREFIX}${studioId}:maxMembers`,
      `${this.STUDIO_PREFIX}${studioId}:queue`,
    ];
    await this.client.del(keys);
  }
}

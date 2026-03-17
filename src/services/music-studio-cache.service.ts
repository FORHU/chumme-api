import { MusicStudioType, MusicRelayMode } from "@prisma/client";
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
    if (!this.client) return;
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
    if (!this.client) return;
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
    if (!this.client) return;
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
    if (!this.client) return [];
    const key = `${this.STUDIO_PREFIX}${studioId}:members`;
    const members = await this.client.hGetAll(key);
    return Object.values(members).map((m) => JSON.parse(m));
  }

  /**
   * Get a specific member from the studio cache
   */
  static async getMember(studioId: string, userId: string) {
    if (!this.client) return null;
    const key = `${this.STUDIO_PREFIX}${studioId}:members`;
    const memberJson = await this.client.hGet(key, userId);
    return memberJson ? JSON.parse(memberJson) : null;
  }

  /**
   * Set recording state (IDLE, RECORDING, PLAYBACK)
   */
  static async setStudioState(studioId: string, state: string) {
    if (!this.client) return;
    const key = `${this.STUDIO_PREFIX}${studioId}:state`;
    await this.client.set(key, state, { EX: this.TTL });
  }

  /**
   * Get current studio state
   */
  static async getStudioState(studioId: string) {
    if (!this.client) return "IDLE";
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
    if (!this.client) return;
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
    if (!this.client) return;
    const key = `${this.STUDIO_PREFIX}${studioId}:requests`;
    await this.client.hDel(key, userId);
  }

  /**
   * Get all pending singer requests
   */
  static async getSingerRequests(studioId: string) {
    if (!this.client) return [];
    const key = `${this.STUDIO_PREFIX}${studioId}:requests`;
    const requests = await this.client.hGetAll(key);
    return Object.values(requests).map((r) => JSON.parse(r));
  }

  /**
   * Sync lyric progress
   */
  static async setLyricIndex(studioId: string, index: number) {
    if (!this.client) return;
    const key = `${this.STUDIO_PREFIX}${studioId}:lyric`;
    await this.client.set(key, index.toString(), { EX: this.TTL });
  }

  /**
   * Get current lyric progress
   */
  static async getLyricIndex(studioId: string) {
    if (!this.client) return 0;
    const key = `${this.STUDIO_PREFIX}${studioId}:lyric`;
    const index = await this.client.get(key);
    return index ? parseInt(index) : 0;
  }

  /**
   * Set active song for the studio
   */
  static async setActiveSong(studioId: string, musicId: string) {
    if (!this.client) return;
    const key = `${this.STUDIO_PREFIX}${studioId}:activeSong`;
    await this.client.set(key, musicId, { EX: this.TTL });
  }

  /**
   * Get currently active song in the studio
   */
  static async getActiveSong(studioId: string) {
    if (!this.client) return null;
    const key = `${this.STUDIO_PREFIX}${studioId}:activeSong`;
    return await this.client.get(key);
  }

  /**
   * Set the current active singer (for RELAYSINGING mode)
   */
  static async setCurrentSinger(studioId: string, userId: string | null) {
    if (!this.client) return;
    const key = `${this.STUDIO_PREFIX}${studioId}:currentSinger`;
    if (userId) {
      await this.client.set(key, userId, { EX: this.TTL });
    } else {
      await this.client.del(key);
    }
  }

  /**
   * Get the current active singer
   */
  static async getCurrentSinger(studioId: string) {
    if (!this.client) return null;
    const key = `${this.STUDIO_PREFIX}${studioId}:currentSinger`;
    return await this.client.get(key);
  }

  /**
   * Set the current active role index (0 for "All-Sing", 1+ for specific roles)
   */
  static async setCurrentRoleIndex(studioId: string, roleIndex: number | null) {
    if (!this.client) return;
    const key = `${this.STUDIO_PREFIX}${studioId}:currentRoleIndex`;
    if (roleIndex !== null) {
      await this.client.set(key, roleIndex.toString(), { EX: this.TTL });
    } else {
      await this.client.del(key);
    }
  }

  /**
   * Get the current active role index
   */
  static async getCurrentRoleIndex(studioId: string) {
    if (!this.client) return null;
    const key = `${this.STUDIO_PREFIX}${studioId}:currentRoleIndex`;
    const index = await this.client.get(key);
    return index !== null ? parseInt(index) : null;
  }

  /**
   * Set max members for a studio
   */
  static async setMaxMembers(studioId: string, count: number) {
    if (!this.client) return;
    const key = `${this.STUDIO_PREFIX}${studioId}:maxMembers`;
    await this.client.set(key, count.toString(), { EX: this.TTL });
  }

  /**
   * Get max members for a studio (default 20)
   */
  static async getMaxMembers(studioId: string) {
    if (!this.client) return 20;
    const key = `${this.STUDIO_PREFIX}${studioId}:maxMembers`;
    const count = await this.client.get(key);
    return count ? parseInt(count) : 20;
  }

  /**
   * Add a user to the performance queue
   */
  static async addToQueue(studioId: string, userId: string) {
    if (!this.client) return;
    const key = `${this.STUDIO_PREFIX}${studioId}:queue`;
    await this.client.rPush(key, userId);
    await this.client.expire(key, this.TTL);
  }

  /**
   * Remove a user from the performance queue
   */
  static async removeFromQueue(studioId: string, userId: string) {
    if (!this.client) return;
    const key = `${this.STUDIO_PREFIX}${studioId}:queue`;
    await this.client.lRem(key, 0, userId);
  }

  /**
   * Get the current performance queue
   */
  static async getQueue(studioId: string) {
    if (!this.client) return [];
    const key = `${this.STUDIO_PREFIX}${studioId}:queue`;
    return this.client.lRange(key, 0, -1);
  }

  /**
   * Reorder the performance queue (atomically replace)
   */
  static async reorderQueue(studioId: string, userIds: string[]) {
    if (!this.client) return;
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
   * Set the studio type (RELAYSINGING, CROWDSINGING) in Redis
   */
  static async setStudioType(studioId: string, type: MusicStudioType) {
    if (!this.client) return;
    const key = `${this.STUDIO_PREFIX}${studioId}:type`;
    await this.client.set(key, type, { EX: this.TTL });
  }

  /**
   * Get the studio type from Redis
   */
  static async getStudioType(studioId: string) {
    if (!this.client) return null;
    const key = `${this.STUDIO_PREFIX}${studioId}:type`;
    return await this.client.get(key);
  }

  /**
   * Set the studio relay mode (MANUAL, INTERVAL, PHRASING)
   */
  static async setRelayMode(studioId: string, mode: MusicRelayMode) {
    if (!this.client) return;
    const key = `${this.STUDIO_PREFIX}${studioId}:relayMode`;
    await this.client.set(key, mode, { EX: this.TTL });
  }

  /**
   * Get the studio relay mode
   */
  static async getRelayMode(studioId: string) {
    if (!this.client) return "MANUAL";
    const key = `${this.STUDIO_PREFIX}${studioId}:relayMode`;
    return (await this.client.get(key)) || "MANUAL";
  }

  /**
   * Set the relay interval (for INTERVAL mode)
   */
  static async setRelayInterval(studioId: string, interval: number) {
    if (!this.client) return;
    const key = `${this.STUDIO_PREFIX}${studioId}:relayInterval`;
    await this.client.set(key, interval.toString(), { EX: this.TTL });
  }

  /**
   * Get the relay interval
   */
  static async getRelayInterval(studioId: string) {
    if (!this.client) return 1;
    const key = `${this.STUDIO_PREFIX}${studioId}:relayInterval`;
    const interval = await this.client.get(key);
    return interval ? parseInt(interval) : 1;
  }

  /**
   * Set the phrasing performance map (for PHRASING mode)
   */
  static async setPhrasing(studioId: string, phrasing: any[]) {
    if (!this.client) return;
    const key = `${this.STUDIO_PREFIX}${studioId}:phrasing`;
    await this.client.set(key, JSON.stringify(phrasing), { EX: this.TTL });
  }

  /**
   * Get the phrasing performance map
   */
  static async getPhrasing(studioId: string): Promise<any[]> {
    if (!this.client) return [];
    const key = `${this.STUDIO_PREFIX}${studioId}:phrasing`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Add music to the queue
   * Redis Key: studio:{id}:musicQueue (List of JSON strings)
   * Limit: Max 10 songs per studio
   */
  static async addMusicToQueue(studioId: string, musicData: any) {
    if (!this.client) return;
    const key = `${this.STUDIO_PREFIX}${studioId}:musicQueue`;
    const length = await this.client.lLen(key);
    if (length >= 10) {
      throw new Error("Queue is full (max 10 songs)");
    }
    await this.client.rPush(key, JSON.stringify(musicData));
    await this.client.expire(key, this.TTL);
  }

  /**
   * Get the music queue
   * Returns: Array of music objects (FIFO order)
   */
  static async getMusicQueue(studioId: string) {
    if (!this.client) return [];
    const key = `${this.STUDIO_PREFIX}${studioId}:musicQueue`;
    const queue = await this.client.lRange(key, 0, -1);
    return queue.map((item) => JSON.parse(item));
  }

  /**
   * Remove music from queue by index
   * Strategy: Mark as deleted (__DELETED__) then remove from list
   */
  static async removeMusicFromQueue(studioId: string, index: number) {
    if (!this.client) return;
    const key = `${this.STUDIO_PREFIX}${studioId}:musicQueue`;
    // Mark as deleted then remove (Redis list manipulation)
    // UUID is safe unique marker
    const marker = "__DELETED__";
    await this.client.lSet(key, index, marker);
    await this.client.lRem(key, 0, marker);
  }

  /**
   * Pop the next music from queue
   * Operation: LPOP (Removes and returns the first item)
   */
  static async popNextMusic(studioId: string) {
    if (!this.client) return null;
    const key = `${this.STUDIO_PREFIX}${studioId}:musicQueue`;
    const item = await this.client.lPop(key);
    return item ? JSON.parse(item) : null;
  }

  /**
   * Clear music queue
   * Operation: DEL key
   */
  static async clearMusicQueue(studioId: string) {
    if (!this.client) return;
    const key = `${this.STUDIO_PREFIX}${studioId}:musicQueue`;
    await this.client.del(key);
  }

  /**
   * Set the recording start time (server reference time)
   */
  static async setRecordingStartTime(studioId: string, timestamp: number) {
    if (!this.client) return;
    const key = `${this.STUDIO_PREFIX}${studioId}:recordingStartTime`;
    await this.client.set(key, timestamp.toString(), { EX: this.TTL });
  }

  /**
   * Get the recording start time
   */
  static async getRecordingStartTime(studioId: string) {
    if (!this.client) return null;
    const key = `${this.STUDIO_PREFIX}${studioId}:recordingStartTime`;
    const time = await this.client.get(key);
    return time ? parseInt(time) : null;
  }

  /**
   * Set the recording end time
   */
  static async setRecordingEndTime(studioId: string, timestamp: number) {
    if (!this.client) return;
    const key = `${this.STUDIO_PREFIX}${studioId}:recordingEndTime`;
    await this.client.set(key, timestamp.toString(), { EX: this.TTL });
  }

  /**
   * Get the recording end time
   */
  static async getRecordingEndTime(studioId: string) {
    if (!this.client) return null;
    const key = `${this.STUDIO_PREFIX}${studioId}:recordingEndTime`;
    const time = await this.client.get(key);
    return time ? parseInt(time) : null;
  }

  /**
   * Clear all session data (on studio close)
   */
  static async clearStudioSession(studioId: string) {
    if (!this.client) return;
    const keys = [
      `${this.STUDIO_PREFIX}${studioId}:members`,
      `${this.STUDIO_PREFIX}${studioId}:state`,
      `${this.STUDIO_PREFIX}${studioId}:requests`,
      `${this.STUDIO_PREFIX}${studioId}:lyric`,
      `${this.STUDIO_PREFIX}${studioId}:maxMembers`,
      `${this.STUDIO_PREFIX}${studioId}:queue`,
      `${this.STUDIO_PREFIX}${studioId}:activeSong`,
      `${this.STUDIO_PREFIX}${studioId}:currentSinger`,
      `${this.STUDIO_PREFIX}${studioId}:type`,
      `${this.STUDIO_PREFIX}${studioId}:relayMode`,
      `${this.STUDIO_PREFIX}${studioId}:relayInterval`,
      `${this.STUDIO_PREFIX}${studioId}:phrasing`,
      `${this.STUDIO_PREFIX}${studioId}:currentRoleIndex`,
      `${this.STUDIO_PREFIX}${studioId}:musicQueue`,
      `${this.STUDIO_PREFIX}${studioId}:recordingStartTime`,
    ];
    await this.client.del(keys);
  }
}

import { Server } from "socket.io";
import MusicStudioCacheSvc from "../services/music-studio-cache.service";

export class PresenceBatcher {
  private joined = new Map<string, Set<string>>(); // studioId -> Set<userId>
  private left = new Map<string, Set<string>>(); // studioId -> Set<userId>
  private timeouts = new Map<string, NodeJS.Timeout>();

  constructor(private io: Server) {}

  addJoin(studioId: string, userId: string) {
    this.left.get(studioId)?.delete(userId);
    if (!this.joined.has(studioId)) this.joined.set(studioId, new Set());
    this.joined.get(studioId)!.add(userId);
    this.schedule(studioId);
  }

  addLeave(studioId: string, userId: string) {
    this.joined.get(studioId)?.delete(userId);
    if (!this.left.has(studioId)) this.left.set(studioId, new Set());
    this.left.get(studioId)!.add(userId);
    this.schedule(studioId);
  }

  private schedule(studioId: string) {
    if (this.timeouts.has(studioId)) return;
    this.timeouts.set(
      studioId,
      setTimeout(() => this.flush(studioId), 1000),
    );
  }

  private async flush(studioId: string) {
    this.timeouts.delete(studioId);
    const joinedIds = Array.from(this.joined.get(studioId) || []);
    const leftIds = Array.from(this.left.get(studioId) || []);

    this.joined.delete(studioId);
    this.left.delete(studioId);

    if (joinedIds.length > 0 || leftIds.length > 0) {
      const allMembers = await MusicStudioCacheSvc.getMembers(studioId);
      this.io.to(studioId).emit("studio_presence_update", {
        studioId,
        joined: joinedIds,
        left: leftIds,
        allUsers: allMembers,
      });

      console.log(
        `[PresenceBatcher] Flushed presence for studio ${studioId}: +${joinedIds.length}, -${leftIds.length}`,
      );
    }
  }
}

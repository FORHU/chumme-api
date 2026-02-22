import { Server } from "socket.io";

export class PresenceBatcher {
  private joined = new Map<string, Set<string>>(); // id -> Set<userId>
  private left = new Map<string, Set<string>>(); // id -> Set<userId>
  private timeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    private io: Server,
    private fetchMembers: (id: string) => Promise<any[]>,
    private emitEvent: string = "presence_update",
  ) {}

  addJoin(id: string, userId: string) {
    this.left.get(id)?.delete(userId);
    if (!this.joined.has(id)) this.joined.set(id, new Set());
    this.joined.get(id)!.add(userId);
    this.schedule(id);
  }

  addLeave(id: string, userId: string) {
    this.joined.get(id)?.delete(userId);
    if (!this.left.has(id)) this.left.set(id, new Set());
    this.left.get(id)!.add(userId);
    this.schedule(id);
  }

  private schedule(id: string) {
    if (this.timeouts.has(id)) return;
    this.timeouts.set(
      id,
      setTimeout(() => this.flush(id), 1000),
    );
  }

  private async flush(id: string) {
    this.timeouts.delete(id);
    const joinedIds = Array.from(this.joined.get(id) || []);
    const leftIds = Array.from(this.left.get(id) || []);

    this.joined.delete(id);
    this.left.delete(id);

    if (joinedIds.length > 0 || leftIds.length > 0) {
      const allMembers = await this.fetchMembers(id);
      this.io.to(id).emit(this.emitEvent, {
        id,
        joined: joinedIds,
        left: leftIds,
        allUsers: allMembers,
      });

      console.log(
        `[PresenceBatcher] Flushed presence for ${id}: +${joinedIds.length}, -${leftIds.length}`,
      );
    }
  }
}

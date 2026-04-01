import RedisUtil from "../../../utils/redis.util";

export class QuotaService {
  private static readonly KEY_PREFIX = "quota:youtube:";

  /**
   * Get the current day's quota usage
   */
  static async getUsage(): Promise<number> {
    const key = this.getTodayKey();
    const val = await RedisUtil.redisClient.get(key);
    return val ? parseInt(val, 10) : 0;
  }

  /**
   * Increment the quota usage by a specific amount
   */
  static async increment(amount: number): Promise<number> {
    const key = this.getTodayKey();
    const newVal = await RedisUtil.redisClient.incrBy(key, amount);

    // Set expiration to 48 hours for buffer, only on first increment
    if (newVal === amount) {
      await RedisUtil.redisClient.expire(key, 60 * 60 * 48);
    }

    return newVal;
  }

  private static getTodayKey(): string {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    return `${this.KEY_PREFIX}${dateStr}`;
  }
}

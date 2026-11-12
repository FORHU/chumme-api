import { DevicePlatform, PushProvider } from "@prisma/client";
import { prisma } from "../utils/prisma";

export interface DeviceTokenInput {
  userId: string;
  token: string;
  platform: DevicePlatform;
  provider: PushProvider;
  appVersion?: string | null;
}

export default class DeviceTokenRepo {
  /**
   * Keyed on the token, not the user: a phone has one token, so a different
   * account signing in on it takes the row over instead of both accounts
   * receiving each other's alerts.
   */
  static async upsert(input: DeviceTokenInput) {
    const { token, ...rest } = input;
    const now = new Date();
    return prisma.deviceToken.upsert({
      where: { token },
      create: { token, ...rest, lastSeenAt: now },
      update: { ...rest, lastSeenAt: now },
    });
  }

  /** Only the owner's row: one user can't sign another's device out of push. */
  static async deleteForUser(userId: string, token: string) {
    return prisma.deviceToken.deleteMany({ where: { userId, token } });
  }

  static async deleteTokens(tokens: string[]) {
    if (tokens.length === 0) return { count: 0 };
    return prisma.deviceToken.deleteMany({ where: { token: { in: tokens } } });
  }

  static async findByUserIds(userIds: string[]) {
    if (userIds.length === 0) return [];
    return prisma.deviceToken.findMany({
      where: { userId: { in: userIds }, user: { isDeleted: false } },
      select: { token: true, provider: true, userId: true },
    });
  }

  /** Ids of this user's rows past the newest `keep`, by last check-in. */
  static async findStaleIdsForUser(userId: string, keep: number) {
    const rows = await prisma.deviceToken.findMany({
      where: { userId },
      orderBy: { lastSeenAt: "desc" },
      skip: keep,
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  static async deleteByIds(ids: string[]) {
    if (ids.length === 0) return { count: 0 };
    return prisma.deviceToken.deleteMany({ where: { id: { in: ids } } });
  }
}

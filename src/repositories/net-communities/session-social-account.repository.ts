import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default class SessionSocialAccountRepo {
  /**
   * Upsert a social account connection for a user
   */
  static async upsertSocialAccount(data: {
    userId: string;
    platform: string;
    providerUserId: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    scopes?: string;
    avatarUrl?: string;
  }) {
    return prisma.sessionSocialAccount.upsert({
      where: {
        userId_platform: {
          userId: data.userId,
          platform: data.platform,
        },
      },
      update: {
        providerUserId: data.providerUserId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        scopes: data.scopes,
        avatarUrl: data.avatarUrl,
        updatedAt: new Date(),
      },
      create: {
        userId: data.userId,
        platform: data.platform,
        providerUserId: data.providerUserId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        scopes: data.scopes,
        avatarUrl: data.avatarUrl,
      },
    });
  }

  /**
   * Get a specific social account for a user
   */
  static async getSocialAccount(userId: string, platform: string) {
    return prisma.sessionSocialAccount.findUnique({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
    });
  }

  /**
   * Get all connected social accounts for a user
   */
  static async getSocialAccounts(userId: string) {
    return prisma.sessionSocialAccount.findMany({
      where: { userId },
      orderBy: { platform: "asc" },
    });
  }

  /**
   * Remove a social account connection
   */
  static async deleteSocialAccount(userId: string, platform: string) {
    return prisma.sessionSocialAccount.delete({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
    });
  }

  /**
   * Find a social account by platform and provider-specific ID
   */
  static async findByProviderId(platform: string, providerUserId: string) {
    return prisma.sessionSocialAccount.findFirst({
      where: {
        platform,
        providerUserId,
      },
    });
  }
}

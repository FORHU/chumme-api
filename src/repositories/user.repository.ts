import { prisma } from "../utils/prisma";

export default class UserRepo {
  static async findUser(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
  }

  static async findUserForAuth(userId: string) {
    return prisma.user.findUnique({
      where: {
        id: userId,
        isDeleted: false,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        isDeleted: true,
      },
    });
  }

  static async findUserBookmark(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, socialUserBookmarks: true },
    });
  }

  static async findUserById(userId: string) {
    return prisma.user.findUnique({
      where: {
        id: userId,
        isDeleted: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
        isDeleted: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        mobileNumber: true,
        isEmailVerified: true,
        onboardingCompleted: true,
        avatar: {
          select: {
            id: true,
            filename: true,
            fileUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        userInterests: {
          include: {
            interest: {
              select: {
                id: true,
                name: true,
                description: true,
                icon: true,
              },
            },
          },
        },
        userEmotionPreferences: {
          include: {
            emotion: {
              select: {
                id: true,
                name: true,
                description: true,
                icon: true,
              },
            },
          },
        },
        socialUserDiscoveries: true,
      },
    });
  }

  /**
   * Soft-delete a user and release their sign-up identifiers.
   *
   * `email` and `username` are hard `@unique` columns, but every lookup that
   * guards registration filters on `isDeleted: false`. A soft-deleted row was
   * therefore invisible to the duplicate check while still occupying the
   * unique index, so signing up again with that address sailed past the check
   * and died inside `prisma.user.create()` — surfacing Prisma's raw
   * "Invalid `prisma.user.create()` invocation" to the user.
   *
   * Tombstoning both fields frees them for reuse immediately. The row itself
   * stays put, so recordings, messages and room ownership still resolve.
   */
  static async softDeleteUser(userId: string) {
    // Short and collision-free: ids are uuids, and one user soft-deletes once.
    const tombstone = userId.replace(/-/g, "").slice(0, 12);

    return prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isDeleted: true,
        isActive: false,
        email: `deleted+${tombstone}@chumme.invalid`,
        username: `deleted_${tombstone}`,
        // The account is gone — leave nothing usable for auth or recovery.
        password: null,
        otpCode: null,
        otpExpiry: null,
        otpPurpose: null,
        pendingEmail: null,
      },
    });
  }

  static async invalidateUserSessions(userId: string) {
    return prisma.session.deleteMany({
      where: { userId },
    });
  }

  static async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  static async findUserByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
    });
  }

  static async updateUser(
    userId: string,
    data: {
      username?: string;
      name?: string;
      email?: string;
    },
  ) {
    return prisma.user.update({
      where: {
        id: userId,
        isDeleted: false,
      },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        avatar: {
          select: {
            fileUrl: true,
          },
        },
        lastLoginAt: true,
        createdAt: true,
        socialUserDiscoveries: true,
      },
    });
  }

  static async markOnboardingComplete(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    });
  }
}

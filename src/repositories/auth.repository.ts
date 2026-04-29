import { prisma } from "../utils/prisma";
import { UserRole } from "@prisma/client";

export default class AuthRepo {
  static async findUserByEmailOrUsername(email: string, username: string) {
    return prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
        isDeleted: false,
      },
    });
  }

  static async createUser(data: {
    email: string;
    password: string;
    username: string;
    name?: string;
    mobileNumber?: string;
    role?: UserRole;
    otpCode?: string;
    otpExpiry?: Date;
  }) {
    return prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        username: data.username,
        name: data.name,
        mobileNumber: data.mobileNumber,
        role: data.role || UserRole.USER,
        otpCode: data.otpCode,
        otpExpiry: data.otpExpiry,
        isEmailVerified: false,
        onboardingCompleted: false,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        isEmailVerified: true,
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true,
        socialUserDiscoveries: true,
      },
    });
  }

  static async findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: {
        email,
        isDeleted: false,
      },
      include: {
        avatar: {
          select: {
            fileUrl: true,
          },
        },
        socialUserDiscoveries: true,
      },
    });
  }

  static async updateUserLoginStatus(userId: string) {
    return prisma.user.update({
      where: {
        id: userId,
        isDeleted: false,
      },
      data: {
        isActive: true,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
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
        onboardingCompleted: true,
        socialUserDiscoveries: true,
      },
    });
  }

  static async createSession(data: {
    userId: string;
    refreshToken: string;
    expiresAt: Date;
    provider?: string;
    providerUserId?: string;
    providerAvatarUrl?: string;
  }) {
    return prisma.session.create({
      data: {
        ...data,
      },
    });
  }

  static async findValidSession(refreshToken: string) {
    return prisma.session.findFirst({
      where: {
        refreshToken,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });
  }

  static async deleteSession(refreshToken: string) {
    return prisma.session.deleteMany({
      where: {
        refreshToken,
      },
    });
  }

  static async findUserById(userId: string) {
    return prisma.user.findFirst({
      where: {
        id: userId,
        isDeleted: false,
      },
      include: {
        avatar: {
          select: {
            fileUrl: true,
          },
        },
        socialUserDiscoveries: true,
      },
    });
  }

  static async findUserByUsername(username: string) {
    return prisma.user.findFirst({
      where: {
        username,
        isDeleted: false,
      },
    });
  }

  static async updateUser(userId: string, data: any) {
    return prisma.user.update({
      where: {
        id: userId,
      },
      data: data,
    });
  }

  static async getAuthUser(userId: string) {
    return prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        username: true,
        role: true,
        onboardingCompleted: true,
        socialUserDiscoveries: true,
      },
    });
  }

  static async findOrCreateGoogleUser(data: {
    email: string;
    name?: string;
    provider: string;
    avatarUrl?: string;
  }) {
    // First try to find existing user by email
    const existingUser = await prisma.user.findFirst({
      where: { email: data.email, isDeleted: false },
      include: {
        avatar: {
          select: { fileUrl: true },
        },
        socialUserDiscoveries: true,
      },
    });

    if (existingUser) {
      if (data.avatarUrl) {
        console.log(
          `[Google SSO] Avatar sync for ${data.email}. Current avatarId: ${existingUser.avatarId}`,
        );

        // Check if file already exists with this URL (always saved)
        let avatarFile = await prisma.file.findFirst({
          where: { fileUrl: data.avatarUrl, deletedAt: null },
        });

        if (!avatarFile) {
          console.log(`[Google SSO] Creating new File record for avatar URL`);
          avatarFile = await prisma.file.create({
            data: {
              filename: `google_avatar_${Date.now()}.jpg`,
              fileUrl: data.avatarUrl,
            },
          });
        }

        // Connect the avatar to the user (syncing social profile pic)
        if (existingUser.avatarId !== avatarFile.id) {
          console.log(
            `[Google SSO] Connecting user ${existingUser.id} with avatarId: ${avatarFile.id}`,
          );
          return prisma.user.update({
            where: { id: existingUser.id },
            data: { avatarId: avatarFile.id },
            include: {
              avatar: { select: { fileUrl: true } },
              socialUserDiscoveries: true,
            },
          });
        }
      }
      return existingUser;
    }

    // Create new user with Google provider
    const baseUsername = data.email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    let username = baseUsername;
    let counter = 1;

    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    let avatarId: string | undefined;
    if (data.avatarUrl) {
      // Check if file already exists with this URL
      let avatarFile = await prisma.file.findFirst({
        where: { fileUrl: data.avatarUrl, deletedAt: null },
      });

      if (!avatarFile) {
        avatarFile = await prisma.file.create({
          data: {
            filename: `google_avatar_${Date.now()}.jpg`,
            fileUrl: data.avatarUrl,
          },
        });
      }
      avatarId = avatarFile.id;
    }

    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name || data.email.split("@")[0],
        username,
        password: "GOOGLE_SSO_USER",
        isEmailVerified: true,
        avatarId,
      },
      include: {
        avatar: {
          select: { fileUrl: true },
        },
        socialUserDiscoveries: true,
      },
    });
  }

  static async findOrCreateFacebookUser(data: {
    email: string;
    name?: string;
    provider: string;
    facebookId?: string;
    avatarUrl?: string;
  }) {
    // First try to find existing user by email
    const existingUser = await prisma.user.findFirst({
      where: { email: data.email, isDeleted: false },
      include: {
        avatar: {
          select: { fileUrl: true },
        },
        socialUserDiscoveries: true,
      },
    });

    if (existingUser) {
      if (data.avatarUrl) {
        console.log(
          `[Facebook SSO] Avatar sync for ${data.email}. Current avatarId: ${existingUser.avatarId}`,
        );

        // Check if file already exists with this URL (always saved)
        let avatarFile = await prisma.file.findFirst({
          where: { fileUrl: data.avatarUrl, deletedAt: null },
        });

        if (!avatarFile) {
          console.log(`[Facebook SSO] Creating new File record for avatar URL`);
          avatarFile = await prisma.file.create({
            data: {
              filename: `facebook_avatar_${Date.now()}.jpg`,
              fileUrl: data.avatarUrl,
            },
          });
        }

        // Connect the avatar to the user (syncing social profile pic)
        if (existingUser.avatarId !== avatarFile.id) {
          console.log(
            `[Facebook SSO] Connecting user ${existingUser.id} with avatarId: ${avatarFile.id}`,
          );
          return prisma.user.update({
            where: { id: existingUser.id },
            data: { avatarId: avatarFile.id },
            include: {
              avatar: { select: { fileUrl: true } },
              socialUserDiscoveries: true,
            },
          });
        }
      }
      return existingUser;
    }

    // Create new user with Facebook provider
    const baseUsername = data.email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    let username = baseUsername;
    let counter = 1;

    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    let avatarId: string | undefined;
    if (data.avatarUrl) {
      // Check if file already exists with this URL
      let avatarFile = await prisma.file.findFirst({
        where: { fileUrl: data.avatarUrl, deletedAt: null },
      });

      if (!avatarFile) {
        avatarFile = await prisma.file.create({
          data: {
            filename: `facebook_avatar_${Date.now()}.jpg`,
            fileUrl: data.avatarUrl,
          },
        });
      }
      avatarId = avatarFile.id;
    }

    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name || data.email.split("@")[0],
        username,
        password: "FACEBOOK_SSO_USER",
        isEmailVerified: true,
        avatarId,
      },
      include: {
        avatar: {
          select: { fileUrl: true },
        },
        socialUserDiscoveries: true,
      },
    });
  }
}

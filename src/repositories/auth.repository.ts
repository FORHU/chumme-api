import { prisma } from "../utils/prisma";

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
        otpCode: data.otpCode,
        otpExpiry: data.otpExpiry,
        isEmailVerified: false,
        provider: null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  static async findUserByEmail(email: string) {
    return prisma.user.findUnique({
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
      },
    });
  }

  static async createSession(data: {
    userId: string;
    refreshToken: string;
    expiresAt: Date;
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
    return prisma.user.findUnique({
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
      },
    });
  }

  static async findUserByUsername(username: string) {
    return prisma.user.findUnique({
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
        isDeleted: false,
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
      },
    });
  }

  static async findOrCreateGoogleUser(data: {
    email: string;
    name?: string;
    provider: string;
  }) {
    // First try to find existing user by email
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email, isDeleted: false },
      include: {
        avatar: {
          select: { fileUrl: true },
        },
      },
    });

    if (existingUser) {
      // Update provider if user exists but was created with email/password
      if (!existingUser.provider) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { provider: data.provider },
        });
      }
      return existingUser;
    }

    // Create new user with Google provider
    // Generate unique username from email
    const baseUsername = data.email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    let username = baseUsername;
    let counter = 1;

    // Ensure username is unique
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name || data.email.split("@")[0],
        username,
        password: "GOOGLE_SSO_USER", // Placeholder - Google users don't use password
        provider: data.provider,
        isEmailVerified: true, // Google already verified the email
      },
      include: {
        avatar: {
          select: { fileUrl: true },
        },
      },
    });
  }
}

import { prisma } from "../utils/prisma";
import {
  MusicStudioRole,
  MusicStudioType,
  MusicRelayMode,
} from "@prisma/client";

interface CreateMusicStudioData {
  name: string;
  keyPassword?: string; // Optional - if not set, studio is public
  note?: string;
  studioType: MusicStudioType;
  relayMode?: MusicRelayMode;
  relayInterval?: number;
  ownerId: string;
}

export default class MusicStudioRepo {
  /**
   * Create a new MusicStudio (karaoke room)
   * Owner is automatically added as a PRODUCER member
   */
  static async create(data: CreateMusicStudioData) {
    return prisma.musicStudio.create({
      data: {
        name: data.name,
        keyPassword: data.keyPassword,
        note: data.note,
        studioType: data.studioType,
        ownerId: data.ownerId,
        relayMode: data.relayMode || MusicRelayMode.AUTO,
        relayInterval: data.relayInterval || 1,
        // Auto-add owner as PRODUCER member
        members: {
          create: {
            userId: data.ownerId,
            role: MusicStudioRole.PRODUCER,
            isActive: true,
            vocalRoleIndex: 1,
          },
        },
      },
      include: {
        owner: true,
        members: {
          include: { user: true },
        },
        records: true,
      },
    });
  }

  /**
   * Find a MusicStudio by ID
   */
  static async findById(id: string) {
    return prisma.musicStudio.findUnique({
      where: { id },
      include: {
        owner: true,
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
        records: {
          include: {
            music: {
              include: {
                musicArtist: true,
              },
            },
            file: true,
          },
        },
      },
    });
  }

  /**
   * Find a MusicStudio by keyPassword (for joining)
   */
  static async findByKeyPassword(keyPassword: string) {
    return prisma.musicStudio.findFirst({
      where: { keyPassword, deletedAt: null },
      include: {
        owner: true,
        members: {
          where: { isActive: true },
          include: { user: true },
        },
      },
    });
  }

  /**
   * Get all active studios with pagination
   */
  static async findAll(
    params: {
      page?: number;
      limit?: number;
      studioType?: MusicStudioType;
      publicOnly?: boolean;
      search?: string;
    } = {},
  ) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      deletedAt: null,
      ...(params.studioType && { studioType: params.studioType }),
    };

    if (params.search) {
      whereClause.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { note: { contains: params.search, mode: "insensitive" } },
      ];
    }

    if (params.publicOnly !== undefined) {
      const visibilityFilter = params.publicOnly
        ? { OR: [{ keyPassword: null }, { keyPassword: "" }] }
        : { NOT: { OR: [{ keyPassword: null }, { keyPassword: "" }] } };

      if (whereClause.OR) {
        // If search already added an OR, we need to wrap both in an AND to ensure both filters apply
        const existingOR = whereClause.OR;
        delete whereClause.OR;
        whereClause.AND = [{ OR: existingOR }, visibilityFilter];
      } else {
        Object.assign(whereClause, visibilityFilter);
      }
    }

    const [data, total] = await Promise.all([
      prisma.musicStudio.findMany({
        where: whereClause,
        include: {
          owner: true,
          members: {
            where: { isActive: true },
            include: { user: true },
          },
          records: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.musicStudio.count({
        where: whereClause,
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  /**
   * Get studios owned by a user
   */
  static async findByOwnerId(ownerId: string) {
    return prisma.musicStudio.findMany({
      where: { ownerId, deletedAt: null },
      include: {
        owner: true,
        members: {
          where: { isActive: true },
          include: { user: true },
        },
        records: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get studios a user has joined (as active member)
   */
  static async findByUserId(userId: string) {
    return prisma.musicStudio.findMany({
      where: {
        members: {
          some: { userId, isActive: true },
        },
        deletedAt: null,
      },
      include: {
        owner: true,
        members: {
          where: { isActive: true },
          include: { user: true },
        },
        records: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Add a user to a studio with a role
   */
  static async addUser(
    studioId: string,
    userId: string,
    role: MusicStudioRole = MusicStudioRole.LISTENER,
  ) {
    // Check if membership already exists
    const existing = await prisma.musicStudioMember.findUnique({
      where: {
        userId_studioId: { userId, studioId },
      },
    });

    if (existing) {
      // Reactivate if inactive
      return prisma.musicStudioMember.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          leftAt: null,
          role,
        },
        include: { user: true, studio: true },
      });
    }

    // Create new membership
    return prisma.musicStudioMember.create({
      data: {
        userId,
        studioId,
        role,
        isActive: true,
        vocalRoleIndex:
          role === MusicStudioRole.SINGER || role === MusicStudioRole.PRODUCER
            ? 1
            : null,
      },
      include: { user: true, studio: true },
    });
  }

  /**
   * Remove a user from a studio (soft remove - set isActive = false)
   */
  static async removeUser(studioId: string, userId: string) {
    return prisma.musicStudioMember.update({
      where: {
        userId_studioId: { userId, studioId },
      },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });
  }

  /**
   * Deactivate all members in a studio
   */
  static async deactivateAllMembers(studioId: string) {
    return prisma.musicStudioMember.updateMany({
      where: {
        studioId,
        isActive: true,
      },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });
  }

  /**
   * Check if user is actively in studio
   */
  static async isUserInStudio(studioId: string, userId: string) {
    const member = await prisma.musicStudioMember.findFirst({
      where: {
        studioId,
        userId,
        isActive: true,
      },
    });
    return !!member;
  }

  /**
   * Get a user's membership in a studio
   */
  static async getMembership(studioId: string, userId: string) {
    return prisma.musicStudioMember.findUnique({
      where: {
        userId_studioId: { userId, studioId },
      },
      include: { user: true },
    });
  }

  /**
   * Update a member's vocal role index
   */
  static async updateVocalRole(
    studioId: string,
    userId: string,
    vocalRoleIndex: number | null,
  ) {
    return prisma.musicStudioMember.update({
      where: {
        userId_studioId: { userId, studioId },
      },
      data: { vocalRoleIndex },
      include: { user: true },
    });
  }

  /**
   * Update a member's role
   */
  static async updateMemberRole(
    studioId: string,
    userId: string,
    role: MusicStudioRole,
  ) {
    return prisma.musicStudioMember.update({
      where: {
        userId_studioId: { userId, studioId },
      },
      data: {
        role,
        vocalRoleIndex:
          role === MusicStudioRole.SINGER || role === MusicStudioRole.PRODUCER
            ? 1
            : null,
      },
      include: { user: true },
    });
  }

  /**
   * Update all active members' roles in a studio (e.g., bulk upgrade to SINGER)
   */
  static async updateAllMembersRole(studioId: string, role: MusicStudioRole) {
    await prisma.musicStudioMember.updateMany({
      where: {
        studioId,
        isActive: true,
      },
      data: {
        role,
        vocalRoleIndex:
          role === MusicStudioRole.SINGER || role === MusicStudioRole.PRODUCER
            ? 1
            : null,
      },
    });

    // Return the updated list
    return this.getStudioUsers(studioId);
  }

  /**
   * Update studio details
   */
  static async update(id: string, data: Partial<CreateMusicStudioData>) {
    return prisma.musicStudio.update({
      where: { id },
      data: data as any,
      include: {
        owner: true,
        members: {
          where: { isActive: true },
          include: { user: true },
        },
        records: true,
      },
    });
  }

  /**
   * Soft delete a studio
   */
  static async delete(id: string) {
    return prisma.musicStudio.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Get active members in a studio
   */
  static async getStudioUsers(studioId: string) {
    const members = await prisma.musicStudioMember.findMany({
      where: {
        studioId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
    });
    return members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      username: m.user.username,
      avatar: m.user.avatar,
      role: m.role,
      vocalRoleIndex: m.vocalRoleIndex,
    }));
  }

  /**
   * Get all singers in a studio (for recording credits)
   */
  static async getStudioSingers(studioId: string) {
    const members = await prisma.musicStudioMember.findMany({
      where: {
        studioId,
        isActive: true,
        role: {
          in: [MusicStudioRole.SINGER, MusicStudioRole.PRODUCER],
        },
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });
    return members.map((m) => m.user);
  }

  /**
   * Get all active studio names
   */
  static async getAllNames() {
    const studios = await prisma.musicStudio.findMany({
      where: { deletedAt: null },
      select: { name: true },
      orderBy: { name: "asc" },
    });
    return studios.map((s) => s.name);
  }
}

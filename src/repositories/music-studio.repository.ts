import { prisma } from "../utils/prisma";
import { StudioRole } from "@prisma/client";

interface CreateMusicStudioData {
  name: string;
  keyName?: string; // Optional - if not set, studio is public
  note?: string;
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
        keyName: data.keyName,
        note: data.note,
        ownerId: data.ownerId,
        // Auto-add owner as PRODUCER member
        members: {
          create: {
            userId: data.ownerId,
            role: StudioRole.PRODUCER,
            isActive: true,
          },
        },
      },
      include: {
        owner: true,
        members: {
          include: { user: true },
        },
        musicRecord: true,
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
        musicRecord: {
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
   * Find a MusicStudio by keyName (for joining)
   */
  static async findByKeyName(keyName: string) {
    return prisma.musicStudio.findFirst({
      where: { keyName, deletedAt: null },
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
  static async findAll(params: { page?: number; limit?: number } = {}) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.musicStudio.findMany({
        where: { deletedAt: null },
        include: {
          owner: true,
          members: {
            where: { isActive: true },
            include: { user: true },
          },
          musicRecord: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.musicStudio.count({
        where: { deletedAt: null },
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
        musicRecord: true,
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
        musicRecord: true,
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
    role: StudioRole = StudioRole.LISTENER,
  ) {
    // Check if membership already exists
    const existing = await prisma.studioMember.findUnique({
      where: {
        userId_studioId: { userId, studioId },
      },
    });

    if (existing) {
      // Reactivate if inactive
      return prisma.studioMember.update({
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
    return prisma.studioMember.create({
      data: {
        userId,
        studioId,
        role,
        isActive: true,
      },
      include: { user: true, studio: true },
    });
  }

  /**
   * Remove a user from a studio (soft remove - set isActive = false)
   */
  static async removeUser(studioId: string, userId: string) {
    return prisma.studioMember.update({
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
   * Check if user is actively in studio
   */
  static async isUserInStudio(studioId: string, userId: string) {
    const member = await prisma.studioMember.findFirst({
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
    return prisma.studioMember.findUnique({
      where: {
        userId_studioId: { userId, studioId },
      },
      include: { user: true },
    });
  }

  /**
   * Update a member's role
   */
  static async updateMemberRole(
    studioId: string,
    userId: string,
    role: StudioRole,
  ) {
    return prisma.studioMember.update({
      where: {
        userId_studioId: { userId, studioId },
      },
      data: { role },
      include: { user: true },
    });
  }

  /**
   * Update all active members' roles in a studio (e.g., bulk upgrade to SINGER)
   */
  static async updateAllMembersRole(studioId: string, role: StudioRole) {
    await prisma.studioMember.updateMany({
      where: {
        studioId,
        isActive: true,
      },
      data: { role },
    });

    // Return the updated list
    return this.getStudioUsers(studioId);
  }

  /**
   * Link a MusicRecord to the studio (after recording is saved)
   */
  static async linkMusicRecord(studioId: string, musicRecordId: string) {
    return prisma.musicStudio.update({
      where: { id: studioId },
      data: {
        musicRecordId: musicRecordId,
      },
      include: {
        musicRecord: true,
      },
    });
  }

  /**
   * Update studio details
   */
  static async update(id: string, data: Partial<CreateMusicStudioData>) {
    return prisma.musicStudio.update({
      where: { id },
      data,
      include: {
        owner: true,
        members: {
          where: { isActive: true },
          include: { user: true },
        },
        musicRecord: true,
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
    const members = await prisma.studioMember.findMany({
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
    return members.map((m) => ({ ...m.user, role: m.role }));
  }

  /**
   * Get all singers in a studio (for recording credits)
   */
  static async getStudioSingers(studioId: string) {
    const members = await prisma.studioMember.findMany({
      where: {
        studioId,
        isActive: true,
        role: { in: [StudioRole.SINGER, StudioRole.PRODUCER] },
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });
    return members.map((m) => m.user);
  }
}

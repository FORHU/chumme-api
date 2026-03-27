import { prisma } from "../utils/prisma";

export const getAllArtists = async () => {
  return prisma.chummeArtist.findMany({
    where: {
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      bio: true,
      imageUrl: true,
      socialPlatformUsername: true,
      platform: true,
      chummeCategories: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
};

export const getRandomArtists = async (limit: number) => {
  // Prisma doesn't have a native elegant "ORDER BY RANDOM()" so we query raw.
  const randomArtists = await prisma.$queryRaw`
    SELECT id, name, bio, "imageUrl"
    FROM "ChummeArtist"
    WHERE "isDeleted" = false
    ORDER BY RANDOM()
    LIMIT ${limit};
  `;
  return randomArtists as any[];
};

export const getUserArtists = async (_userId: string) => {
  // Relation chummeArtists was removed from SocialUserDiscovery
  return [];
};

export const addUserArtists = async (_userId: string, _artistIds: string[]) => {
  // Relation chummeArtists was removed from SocialUserDiscovery
};

export const removeUserArtist = async (_userId: string, _artistId: string) => {
  // Relation chummeArtists was removed from SocialUserDiscovery
  return null;
};

export const findById = async (id: string) => {
  return prisma.chummeArtist.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      bio: true,
      imageUrl: true,
      socialPlatformUsername: true,
      platform: true,
      chummeCategories: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};

export const create = async (data: {
  name: string;
  bio?: string | null;
  imageUrl?: string | null;
  nationality?: string | null;
  genre?: string | null;
  socialPlatformUsername?: string | null;
  platform: string;
}) => {
  return prisma.chummeArtist.create({
    data,
  });
};

export const update = async (
  id: string,
  data: {
    name?: string;
    bio?: string | null;
    imageUrl?: string | null;
    nationality?: string | null;
    genre?: string | null;
    socialPlatformUsername?: string | null;
    platform?: string;
  },
) => {
  return prisma.chummeArtist.update({
    where: { id },
    data,
  });
};

export const deleteArtist = async (id: string) => {
  return prisma.chummeArtist.update({
    where: { id },
    data: { isDeleted: true },
  });
};

export const upsertArtist = async (data: {
  name: string;
  bio?: string | null;
  imageUrl?: string | null;
  genre?: string | null;
  socialPlatformUsername?: string | null;
  platform?: string;
}) => {
  // Use upsert to handle concurrent requests gracefully
  const artist = await prisma.chummeArtist.upsert({
    where: {
      name: data.name,
    },
    update: {
      // Only update if new data is provided
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      ...(data.genre !== undefined && { genre: data.genre }),
      ...(data.socialPlatformUsername !== undefined && {
        socialPlatformUsername: data.socialPlatformUsername,
      }),
      ...(data.platform !== undefined && { platform: data.platform }),
    },
    create: {
      name: data.name,
      bio: data.bio ?? null,
      imageUrl: data.imageUrl ?? null,
      genre: data.genre ?? null,
      socialPlatformUsername: data.socialPlatformUsername ?? null,
      platform: data.platform ?? "YOUTUBE", // Default to YOUTUBE if not provided
    },
  });

  return artist;
};

export const getRisingStars = async (limit: number = 10) => {
  return prisma.chummeArtist.findMany({
    where: {
      isDraft: true,
      isDeleted: false,
    },
    include: {
      chummeCategories: {
        select: { id: true, name: true },
      },
      socialFeedItems: {
        where: { isDeleted: false },
        orderBy: { score: "desc" },
        take: 3,
      },
    },
    take: limit,
  });
};

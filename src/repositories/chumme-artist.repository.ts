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

export const getUserArtists = async (userId: string) => {
  const userArtistPref = await prisma.socialUserDiscovery.findUnique({
    where: {
      userId,
    },
    include: {
      chummeArtists: {
        where: {
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
          bio: true,
          imageUrl: true,
          chummeCategories: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return userArtistPref ? userArtistPref.chummeArtists : [];
};

export const addUserArtists = async (userId: string, artistIds: string[]) => {
  await prisma.socialUserDiscovery.upsert({
    where: { userId },
    update: {
      chummeArtists: {
        connect: artistIds.map((id) => ({ id })),
      },
    },
    create: {
      userId,
      chummeArtists: {
        connect: artistIds.map((id) => ({ id })),
      },
    },
  });
};

export const removeUserArtist = async (userId: string, artistId: string) => {
  return await prisma.socialUserDiscovery.update({
    where: {
      userId,
    },
    data: {
      chummeArtists: {
        disconnect: [{ id: artistId }],
      },
    },
  });
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
  instagramUsername?: string | null;
  tiktokUsername?: string | null;
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
    instagramUsername?: string | null;
    tiktokUsername?: string | null;
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
    },
    create: {
      name: data.name,
      bio: data.bio ?? null,
      imageUrl: data.imageUrl ?? null,
      genre: data.genre ?? null,
    },
  });

  return artist;
};

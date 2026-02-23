import { prisma } from "../utils/prisma";

export const getAllArtists = async () => {
  return prisma.artist.findMany({
    where: {
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      bio: true,
      imageUrl: true,
      roomSubCategories: {
        select: {
          id: true,
          name: true,
          keyName: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
};

export const getUserArtists = async (userId: string) => {
  return await prisma.userArtist.findMany({
    where: {
      userId,
      artist: {
        isDeleted: false,
      },
    },
    include: {
      artist: {
        select: {
          id: true,
          name: true,
          bio: true,
          imageUrl: true,
          roomSubCategories: {
            select: {
              id: true,
              name: true,
              keyName: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const addUserArtists = async (userId: string, artistIds: string[]) => {
  await prisma.userArtist.createMany({
    data: artistIds.map((artistId) => ({
      userId,
      artistId,
    })),
    skipDuplicates: true,
  });
};

export const removeUserArtist = async (userId: string, artistId: string) => {
  return await prisma.userArtist.deleteMany({
    where: {
      userId,
      artistId,
    },
  });
};

export const findById = async (id: string) => {
  return prisma.artist.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      bio: true,
      imageUrl: true,
      roomSubCategories: {
        select: {
          id: true,
          name: true,
          keyName: true,
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
  return prisma.artist.create({
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
  return prisma.artist.update({
    where: { id },
    data,
  });
};

export const deleteArtist = async (id: string) => {
  return prisma.artist.update({
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
  const artist = await prisma.artist.upsert({
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

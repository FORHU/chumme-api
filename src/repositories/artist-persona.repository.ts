import { prisma } from "../utils/prisma";

export const findByArtistId = async (artistId: string) => {
  return prisma.artistPersona.findFirst({
    where: {
      artistId,
      deletedAt: null,
    },
    include: {
      personaFile: {
        select: {
          id: true,
          fileUrl: true,
        },
      },
    },
  });
};

export const findByPersonaFileId = async (personaFileId: string) => {
  return prisma.artistPersona.findUnique({
    where: {
      personaFileId,
    },
  });
};

export const create = async (data: {
  artistId?: string | null;
  personaVoiceId: string;
  personaFileId: string;
}) => {
  return prisma.artistPersona.create({
    data,
    include: {
      personaFile: {
        select: {
          id: true,
          fileUrl: true,
        },
      },
    },
  });
};

export const update = async (
  id: string,
  data: {
    artistId?: string | null;
    personaVoiceId?: string;
    personaFileId?: string;
  },
) => {
  return prisma.artistPersona.update({
    where: { id },
    data,
    include: {
      personaFile: {
        select: {
          id: true,
          fileUrl: true,
        },
      },
    },
  });
};

export const getAll = async () => {
  return prisma.artistPersona.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      artist: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
      },
      personaFile: {
        select: {
          id: true,
          fileUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const deletePersona = async (id: string) => {
  return prisma.artistPersona.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};

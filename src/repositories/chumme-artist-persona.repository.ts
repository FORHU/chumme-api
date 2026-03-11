import { prisma } from "../utils/prisma";

export const findByArtistId = async (chummeArtistId: string) => {
  return prisma.chummeArtistPersona.findFirst({
    where: {
      chummeArtistId,
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
  return prisma.chummeArtistPersona.findUnique({
    where: {
      personaFileId,
    },
  });
};

export const create = async (data: {
  chummeArtistId?: string | null;
  personaVoiceId: string;
  personaFileId: string;
}) => {
  return prisma.chummeArtistPersona.create({
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
    chummeArtistId?: string | null;
    personaVoiceId?: string;
    personaFileId?: string;
  },
) => {
  return prisma.chummeArtistPersona.update({
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
  return prisma.chummeArtistPersona.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      chummeArtist: {
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
  return prisma.chummeArtistPersona.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};

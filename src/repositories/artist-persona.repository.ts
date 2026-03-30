import { prisma } from "../utils/prisma";

export const findByArtistId = async (artistId: string) => {
  return prisma.chummeArtistPersona.findFirst({
    where: {
      chummeArtistId: artistId,
      deletedAt: null,
    },
    include: {
      audioPath: { select: { id: true, fileUrl: true } },
      videoPath: { select: { id: true, fileUrl: true } },
      imagePath: { select: { id: true, fileUrl: true } },
    },
  });
};

export const findByAudioPathId = async (audioPathId: string) => {
  return prisma.chummeArtistPersona.findUnique({
    where: { audioPathId },
  });
};

export const findByVideoPathId = async (videoPathId: string) => {
  return prisma.chummeArtistPersona.findUnique({
    where: { videoPathId },
  });
};

export const findByImagePathId = async (imagePathId: string) => {
  return prisma.chummeArtistPersona.findUnique({
    where: { imagePathId },
  });
};

export const create = async (data: {
  chummeArtistId?: string | null;
  name: string;
  voiceKey: string;
  persona: string;
  audioPathId?: string | null;
  videoPathId?: string | null;
  imagePathId?: string | null;
}) => {
  return prisma.chummeArtistPersona.create({
    data: {
      ...data,
      chummeArtistId: data.chummeArtistId ?? undefined,
      audioPathId: data.audioPathId ?? undefined,
      videoPathId: data.videoPathId ?? undefined,
      imagePathId: data.imagePathId ?? undefined,
    },
    include: {
      audioPath: { select: { id: true, fileUrl: true } },
      videoPath: { select: { id: true, fileUrl: true } },
      imagePath: { select: { id: true, fileUrl: true } },
    },
  });
};

export const update = async (
  id: string,
  data: {
    chummeArtistId?: string | null;
    name?: string | null;
    voiceKey?: string | null;
    persona?: string | null;
    audioPathId?: string | null;
    videoPathId?: string | null;
    imagePathId?: string | null;
  },
) => {
  return prisma.chummeArtistPersona.update({
    where: { id },
    data: {
      ...data,
      name: data.name ?? undefined,
      voiceKey: data.voiceKey ?? undefined,
      persona: data.persona ?? undefined,
      chummeArtistId:
        data.chummeArtistId === null
          ? null
          : (data.chummeArtistId ?? undefined),
      audioPathId:
        data.audioPathId === null ? null : (data.audioPathId ?? undefined),
      videoPathId:
        data.videoPathId === null ? null : (data.videoPathId ?? undefined),
      imagePathId:
        data.imagePathId === null ? null : (data.imagePathId ?? undefined),
    },

    include: {
      audioPath: { select: { id: true, fileUrl: true } },
      videoPath: { select: { id: true, fileUrl: true } },
      imagePath: { select: { id: true, fileUrl: true } },
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
      audioPath: { select: { id: true, fileUrl: true } },
      videoPath: { select: { id: true, fileUrl: true } },
      imagePath: { select: { id: true, fileUrl: true } },
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

import { prisma } from "../utils/prisma";

export const create = async (data: {
  socialIngestionTargetId: string;
  mode?: string;
  exactTime?: string | null;
  intervalHours?: number | null;
  isActive?: boolean;
}) => {
  return prisma.socialIngestionSchedule.create({
    data: {
      socialIngestionTargetId: data.socialIngestionTargetId,
      mode: data.mode ?? "AUTO",
      exactTime: data.exactTime ?? null,
      intervalHours: data.intervalHours ?? 24,
      isActive: data.isActive ?? true,
    },
  });
};

export const update = async (
  id: string,
  data: {
    mode?: string;
    exactTime?: string | null;
    intervalHours?: number | null;
    isActive?: boolean;
  }
) => {
  return prisma.socialIngestionSchedule.update({
    where: { id },
    data: {
      ...data,
      exactTime: data.exactTime === undefined ? undefined : data.exactTime,
    },
  });
};

export const findById = async (id: string) => {
  return prisma.socialIngestionSchedule.findUnique({
    where: { id },
    include: {
      target: true,
    },
  });
};

export const findByTargetId = async (socialIngestionTargetId: string) => {
  return prisma.socialIngestionSchedule.findMany({
    where: { socialIngestionTargetId },
    orderBy: { createdAt: "desc" },
  });
};

export const getAllActiveSchedules = async () => {
  return prisma.socialIngestionSchedule.findMany({
    where: { isActive: true },
    include: {
      target: true,
    },
  });
};

export const deleteSchedule = async (id: string) => {
  return prisma.socialIngestionSchedule.delete({
    where: { id },
  });
};

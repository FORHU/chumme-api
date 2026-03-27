import { prisma } from "../utils/prisma";

export const getAllInterests = async () => {
  return await prisma.interest.findMany({
    where: {
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      description: true,
      icon: true,
    },
    orderBy: {
      name: "asc",
    },
  });
};

export const getUserInterests = async (userId: string) => {
  return await prisma.userInterest.findMany({
    where: {
      userId,
      interest: {
        isDeleted: false,
      },
    },
    include: {
      interest: {
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const addUserInterests = async (
  userId: string,
  interestIds: string[],
) => {
  await prisma.userInterest.createMany({
    data: interestIds.map((interestId) => ({
      userId,
      interestId,
    })),
    skipDuplicates: true,
  });
};

export const removeUserInterest = async (
  userId: string,
  userInterestId: string,
) => {
  const deleted = await prisma.userInterest.delete({
    where: {
      id: userInterestId,
      userId,
    },
  });

  return deleted;
};

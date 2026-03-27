import { prisma } from "../utils/prisma";

export default class ApkRepo {
  static async create(data: {
    versionName: string;
    buildNumber: number;
    fileId: string;
    whatIsNew: string[];
    isLatest?: boolean;
    isStable?: boolean;
  }) {
    return prisma.apkRelease.create({ data, include: { file: true } });
  }

  static async findAll() {
    const [releases, aggregate] = await Promise.all([
      prisma.apkRelease.findMany({
        include: { file: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.apkRelease.aggregate({
        _sum: { downloadCount: true },
        _count: { id: true },
      }),
    ]);

    return {
      releases,
      stats: {
        totalDownloads: aggregate._sum.downloadCount ?? 0,
        totalVersions: aggregate._count.id,
      },
    };
  }

  static async findById(id: string) {
    return prisma.apkRelease.findUnique({
      where: { id },
      include: { file: true },
    });
  }

  static async update(
    id: string,
    data: Partial<{
      versionName: string;
      buildNumber: number;
      whatIsNew: string[];
      isLatest: boolean;
      isStable: boolean;
    }>,
  ) {
    return prisma.apkRelease.update({ where: { id }, data });
  }

  static async unsetLatest() {
    return prisma.apkRelease.updateMany({
      data: { isLatest: false },
    });
  }

  static async unsetStable() {
    return prisma.apkRelease.updateMany({
      data: { isStable: false },
    });
  }

  static async setLatest(id: string) {
    return prisma.apkRelease.update({
      where: { id },
      data: { isLatest: true },
    });
  }

  static async setStable(id: string) {
    return prisma.apkRelease.update({
      where: { id },
      data: { isStable: true },
    });
  }

  static async incrementDownload(id: string) {
    return prisma.apkRelease.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });
  }

  static async delete(id: string) {
    return prisma.apkRelease.delete({ where: { id } });
  }
}

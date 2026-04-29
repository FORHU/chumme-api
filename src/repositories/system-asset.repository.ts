import { prisma } from "../utils/prisma";

export default class SystemAssetRepo {
  static async upsertAsset(data: { key: string; url: string; type: string; title?: string; description?: string }) {
    return prisma.systemAsset.upsert({
      where: { key: data.key },
      update: {
        url: data.url,
        type: data.type,
        title: data.title,
        description: data.description,
        isDeleted: false,
      },
      create: {
        key: data.key,
        url: data.url,
        type: data.type,
        title: data.title,
        description: data.description,
      },
    });
  }

  static async updateAsset(id: string, data: { key?: string; url?: string; type?: string; title?: string; description?: string }) {
    return prisma.systemAsset.update({
      where: { id },
      data,
    });
  }

  static async softDelete(id: string) {
    return prisma.systemAsset.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  static async findByKey(key: string) {
    return prisma.systemAsset.findFirst({
      where: { key, isDeleted: false },
    });
  }

  static async findAll() {
    return prisma.systemAsset.findMany({
      where: { isDeleted: false },
      orderBy: { key: "asc" },
    });
  }

  static async findById(id: string) {
    return prisma.systemAsset.findUnique({
      where: { id },
    });
  }
}


import { prisma } from "../utils/prisma";

export default class SystemAssetRepo {
  static async upsertAsset(data: {
    key: string;
    url: string;
    type: string;
  }) {
    return prisma.systemAsset.upsert({
      where: { key: data.key },
      update: {
        url: data.url,
        type: data.type,
      },
      create: {
        key: data.key,
        url: data.url,
        type: data.type,
      },
    });
  }

  static async findByKey(key: string) {
    return prisma.systemAsset.findUnique({
      where: { key },
    });
  }

  static async findAll() {
    return prisma.systemAsset.findMany({
      orderBy: { key: "asc" },
    });
  }
}

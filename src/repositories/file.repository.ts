import { prisma } from "../utils/prisma";
import S3Util from "../utils/s3.util";

export default class FileRepo {
  // Save / create file record
  static async createFile(
    data: {
      filename?: string | null;
      fileUrl?: string | null;
      metaData?: any;
    },
    tx?: any,
  ) {
    const client = tx || prisma;
    return client.file.create({
      data: {
        filename: data.filename ?? null,
        fileUrl: data.fileUrl ?? null,
        metaData: data.metaData ?? null,
      },
    });
  }

  static async findFileById(fileId: string) {
    return prisma.file.findUnique({ where: { id: fileId } });
  }

  static async upsertFile(
    id: string, // Required: caller must provide ID
    data: { filename?: string | null; fileUrl?: string | null; metaData?: any },
  ) {
    // Check if record exists before upserting
    const existing = await prisma.file.findUnique({ where: { id } });
    const isUpdate = !!existing;

    const file = await prisma.file.upsert({
      where: { id },
      create: {
        id: id, // Use provided ID for creation
        filename: data.filename ?? null,
        fileUrl: data.fileUrl ?? null,
        metaData: data.metaData ?? null,
      },
      update: {
        filename: data.filename ?? null,
        fileUrl: data.fileUrl ?? null,
        metaData: data.metaData ?? null,
      },
    });

    return { file, isUpdate };
  }

  static async getFileById(fileId: string) {
    const file = await FileRepo.findFileById(fileId);

    if (!file) {
      throw new Error("File not found");
    }

    return file;
  }

  static async deleteFile(fileId: string) {
    const file = await FileRepo.findFileById(fileId);

    if (!file) {
      throw new Error("File not found");
    }

    if (file.fileUrl) {
      await S3Util.deleteFile(file.fileUrl);
    }

    await FileRepo.deleteFile(fileId);

    return { message: "File deleted successfully" };
  }
}

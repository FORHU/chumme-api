import { prisma } from "../utils/prisma";

export default class MusicLibraryRepo {
  /**
   * Create a new music library record
   */
  static async create(
    data: {
      filename?: string | null;
      fileUrl?: string | null;
      metaData?: any;
      fileType?: any;
    },
    tx?: any,
  ) {
    const client = tx || prisma;
    return client.musicLibrary.create({
      data: {
        filename: data.filename ?? null,
        fileUrl: data.fileUrl ?? null,
        metaData: data.metaData ?? null,
        fileType: data.fileType ?? undefined,
      },
    });
  }

  /**
   * Find a music library record by ID
   */
  static async findById(id: string) {
    return prisma.musicLibrary.findUnique({
      where: { id },
    });
  }

  /**
   * Update a music library record
   */
  static async update(
    id: string,
    data: {
      filename?: string | null;
      fileUrl?: string | null;
      metaData?: any;
      fileType?: any;
    },
  ) {
    return prisma.musicLibrary.update({
      where: { id },
      data: {
        filename: data.filename ?? undefined,
        fileUrl: data.fileUrl ?? undefined,
        metaData: data.metaData ?? undefined,
        fileType: data.fileType ?? undefined,
      },
    });
  }

  /**
   * Soft delete a music library record (sets deletedAt)
   */
  static async softDelete(id: string) {
    return prisma.musicLibrary.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Hard delete a music library record
   */
  static async delete(id: string) {
    return prisma.musicLibrary.delete({
      where: { id },
    });
  }
}

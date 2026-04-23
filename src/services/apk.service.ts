import ApkRepo from "../repositories/apk.repository";
import FileRepo from "../repositories/file.repository";
import { prisma } from "../utils/prisma";
import S3Util from "../utils/s3.util";
import S3PresignedUtil from "../utils/s3-presigned.util";

export default class ApkSvc {
  static async uploadApk(
    file: Express.Multer.File,
    data: {
      versionName: string;
      buildNumber: number;
      whatIsNew: string[];
      setAsLatest?: boolean;
      setAsStable?: boolean;
    },
  ) {
    const safeName = file.originalname
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const key = `apk/${Date.now()}-${safeName || "app.apk"}`;
    const fileUrl = await S3Util.uploadFileWithKey(
      file.buffer,
      key,
      file.mimetype,
    );

    // 1. Create File record
    const fileRecord = await FileRepo.createFile({
      filename: file.originalname,
      fileUrl,
      metaData: {
        sizeBytes: file.size,
        mimetype: file.mimetype,
      },
    });

    // 2. Create ApkRelease record
    const release = await ApkRepo.create({
      versionName: data.versionName,
      buildNumber: data.buildNumber,
      fileId: fileRecord.id,
      whatIsNew: data.whatIsNew,
    });

    if (data.setAsLatest) {
      await ApkRepo.unsetLatest();
      await ApkRepo.setLatest(release.id);
    }

    if (data.setAsStable) {
      await ApkRepo.unsetStable();
      await ApkRepo.setStable(release.id);
    }

    return ApkRepo.findById(release.id);
  }

  static async getAllReleases() {
    return ApkRepo.findAll();
  }

  static async getDownloadUrl(id: string) {
    const release = await ApkRepo.findById(id);
    if (!release) throw new Error("APK release not found");

    const key = S3Util.getKeyFromUrl(release.file!.fileUrl!);
    if (!key)
      throw new Error(
        `Could not extract S3 key from URL: ${release.file!.fileUrl}`,
      );

    const exists = await S3Util.fileExists(key);
    if (!exists) {
      throw new Error(
        `APK file is missing from storage (key: ${key}). The release record exists but its object is not in the bucket.`,
      );
    }

    await ApkRepo.incrementDownload(id);

    const contentDisposition = `attachment; filename="chumme v${release.versionName}.apk"`;
    const url = await S3PresignedUtil.getDownloadUrl(
      key,
      undefined,
      contentDisposition,
    );

    return { url };
  }

  static async updateRelease(
    id: string,
    data: Partial<{
      versionName: string;
      buildNumber: number;
      whatIsNew: string[];
    }>,
  ) {
    const existing = await ApkRepo.findById(id);
    if (!existing) throw new Error("APK release not found");

    return ApkRepo.update(id, data);
  }

  static async setLatest(id: string) {
    const existing = await ApkRepo.findById(id);
    if (!existing) throw new Error("APK release not found");

    await ApkRepo.unsetLatest();
    return ApkRepo.setLatest(id);
  }

  static async setStable(id: string) {
    const existing = await ApkRepo.findById(id);
    if (!existing) throw new Error("APK release not found");

    await ApkRepo.unsetStable();
    return ApkRepo.setStable(id);
  }

  static async deleteRelease(id: string) {
    const existing = await ApkRepo.findById(id);
    if (!existing) throw new Error("APK release not found");

    const fileUrl = existing.file?.fileUrl ?? null;
    await prisma.$transaction(async (tx) => {
      await tx.apkRelease.delete({ where: { id } });
      if (existing.fileId) {
        await tx.file.delete({ where: { id: existing.fileId } });
      }
    });
    if (fileUrl) {
      try {
        await S3Util.deleteFile(fileUrl);
      } catch (err) {
        console.warn(`[APK delete] S3 cleanup failed for ${fileUrl}:`, err);
      }
    }

    return { message: "APK release deleted successfully" };
  }
}

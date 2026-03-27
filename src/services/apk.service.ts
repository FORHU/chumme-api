import ApkRepo from "../repositories/apk.repository";
import S3Util from "../utils/s3.util";
import S3PresignedUtil from "../utils/s3-presigned.util";
import { prisma } from "../utils/prisma";

function extractS3Key(fileUrl: string): string {
  if (fileUrl.includes(".com/")) {
    return fileUrl.split(".com/")[1];
  } else if (fileUrl.includes(".net/")) {
    return fileUrl.split(".net/")[1];
  } else {
    const matches = fileUrl.match(/^https?:\/\/[^/]+\/(.+)$/);
    if (matches) return matches[1];
  }
  throw new Error(`Cannot extract S3 key from URL: ${fileUrl}`);
}

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
    const key = `apk/${Date.now()}-${file.originalname}`;
    const fileUrl = await S3Util.uploadFileWithKey(
      file.buffer,
      key,
      file.mimetype,
    );

    const fileRecord = await prisma.file.create({
      data: { filename: file.originalname, fileUrl },
    });

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

    await ApkRepo.incrementDownload(id);

    if (!release.file?.fileUrl) throw new Error("APK file URL not found");
    const key = extractS3Key(release.file.fileUrl);
    const url = await S3PresignedUtil.getDownloadUrl(key);

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

    if (!existing.file?.fileUrl) throw new Error("APK file URL not found");
    await S3Util.deleteFile(existing.file.fileUrl);
    await ApkRepo.delete(id);

    return { message: "APK release deleted successfully" };
  }
}

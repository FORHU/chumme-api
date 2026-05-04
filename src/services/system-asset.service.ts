import SystemAssetRepo from "../repositories/system-asset.repository";
import S3Util from "../utils/s3.util";
import S3PresignedUtil from "../utils/s3-presigned.util";

export default class SystemAssetSvc {
  static async upsertAsset(
    userId: string,
    data: {
      key: string;
      url: string;
      type: string;
      title?: string;
      description?: string;
    },
  ) {
    const asset = await SystemAssetRepo.upsertAsset(data);
    return asset;
  }

  static async updateAsset(id: string, data: { key?: string; url?: string; type?: string; title?: string; description?: string }) {
    return SystemAssetRepo.updateAsset(id, data);
  }

  static async softDelete(id: string) {
    return SystemAssetRepo.softDelete(id);
  }

  static async getAssetByKey(key: string) {
    const asset = await SystemAssetRepo.findByKey(key);
    return this.signAssetUrl(asset);
  }

  static async getAllAssets() {
    const assets = await SystemAssetRepo.findAll();
    return Promise.all(assets.map((asset) => this.signAssetUrl(asset)));
  }

  static async getAssetById(id: string) {
    const asset = await SystemAssetRepo.findById(id);
    return this.signAssetUrl(asset);
  }

  private static async signAssetUrl(asset: any) {
    if (asset && asset.url) {
      const key = S3Util.getKeyFromUrl(asset.url);
      if (key) {
        try {
          const signedUrl = await S3PresignedUtil.getDownloadUrl(key);
          return { ...asset, url: signedUrl };
        } catch (err) {
          console.error(`Error signing URL for asset ${asset.id}:`, err);
        }
      }
    }
    return asset;
  }
}


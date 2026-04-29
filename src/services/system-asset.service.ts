import SystemAssetRepo from "../repositories/system-asset.repository";

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
    return SystemAssetRepo.findByKey(key);
  }

  static async getAllAssets() {
    return SystemAssetRepo.findAll();
  }

  static async getAssetById(id: string) {
    return SystemAssetRepo.findById(id);
  }
}


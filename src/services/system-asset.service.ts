import SystemAssetRepo from "../repositories/system-asset.repository";

export default class SystemAssetSvc {
  static async upsertAsset(userId: string, data: {
    key: string;
    url: string;
    type: string;
  }) {
    const asset = await SystemAssetRepo.upsertAsset(data);
    return asset;
  }

  static async getAssetByKey(key: string) {
    return SystemAssetRepo.findByKey(key);
  }

  static async getAllAssets() {
    return SystemAssetRepo.findAll();
  }
}

import { Request, Response } from "express";
import SystemAssetSvc from "../services/system-asset.service";
import FileSvc from "../services/file.service";

export default class SystemAssetCtrl {
  static async uploadAsset(req: Request, res: Response) {
    try {
      const { key, type } = req.body;
      const userId = (req as any).user?.id;

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (!key || !type) {
        return res.status(400).json({ message: "Key and type are required" });
      }

      // 1. Upload to S3
      const file = await FileSvc.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );

      // 2. Upsert System Asset record
      const asset = await SystemAssetSvc.upsertAsset(userId, {
        key,
        url: file.fileUrl!,
        type,
      });

      return res.status(200).json({
        message: "System asset uploaded successfully",
        asset,
      });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async getAsset(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const asset = await SystemAssetSvc.getAssetByKey(key);

      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      return res.status(200).json({ asset });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async listAssets(req: Request, res: Response) {
    try {
      const assets = await SystemAssetSvc.getAllAssets();
      return res.status(200).json({ assets });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }
}

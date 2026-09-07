import { Request, Response } from "express";
import SystemAssetSvc from "../services/system-asset.service";
import FileSvc from "../services/file.service";

export default class SystemAssetCtrl {
  static async uploadAsset(req: Request, res: Response) {
    try {
      const { key, type, title, description } = req.body;
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
        title,
        description,
      });

      return res.status(200).json({
        message: "System asset uploaded successfully",
        asset,
      });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async upsertAsset(req: Request, res: Response) {
    try {
      const { key, url, type, title, description } = req.body;
      const userId = (req as any).user?.id;

      if (!key || !url || !type) {
        return res
          .status(400)
          .json({ message: "Key, url and type are required" });
      }

      const asset = await SystemAssetSvc.upsertAsset(userId, {
        key,
        url,
        type,
        title,
        description,
      });

      return res.status(200).json({
        message: "System asset updated successfully",
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

  static async updateAsset(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { key, url, type, title, description } = req.body;

      const asset = await SystemAssetSvc.getAssetById(id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      const updated = await SystemAssetSvc.updateAsset(id, {
        key,
        url,
        type,
        title,
        description,
      });

      return res.status(200).json({
        message: "System asset updated successfully",
        asset: updated,
      });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async deleteAsset(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const asset = await SystemAssetSvc.getAssetById(id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      await SystemAssetSvc.softDelete(id);

      return res.status(200).json({
        message: "System asset deleted successfully",
      });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }
}

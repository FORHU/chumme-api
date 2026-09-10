import { Request, Response } from "express";
import Joi from "joi";
import FileSvc from "../services/file.service";
import { planUpload, UploadPolicyError } from "../utils/upload-policy";

export default class FileCtrl {
  static async saveFile(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        filename: Joi.string().optional(),
        fileUrl: Joi.string().uri().optional(),
      })
        .or("filename", "fileUrl")
        .messages({
          "object.missing":
            "Provide either filename or fileUrl in the request body",
        });
      const { error, value } = schema.validate(req.body);
      if (error) return res.status(400).json({ message: error.message });
      const file = await FileSvc.saveFile({
        filename: value.filename,
        fileUrl: value.fileUrl,
      });
      return res.status(201).json({ message: "File saved", file });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async upsertFile(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        id: Joi.string().required(),
        filename: Joi.string().optional(),
        fileUrl: Joi.string().uri().optional(),
      })
        .or("filename", "fileUrl")
        .messages({
          "object.missing":
            "Provide either filename or fileUrl in the request body",
        });

      const { error, value } = schema.validate(req.body);
      if (error) return res.status(400).json({ message: error.message });

      const { file, isUpdate } = await FileSvc.upsertFile({
        id: value.id,
        filename: value.filename,
        fileUrl: value.fileUrl,
      });

      const message = isUpdate ? "File updated" : "File created";
      const statusCode = isUpdate ? 200 : 201;

      return res.status(statusCode).json({ message, file });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async uploadFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = await FileSvc.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );

      return res.status(201).json({
        message: "File uploaded successfully",
        file,
      });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async getAllFiles(req: Request, res: Response) {
    try {
      const files = await FileSvc.getAllFiles();
      return res.status(200).json({ files });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async getFile(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const file = await FileSvc.getFileById(id);

      return res.status(200).json({ file });
    } catch (err: any) {
      const statusCode = err.message === "File not found" ? 404 : 400;
      return res.status(statusCode).json({ message: err.message || err });
    }
  }

  static async deleteFile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await FileSvc.deleteFile(id);
      return res.status(200).json(result);
    } catch (err: any) {
      const statusCode = err.message === "File not found" ? 404 : 400;
      return res.status(statusCode).json({ message: err.message || err });
    }
  }

  /**
   * Issues a presigned PUT for one object.
   *
   * The key is DERIVED, not accepted. This endpoint previously signed whatever
   * `key` the body contained, and had no auth middleware — together that was
   * unauthenticated arbitrary-path write access to the bucket. The caller now
   * says what kind of thing it is uploading; where it lands is ours to decide.
   */
  static async getUploadUrl(req: Request, res: Response) {
    try {
      const { category, contentType, contentLength, prefix } = req.body;

      const plan = planUpload({
        userId: req.user.id,
        category,
        contentType,
        contentLength,
        prefix,
      });

      const url = await FileSvc.getUploadUrl(
        plan.key,
        plan.contentType,
        plan.contentLength,
      );

      // The key goes back because the caller needs it to register the file
      // afterwards — it no longer knows the path it is writing to.
      return res.status(200).json({ ...url, key: plan.key });
    } catch (err: any) {
      if (err instanceof UploadPolicyError) {
        return res.status(400).json({ message: err.message });
      }
      console.error("[FileCtrl] getUploadUrl failed:", err);
      return res.status(500).json({ message: "Could not create upload URL" });
    }
  }

  static async getDownloadUrl(req: Request, res: Response) {
    try {
      const { key } = req.query;

      if (!key) {
        return res
          .status(400)
          .json({ message: "key is required in query parameters" });
      }

      const result = await FileSvc.getDownloadUrl(key as string);

      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async downloadFileById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await FileSvc.getDownloadUrlById(id);
      return res.status(200).json(result);
    } catch (err: any) {
      const statusCode = err.message === "File not found" ? 404 : 400;
      return res.status(statusCode).json({ message: err.message || err });
    }
  }
}

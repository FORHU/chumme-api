import { Request, Response } from "express";
import Joi from "joi";
import FileSvc from "../services/file.service";

export default class FileCtrl {
    // Only the "save" method per your request
    static async saveFile(req: Request, res: Response) {
        try {
            const schema = Joi.object({
                filename: Joi.string().optional(),
                fileUrl: Joi.string().uri().optional()
            }).or("filename", "fileUrl").messages({
                'object.missing': 'Provide either filename or fileUrl in the request body'
            });

            const { error, value } = schema.validate(req.body);
            if (error) return res.status(400).json({ message: error.message });

            const file = await FileSvc.saveFile({ filename: value.filename, fileUrl: value.fileUrl });
            return res.status(201).json({ message: "File saved", file });
        } catch (err: any) {
            return res.status(400).json({ message: err.message || err });
        }
    }
}
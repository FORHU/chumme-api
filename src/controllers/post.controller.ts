import { Request, Response } from "express";
import Joi from "joi";
import PostSvc from "../services/post.service";

export default class PostCtrl {
    static async createPost(req: Request, res: Response) {
        try {
            const schema = Joi.object({
                content: Joi.string().required().max(5000),
                mediaUrls: Joi.array().items(Joi.string().uri()).max(10).optional()
            });

            const { error, value } = schema.validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.message });
            }

            const userId = req.user.userId;
            const post = await PostSvc.createPost(userId, value);

            return res.status(201).json(post);
        } catch (error: any) {
            return res.status(500).json({
                message: error.message || "Failed to create post"
            });
        }
    }
}
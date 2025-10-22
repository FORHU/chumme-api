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

    static async toggleLike(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;

            // Validate UUID format
            const schema = Joi.object({
                id: Joi.string().uuid().required()
            });

            const { error } = schema.validate({ id });
            if (error) {
                return res.status(400).json({ message: "Invalid post ID" });
            }

            const result = await PostSvc.toggleLike(id, userId);
            return res.status(200).json(result);
        } catch (error: any) {
            if (error.message === "Post not found") {
                return res.status(404).json({ message: error.message });
            }
            return res.status(500).json({
                message: error.message || "Failed to toggle like"
            });
        }
    }

    static async createComment(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;

            // Validate input
            const schema = Joi.object({
                id: Joi.string().uuid().required(),
                content: Joi.string().required().max(1000)
            });

            const { error } = schema.validate({
                id,
                content: req.body.content
            });

            if (error) {
                return res.status(400).json({ message: error.message });
            }

            const comment = await PostSvc.createComment(id, userId, req.body.content);
            return res.status(201).json(comment);
        } catch (error: any) {
            if (error.message === "Post not found") {
                return res.status(404).json({ message: error.message });
            }
            return res.status(500).json({
                message: error.message || "Failed to create comment"
            });
        }
    }
}
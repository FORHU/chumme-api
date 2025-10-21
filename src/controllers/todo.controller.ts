import { Request, Response } from "express";
import Joi from "joi";
import TodoSvc from "../services/todo.service";

export default class TodoCtrl {
    static async register(req: Request, res: Response) {
        const { email, password, username, name } = req.body;

        const schema = Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().min(6).required(),
            username: Joi.string().required(),
            name: Joi.string().optional()
        });

        const { error } = schema.validate({ email, password, username, name });
        if (error) {
            return res.status(400).json({ message: error.message });
        }

        try {
            const result = await TodoSvc.register({ email, password, username, name });
            return res.status(201).json({ message: "User created successfully", user: result });
        } catch (error) {
            return res.status(500).json({ message: error });
        }
    }
}

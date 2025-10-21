import { Request, Response } from "express";
import Joi from "joi";
import AuthSvc from "../services/auth.service";

export default class AuthCtrl {
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
            const user = await AuthSvc.register({ email, password, username, name });
            return res.status(201).json({ message: "User created successfully", user });
        } catch (error) {
            return res.status(500).json({ message: error });
        }
    }

    static async login(req: Request, res: Response) {
        const { email, password } = req.body;

        const schema = Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().required()
        });

        const { error } = schema.validate({ email, password });
        if (error) {
            return res.status(400).json({ message: error.message });
        }

        try {
            const result = await AuthSvc.login({ email, password });
            return res.json(result);
        } catch (error) {
            return res.status(401).json({ message: error });
        }
    }
}
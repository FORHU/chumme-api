import { Request, Response } from "express";
import Joi from "joi";
import UserSvc from "../services/user.service";

export default class UserCtrl {
    static async getCurrentUser(req: Request, res: Response) {
        try {

            const user = req.user; // From auth middleware
            return res.json(user);
        } catch (error) {
            console.error('Error in getCurrentUser:', error);
            return res.status(500).json({ message: error });
        }
    }

    static async deleteAccount(req: Request, res: Response) {
        try {
            const userId = req.user.id;
            await UserSvc.deleteUser(userId);
            return res.status(200).json({
                message: "Account successfully deleted"
            });
        } catch (error) {
            return res.status(500).json({
                message: error instanceof Error ? error.message : "An error occurred"
            });
        }
    }

    static async getAllUsers(req: Request, res: Response) {
        try {
            const users = await UserSvc.getAllUsers();
            return res.json(users);
        } catch (error) {
            return res.status(500).json({
                message: error instanceof Error ? error.message : "Failed to fetch users"
            });
        }
    }

    static async updateUser(req: Request, res: Response) {
        try {
            const schema = Joi.object({
                username: Joi.string(),
                name: Joi.string(),
                email: Joi.string().email()
            }).min(1);

            const { error, value } = schema.validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.message });
            }

            const userId = req.user.id;
            const updatedUser = await UserSvc.updateUser(userId, value);

            return res.json(updatedUser);
        } catch (error: any) {
            return res.status(error.statusCode || 500).json({
                message: error.message || "Failed to update user"
            });
        }
    }
}


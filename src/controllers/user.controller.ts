import { Request, Response } from "express";
import UserSvc from "../services/user.service";

export default class UserCtrl {
    static async getCurrentUser(req: Request, res: Response) {
        try {
            const userId = req.user.userId; // From auth middleware
            console.log('Looking for user with ID:', userId);
            const user = await UserSvc.getUserById(userId);
            if (!user) {
                console.log('No user found with ID:', userId);
                return res.status(404).json({ message: "User not found" });
            }
            return res.json(user);
        } catch (error) {
            console.error('Error in getCurrentUser:', error);
            return res.status(500).json({ message: error });
        }
    }

    static async deleteAccount(req: Request, res: Response) {
        try {
            const userId = req.user.userId;
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
}


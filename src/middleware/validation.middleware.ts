import { Request, Response, NextFunction } from "express";
import UserRepo from "../repositories/user.repository";

export const validateDeleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await UserRepo.findUserById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.isDeleted) {
            return res.status(400).json({ message: "Account already deactivated" });
        }
        next();
    } catch (error) {
        return res.status(500).json({
            message: "Error validating request"
        });
    }
};
import { Request, Response } from "express";
import Joi from "joi";
import UserSvc from "../services/user.service";
import AuthSvc from "../services/auth.service";
import { UserRole } from "@prisma/client";

export default class UserCtrl {
  static async createAdmin(req: Request, res: Response) {
    try {
      // Check if the current user is an ADMIN or DEVELOPER
      if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.DEVELOPER) {
        return res.status(403).json({ message: "Forbidden: Only admins can create admin accounts" });
      }

      const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        username: Joi.string().required(),
        name: Joi.string().optional(),
        mobileNumber: Joi.string().optional(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.message });
      }

      // Register the admin directly
      const data = await AuthSvc.register({
        email: value.email,
        password: value.password,
        username: value.username,
        name: value.name,
        mobileNumber: value.mobileNumber,
        role: UserRole.ADMIN,
      });

      return res.status(201).json({ message: "Admin account created successfully", data });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }

  static async updateUserStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const schema = Joi.object({
        isActive: Joi.boolean(),
        role: Joi.string().valid(UserRole.USER, UserRole.CREATOR, UserRole.ADMIN, UserRole.DEVELOPER),
        isDeleted: Joi.boolean(),
      }).min(1);

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.message });
      }

      const updatedUser = await UserSvc.updateUser(id, value);

      return res.status(200).json({
        message: "User status updated successfully",
        data: updatedUser,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "Failed to update user status",
      });
    }
  }

  static async getCurrentUser(req: Request, res: Response) {
    try {
      const user = req.user; // From auth middleware
      return res.json({
        ...user,
        artistCount: user._count?.socialUserDiscoveries ?? 0,
      });
    } catch (error) {
      console.error("Error in getCurrentUser:", error);
      return res.status(500).json({ message: error });
    }
  }

  static async deleteAccount(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      await UserSvc.deleteUser(userId);
      return res.status(200).json({
        message: "Account successfully deleted",
      });
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "An error occurred",
      });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        username: Joi.string(),
        name: Joi.string(),
        email: Joi.string().email(),
        avatar: Joi.string().uuid().optional(),
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
        message: error.message || "Failed to update user",
      });
    }
  }
}

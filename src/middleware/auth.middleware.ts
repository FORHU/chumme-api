import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import UserRepo from "../repositories/user.repository";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as {
      userId: string;
    };
    const user = await UserRepo.findUserForAuth(decoded.userId);
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "User not found" });
    }
    req.user = user;
    next();
  } catch (error: any) {
    console.error("[AuthMiddleware] Token verification failed:", error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

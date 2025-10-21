import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as { userId: string };
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
}
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import UserRepo from "../repositories/user.repository";
import PlaylistRepo from "../repositories/playlist.repository";

// Extend Express Request type to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/** Like authenticate, but doesn't reject unauthenticated requests — just populates req.user when a valid token is present. */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as {
      userId: string;
    };
    const user = await UserRepo.findUserForAuth(decoded.userId);
    if (user && !user.isDeleted) req.user = user;
  } catch {
    // Invalid token — treat as unauthenticated, don't block the request
  }
  next();
};

/**
 * Verifies the requesting user owns the playlist at :id.
 * Must be placed after `authenticate` so req.user is already set.
 */
export const requirePlaylistOwner = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const playlistId = req.params.id;
  if (!playlistId)
    return res.status(400).json({ message: "Playlist ID required" });

  const row = await PlaylistRepo.findOwner(playlistId);
  if (!row || row.deletedAt) {
    return res.status(404).json({ message: "Playlist not found" });
  }
  if (row.userId !== req.user.id) {
    return res.status(403).json({ message: "You do not own this playlist" });
  }
  next();
};

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

/**
 * Verifies that the requesting user has one of the allowed roles.
 * Must be placed after `authenticate` so req.user is already set.
 */
export const requireRoles = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // DEVELOPER has access to everything
    if (req.user.role === "DEVELOPER") {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Forbidden: Requires one of the following roles: ${allowedRoles.join(", ")}` 
      });
    }

    next();
  };
};

import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_SECRET } from "../config";
import AuthSvc from "../services/auth.service";

interface AuthenticatedSocket extends Socket {
  user?: any;
}

const authenticateSocket = async (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
) => {
  try {
    const authHeader = socket.handshake.headers["authorization"];

    if (!authHeader)
      return next(new Error("Unauthorized: Missing authorization header"));

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return next(new Error("Unauthorized: Invalid authorization!"));
    }

    const token = parts[1];

    if (!token) {
      return next(new Error("Unauthorized: Token missing"));
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    } catch (err) {
      return next(new Error("Unauthorized: Invalid or expired token"));
    }

    if (!decoded || !decoded.userId) {
      return next(new Error("Unauthorized: Invalid token payload"));
    }

    const sessionUser = await AuthSvc.getAuthUser(decoded.userId);

    if (!sessionUser) {
      return next(new Error("Unauthorized: User not found"));
    }

    socket.user = sessionUser;

    return next();
  } catch (error) {
    console.error("Authentication error:", error);
    return next(new Error("Socket authentication failed"));
  }
};

export default authenticateSocket;

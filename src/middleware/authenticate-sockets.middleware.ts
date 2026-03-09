import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_SECRET } from "../config";
import AuthSvc from "../services/auth.service";

interface AuthenticatedSocket extends Socket {
  user?: any;
}

const authenticateSocket = async (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void,
) => {
  try {
    let token: string | undefined;

    // 1. Check handshake.auth (modern Socket.IO client-side 'auth' option)
    const authToken = socket.handshake.auth?.token;
    if (authToken) {
      token = authToken.startsWith("Bearer ")
        ? authToken.split(" ")[1]
        : authToken;
    }

    // 2. Fallback to handshake.headers (legacy/custom header approach)
    if (!token) {
      const authHeader = socket.handshake.headers["authorization"];
      if (authHeader) {
        const parts = authHeader.split(" ");
        if (parts.length === 2 && parts[0] === "Bearer") {
          token = parts[1];
        }
      }
    }

    if (!token) {
      return next(new Error("Unauthorized: Missing or invalid token"));
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

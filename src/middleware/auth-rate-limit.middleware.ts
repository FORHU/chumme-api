import rateLimit from "express-rate-limit";
import { isDev } from "../config";

/**
 * Per IP, for the credential and OTP routes: login, register, code checks,
 * resets. These run before anyone is signed in, so there is no user to key
 * on. 10 a minute covers a person retyping a password or code; it stops a
 * script guessing passwords or spraying reset emails. Refresh-token and
 * logout are left off — the app calls them in the background.
 *
 * Trusts the client IP Express derives from `trust proxy`, so this only holds
 * while the API is reachable solely through the proxy — a client hitting the
 * container port directly can set X-Forwarded-For and dodge the key.
 */
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  skip: () => isDev,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please wait a minute and try again.",
  },
});

import jwt from "jsonwebtoken";
import crypto from "crypto";
import AuthRepo from "../repositories/auth.repository";
import CacheUtil from "./cache.util";
import {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRY,
} from "../config";

/**
 * Common OAuth SSO flow after user verification
 * Handles token generation, session creation, and caching
 */
export const completeOAuthLogin = async (
  user: any,
  provider: string,
  providerUserId?: string,
  providerAvatarUrl?: string,
) => {
  // Update login status
  await AuthRepo.updateUserLoginStatus(user.id);

  // Generate tokens
  const accessToken = jwt.sign({ userId: user.id }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY as any,
  });

  // Generate unique refresh token with jti (JWT ID) to prevent duplicates
  const refreshToken = jwt.sign(
    {
      userId: user.id,
      jti: crypto.randomBytes(16).toString("hex"), // Unique session ID
    },
    REFRESH_TOKEN_SECRET,
    {
      expiresIn: "7d",
    },
  );

  // Create session with provider information
  await AuthRepo.createSession({
    userId: user.id,
    refreshToken: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    provider,
    providerUserId,
    providerAvatarUrl,
  });

  // Cache user data
  await CacheUtil.set(`user:${user.id}`, user);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      avatar: user.avatar?.fileUrl,
      onboardingStatus: user.onboardingCompleted,
    },
  };
};

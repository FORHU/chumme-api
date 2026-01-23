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
  // Update login status and get the latest user state (with avatar)
  const updatedUser = await AuthRepo.updateUserLoginStatus(user.id);
  const finalUser = updatedUser || user;

  // Generate tokens
  const accessToken = jwt.sign({ userId: finalUser.id }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY as any,
  });

  // Generate unique refresh token with jti (JWT ID) to prevent duplicates
  const refreshToken = jwt.sign(
    {
      userId: finalUser.id,
      jti: crypto.randomBytes(16).toString("hex"), // Unique session ID
    },
    REFRESH_TOKEN_SECRET,
    {
      expiresIn: "7d",
    },
  );

  // Create session with provider information
  await AuthRepo.createSession({
    userId: finalUser.id,
    refreshToken: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    provider,
    providerUserId,
    providerAvatarUrl,
  });

  // Cache user data
  await CacheUtil.set(`user:${finalUser.id}`, finalUser);

  return {
    accessToken,
    refreshToken,
    user: {
      id: finalUser.id,
      email: finalUser.email,
      username: finalUser.username,
      name: finalUser.name,
      role: finalUser.role,
      avatar: finalUser.avatar?.fileUrl,
      onboardingStatus: finalUser.onboardingCompleted,
    },
  };
};

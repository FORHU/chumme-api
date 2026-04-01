import AuthRepo from "../repositories/auth.repository";
import SessionSessionSocialAccountRepo from "../repositories/net-communities/session-social-account.repository";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { generateOTP, getOTPExpiry, isOTPExpired } from "../utils/otp.utils";
import { sendTemplatedEmail } from "../utils/helpers";
import CacheUtil from "../utils/cache.util";
import {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRY,
  GOOGLE_CLIENT_ID,
} from "../config";
import { AutoSyncSvc } from "./net-communities/ingestion/auto-sync.service";
import { SocialPlatform } from "@prisma/client";

export default class AuthSvc {
  static async register(data: {
    email: string;
    password: string;
    username: string;
    name?: string;
    mobileNumber?: string;
    idToken?: string;
    accessToken?: string;
  }) {
    // Check if user already exists
    const existingUser = await AuthRepo.findUserByEmail(data.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const existingUsername = await AuthRepo.findUserByUsername(data.username);
    if (existingUsername) {
      throw new Error("Username is already taken");
    }

    // Hash password (same method as login)
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .pbkdf2Sync(data.password, salt, 1000, 64, "sha512")
      .toString("hex");
    const hashedPassword = `${salt}:${hash}`;

    // GENERATE OTP
    const otp = generateOTP(); // "582941"
    const otpExpiry = getOTPExpiry(); // 5 minutes from now

    // Create user with OTP
    const user = await AuthRepo.createUser({
      email: data.email,
      password: hashedPassword,
      username: data.username,
      name: data.name,
      mobileNumber: data.mobileNumber,
      otpCode: otp, // Save OTP
      otpExpiry: otpExpiry, // Save expiry
    });

    // Send verification email with OTP
    try {
      sendTemplatedEmail({
        subject: `Verify Your Email Address`,
        email_data: {
          email: user.email,
          OTP_CODE: otp.toString(),
        },
        template_name: "verification-email.html",
      });
    } catch (error) {
      console.error("Failed to send verification email:", error);
      // Still log to console as backup
      console.log(`Backup - OTP for ${user.email}: ${otp}`);
    }

    // --- Automatic Social Linking (New) ---
    if (data.idToken) {
      try {
        const client = new OAuth2Client(GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
          idToken: data.idToken,
          audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (payload && payload.email === user.email) {
          await SessionSessionSocialAccountRepo.upsertSocialAccount({
            userId: user.id,
            platform: "google",
            providerUserId: payload.sub,
            accessToken: data.idToken,
            avatarUrl: payload.picture,
          });
          // YouTube platform is created only via onboarding connect-google / linkGoogleAccount (youtube.readonly), not here.
          console.log(
            `[AuthSvc] Auto-linked Google during registration for user ${user.id}`,
          );
        }
      } catch (err) {
        console.error(
          "[AuthSvc] Failed to auto-link Google account during registration:",
          err,
        );
      }
    }

    if (data.accessToken) {
      try {
        const response = await fetch(
          `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${data.accessToken}`,
        );
        if (response.ok) {
          const userData = await response.json();
          if (userData.email === user.email) {
            await SessionSessionSocialAccountRepo.upsertSocialAccount({
              userId: user.id,
              platform: "facebook",
              providerUserId: userData.id,
              accessToken: data.accessToken,
              avatarUrl: userData.picture?.data?.url,
            });
            await SessionSessionSocialAccountRepo.upsertSocialAccount({
              userId: user.id,
              platform: "instagram",
              providerUserId: userData.id,
              accessToken: data.accessToken,
              avatarUrl: userData.picture?.data?.url,
            });
            console.log(
              `[AuthSvc] Auto-linked Facebook/Instagram during registration for user ${user.id}`,
            );

            // Trigger Auto-Sync (New)
            AutoSyncSvc.syncLinkedAccount(
              user.id,
              SocialPlatform.INSTAGRAM,
              data.accessToken,
            );
          }
        }
      } catch (err) {
        console.error(
          "[AuthSvc] Failed to auto-link Facebook account during registration:",
          err,
        );
      }
    }

    // Generate tokens and create session using the unified helper
    const authResponse = await this.generateAuthResponse(user, "chumme");

    return {
      ...authResponse,
      message:
        "Registration successful! Please check your email for verification code.",
    };
  }

  /**
   * Verify OTP only — does NOT mark email as verified or clear the code.
   * Used by forgot-password flow to validate the code before allowing reset.
   */
  static async verifyOtp(email: string, otpCode: string) {
    const user = await AuthRepo.findUserByEmail(email);

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.otpCode || !user.otpExpiry) {
      throw new Error("No verification code found. Please request a new one.");
    }

    if (user.otpCode !== otpCode) {
      throw new Error("Invalid verification code");
    }

    if (isOTPExpired(user.otpExpiry)) {
      throw new Error("Verification code expired. Please request a new one.");
    }

    return { message: "OTP verified" };
  }

  static async verifyEmail(email: string, otpCode: string) {
    const user = await AuthRepo.findUserByEmail(email);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.isEmailVerified) {
      throw new Error("Email already verified");
    }

    if (!user.otpCode || !user.otpExpiry) {
      throw new Error("No verification code found. Please register again.");
    }

    if (user.otpCode !== otpCode) {
      throw new Error("Invalid verification code");
    }

    if (isOTPExpired(user.otpExpiry)) {
      throw new Error("Verification code expired. Please request a new one.");
    }

    await AuthRepo.updateUser(user.id, {
      isEmailVerified: true,
      otpCode: null,
      otpExpiry: null,
    });

    return {
      message: "Email verified successfully! You can now login.",
    };
  }

  static async login({
    email,
    password,
    idToken,
    accessToken,
  }: {
    email: string;
    password: string;
    idToken?: string;
    accessToken?: string;
  }) {
    const user = await AuthRepo.findUserByEmail(email);
    if (!user) {
      throw "Invalid credentials";
    }

    if (!user.isEmailVerified) {
      return {
        requiresVerification: true,
        message: "Please verify your email before logging in.",
        user: {
          email: user.email,
          isEmailVerified: user.isEmailVerified,
          otpExpiry: user.otpExpiry ?? null,
        },
      };
    }

    // Verify password
    if (!user.password) {
      throw "This account uses a social provider. Please login with Google or Facebook.";
    }

    if (user.password === "GOOGLE_SSO_USER") {
      throw "Please use Google login for this account.";
    }

    if (user.password === "FACEBOOK_SSO_USER") {
      throw "Please use Facebook login for this account.";
    }

    try {
      const [salt, storedHash] = user.password.split(":");
      if (!salt || !storedHash) {
        throw new Error("Invalid password format");
      }

      const hash = crypto
        .pbkdf2Sync(password, salt, 1000, 64, "sha512")
        .toString("hex");

      if (storedHash !== hash) {
        throw "Invalid credentials";
      }
    } catch (e) {
      throw "Invalid credentials";
    }

    // --- Automatic Social Linking (New) ---
    if (idToken) {
      try {
        const client = new OAuth2Client(GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
          idToken,
          audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (payload && payload.email === user.email) {
          await SessionSessionSocialAccountRepo.upsertSocialAccount({
            userId: user.id,
            platform: "google",
            providerUserId: payload.sub,
            accessToken: idToken,
            avatarUrl: payload.picture,
          });
          // YouTube platform is created only via onboarding connect-google / linkGoogleAccount.
          console.log(`[AuthSvc] Auto-linked Google for user ${user.id}`);
        }
      } catch (err) {
        console.error(
          "[AuthSvc] Failed to auto-link Google account during login:",
          err,
        );
      }
    }

    if (accessToken) {
      try {
        const response = await fetch(
          `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`,
        );
        if (response.ok) {
          const userData = await response.json();
          if (userData.email === user.email) {
            await SessionSessionSocialAccountRepo.upsertSocialAccount({
              userId: user.id,
              platform: "facebook",
              providerUserId: userData.id,
              accessToken,
              avatarUrl: userData.picture?.data?.url,
            });
            await SessionSessionSocialAccountRepo.upsertSocialAccount({
              userId: user.id,
              platform: "instagram",
              providerUserId: userData.id,
              accessToken,
              avatarUrl: userData.picture?.data?.url,
            });
            console.log(
              `[AuthSvc] Auto-linked Facebook/Instagram for user ${user.id}`,
            );

            // Trigger Auto-Sync (New)
            AutoSyncSvc.syncLinkedAccount(
              user.id,
              SocialPlatform.INSTAGRAM,
              accessToken,
            );
          }
        }
      } catch (err) {
        console.error(
          "[AuthSvc] Failed to auto-link Facebook account during login:",
          err,
        );
      }
    }

    // Update login status and get the latest user state (with avatar)
    const updatedUser = await AuthRepo.updateUserLoginStatus(user.id);
    const finalUser = updatedUser || user;

    // Generate tokens and create session using the unified helper
    return this.generateAuthResponse(finalUser, "chumme");
  }

  static async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET!,
      ) as { userId: string };

      // Find valid session
      const session = await AuthRepo.findValidSession(refreshToken);
      if (!session) {
        throw "Invalid refresh token";
      }

      // Get user
      const user = await AuthRepo.findUserById(decoded.userId);
      if (!user) {
        throw "User not found";
      }

      // Generate new access token
      const accessToken = jwt.sign({ userId: user.id }, ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY as any,
      });

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          role: user.role,
          avatar: user.avatar?.fileUrl,
          onboardingCompleted: user.onboardingCompleted,
          artistCount: user.socialUserDiscoveries ? 1 : 0,
        },
      };
    } catch (error) {
      throw "Invalid refresh token";
    }
  }

  static async logout(userId: string, refreshToken?: string) {
    // Invalidate session if refresh token provided
    if (refreshToken) {
      await AuthRepo.deleteSession(refreshToken);
    }

    // Clear user cache on logout
    await CacheUtil.del(`user:${userId}`);

    return { message: "Logged out successfully" };
  }

  // Send OTP to reset password
  static async forgotPassword(email: string) {
    // Find user by email
    const user = await AuthRepo.findUserByEmail(email);

    if (!user) {
      // security
      return {
        message:
          "If an account exists with this email, you will receive a password reset code.",
      };
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry();

    // Save OTP to user
    await AuthRepo.updateUser(user.id, {
      otpCode: otp,
      otpExpiry: otpExpiry,
    });

    // Send email with OTP
    // Send email with OTP
    try {
      sendTemplatedEmail({
        subject: "Password Reset Code",
        email_data: {
          email: user.email,
          OTP_CODE: otp.toString(),
        },
        template_name: "forgot-password.html",
      });
    } catch (error) {
      console.log(`Password Reset OTP for ${user.email}: ${otp}`);
    }

    return {
      message:
        "If an account exists with this email, you will receive a password reset code.",
    };
  }

  // Verify OTP and change password
  static async resetPassword(
    email: string,
    otpCode: string,
    newPassword: string,
  ) {
    // Find user by email
    const user = await AuthRepo.findUserByEmail(email);

    if (!user) {
      throw new Error("Invalid request");
    }

    // Check if OTP exists
    if (!user.otpCode || !user.otpExpiry) {
      throw new Error(
        "No password reset request found. Please request a new code.",
      );
    }

    // Check if OTP expired
    if (isOTPExpired(user.otpExpiry)) {
      throw new Error("Reset code has expired. Please request a new one.");
    }

    // Check if OTP matches
    if (user.otpCode !== otpCode) {
      throw new Error("Invalid reset code");
    }

    // Hash new password (same method as registration)
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .pbkdf2Sync(newPassword, salt, 1000, 64, "sha512")
      .toString("hex");
    const hashedPassword = `${salt}:${hash}`;

    // Update password and clear OTP
    await AuthRepo.updateUser(user.id, {
      password: hashedPassword,
      otpCode: null,
      otpExpiry: null,
    });

    return {
      message:
        "Password reset successfully! You can now login with your new password.",
    };
  }

  static async resendVerificationOTP(email: string) {
    const user = await AuthRepo.findUserByEmail(email);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.isEmailVerified) {
      throw new Error("Email already verified");
    }

    const otp = generateOTP();
    const otpExpiry = getOTPExpiry();

    await AuthRepo.updateUser(user.id, {
      otpCode: otp,
      otpExpiry: otpExpiry,
    });

    try {
      sendTemplatedEmail({
        subject: "Verify Your Email Address",
        email_data: {
          email: user.email,
          OTP_CODE: otp.toString(),
        },
        template_name: "verification-email.html",
      });
    } catch (error) {
      console.log(`OTP for ${user.email}: ${otp}`);
    }
    return {
      message: "New verification code sent to your email",
    };
  }
  static async getAuthUser(userId: string) {
    return AuthRepo.getAuthUser(userId);
  }

  static async googleAuthSSO(idToken: string) {
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);

    try {
      // Verify the ID token with Google
      const ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error("Invalid Google token payload");
      }

      // Find or create user
      const user = await AuthRepo.findOrCreateGoogleUser({
        email: payload.email,
        name: payload.name,
        provider: "google",
        avatarUrl: payload.picture,
      });

      // Persist the social account tokens for multi-platform support
      // Link as "google"
      await SessionSessionSocialAccountRepo.upsertSocialAccount({
        userId: user.id,
        platform: "google",
        providerUserId: payload.sub,
        accessToken: idToken,
        avatarUrl: payload.picture,
      });

      // Do not create platform "youtube" here — that is reserved for onboarding connect-google /
      // linkGoogleAccount (YouTube API scope + access token). Avoids showing "Google linked" on
      // onboarding before the user completes the dedicated YouTube connect step.

      // Complete OAuth login flow with provider info
      return this.generateAuthResponse(
        user,
        "google",
        payload.sub, // Google user ID
        payload.picture, // Google profile picture
      );
    } catch (error: any) {
      console.error("Google SSO error:", error);
      throw new Error("Failed to verify Google token");
    }
  }

  static async facebookAuthSSO(accessToken: string) {
    try {
      // Verify the access token with Facebook Graph API
      const response = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`,
      );

      if (!response.ok) {
        throw new Error("Invalid Facebook token");
      }

      const userData = await response.json();

      if (!userData.email) {
        throw new Error(
          "Email not provided by Facebook. Please grant email permission.",
        );
      }

      // Find or create user
      const user = await AuthRepo.findOrCreateFacebookUser({
        email: userData.email,
        name: userData.name,
        provider: "facebook",
        facebookId: userData.id,
        avatarUrl: userData.picture?.data?.url,
      });

      // Persist the social account tokens for multi-platform support
      await SessionSessionSocialAccountRepo.upsertSocialAccount({
        userId: user.id,
        platform: "facebook",
        providerUserId: userData.id,
        accessToken,
        avatarUrl: userData.picture?.data?.url,
      });

      // Also link as "instagram" context
      await SessionSessionSocialAccountRepo.upsertSocialAccount({
        userId: user.id,
        platform: "instagram",
        providerUserId: userData.id,
        accessToken,
        avatarUrl: userData.picture?.data?.url,
      });

      // Trigger Auto-Sync (New)
      AutoSyncSvc.syncLinkedAccount(
        user.id,
        SocialPlatform.FACEBOOK,
        accessToken,
      );
      AutoSyncSvc.syncLinkedAccount(
        user.id,
        SocialPlatform.INSTAGRAM,
        accessToken,
      );

      // Complete OAuth login flow with provider info
      return this.generateAuthResponse(
        user,
        "facebook",
        userData.id, // Facebook user ID
        userData.picture?.data?.url, // Facebook profile picture
      );
    } catch (error: any) {
      console.error("Facebook SSO error:", error);
      throw new Error("Failed to verify Facebook token");
    }
  }

  /**
   * Common auth response handler
   * Handles token generation, session creation, and caching
   */
  private static async generateAuthResponse(
    user: any,
    provider: string,
    providerUserId?: string,
    providerAvatarUrl?: string,
  ) {
    // Ensure we have the latest login status updated
    const updatedUser = await AuthRepo.updateUserLoginStatus(user.id);
    const finalUser = updatedUser || user;

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: finalUser.id },
      ACCESS_TOKEN_SECRET,
      {
        expiresIn: ACCESS_TOKEN_EXPIRY as any,
      },
    );

    const refreshToken = jwt.sign(
      {
        userId: finalUser.id,
        jti: crypto.randomBytes(16).toString("hex"),
      },
      REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      },
    );

    // Create session in database
    await AuthRepo.createSession({
      userId: finalUser.id,
      refreshToken,
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
        onboardingCompleted: finalUser.onboardingCompleted,
        artistCount: finalUser.socialUserDiscoveries ? 1 : 0,
      },
    };
  }
}

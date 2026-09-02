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
  GOOGLE_ANDROID_CLIENT_ID,
} from "../config";
import { AutoSyncSvc } from "./net-communities/ingestion/auto-sync.service";
import { OtpPurpose, SocialPlatform, UserRole } from "@prisma/client";

/**
 * Addresses are rejected here as well as at the route edge. `email` is the
 * account-recovery channel, so a malformed or unowned address is an account
 * takeover waiting to happen — the check belongs next to the write, not only
 * in whichever controller happens to call it.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

export function isValidEmail(value: string): boolean {
  const trimmed = (value || "").trim();
  // Guard the length before the regex: an over-long local part is invalid
  // anyway, and bounding it keeps the check linear.
  if (!trimmed || trimmed.length > 254) return false;
  return EMAIL_RE.test(trimmed);
}

export default class AuthSvc {
  /** pbkdf2 with a per-password salt, stored as `salt:hash`. */
  private static hashPassword(plain: string): string {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .pbkdf2Sync(plain, salt, 1000, 64, "sha512")
      .toString("hex");
    return `${salt}:${hash}`;
  }

  /** Constant-time check of `plain` against a stored `salt:hash`. */
  private static verifyPassword(plain: string, stored: string | null): boolean {
    if (!stored) return false;
    const [salt, storedHash] = stored.split(":");
    if (!salt || !storedHash) return false;

    const hash = crypto
      .pbkdf2Sync(plain, salt, 1000, 64, "sha512")
      .toString("hex");

    // Both sides are fixed-length hex of the same digest, so they normally
    // match in length — but a truncated stored hash would make timingSafeEqual
    // throw, so compare lengths first.
    const a = Uint8Array.from(Buffer.from(hash, "hex"));
    const b = Uint8Array.from(Buffer.from(storedHash, "hex"));
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  /**
   * Redeem the account's live OTP for one specific flow.
   *
   * The purpose check is the point: User carries a single otpCode slot shared
   * by every flow, so without it a code emailed to verify an address would also
   * unlock a password change. Codes minted before otpPurpose existed are
   * backfilled by the migration, so a null purpose here means the slot was
   * written by a build that predates this check — treat it as unusable rather
   * than as a wildcard.
   */
  private static assertOtp(
    user: {
      otpCode: string | null;
      otpExpiry: Date | null;
      otpPurpose: OtpPurpose | null;
    },
    otpCode: string,
    purpose: OtpPurpose,
  ): void {
    if (!user.otpCode || !user.otpExpiry) {
      throw new Error("No verification code found. Please request a new one.");
    }

    if (user.otpPurpose !== purpose) {
      // Deliberately indistinguishable from a wrong code: saying "that code was
      // for something else" tells an attacker which flow the live code belongs to.
      throw new Error("Invalid verification code");
    }

    if (isOTPExpired(user.otpExpiry)) {
      throw new Error("Verification code expired. Please request a new one.");
    }

    const encoder = new TextEncoder();
    const supplied = encoder.encode(String(otpCode));
    const actual = encoder.encode(user.otpCode);
    if (
      supplied.length !== actual.length ||
      !crypto.timingSafeEqual(supplied, actual)
    ) {
      throw new Error("Invalid verification code");
    }
  }

  static async register(data: {
    email: string;
    password: string;
    username: string;
    name?: string;
    mobileNumber?: string;
    role?: UserRole;
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

    // Create user with OTP.
    //
    // The checks above filter `isDeleted: false`, but `email` and `username`
    // are unconditional unique columns — so a row they cannot see can still
    // own the identifier. New deletions release theirs (see
    // `UserRepo.softDeleteUser`); accounts deleted before that shipped still
    // hold them, and two concurrent signups can race the check either way.
    // Without this, Prisma's raw "Invalid `prisma.user.create()` invocation"
    // string went to the client as the error message.
    let user;
    try {
      user = await AuthRepo.createUser({
        email: data.email,
        password: hashedPassword,
        username: data.username,
        name: data.name,
        mobileNumber: data.mobileNumber,
        role: data.role,
        otpCode: otp, // Save OTP
        otpExpiry: otpExpiry, // Save expiry
        otpPurpose: OtpPurpose.EMAIL_VERIFICATION,
      });
    } catch (error: any) {
      if (error?.code === "P2002") {
        const targets: string[] = Array.isArray(error?.meta?.target)
          ? error.meta.target
          : [error?.meta?.target].filter(Boolean);

        if (targets.includes("username")) {
          throw new Error("Username is already taken");
        }
        throw new Error("User with this email already exists");
      }
      throw error;
    }

    // Send verification email with OTP
    try {
      await sendTemplatedEmail({
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
          audience: [GOOGLE_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID],
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

    return {
      message:
        "Registration successful! Please check your email for verification code.",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isEmailVerified: false,
      },
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

    // Scoped to PASSWORD_RESET: this is the forgot-password pre-check, and it
    // deliberately leaves the code live for resetPassword to spend.
    this.assertOtp(user, otpCode, OtpPurpose.PASSWORD_RESET);

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

    this.assertOtp(user, otpCode, OtpPurpose.EMAIL_VERIFICATION);

    await AuthRepo.updateUser(user.id, {
      isEmailVerified: true,
      otpCode: null,
      otpExpiry: null,
      otpPurpose: null,
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
      // Automatically send a new OTP if login is attempted on an unverified account
      await this.resendVerificationOTP(user.email);

      return {
        requiresVerification: true,
        message:
          "Please verify your email before logging in. A new verification code has been sent.",
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
          audience: [GOOGLE_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID],
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
      otpPurpose: OtpPurpose.PASSWORD_RESET,
    });

    // Send email with OTP
    // Send email with OTP
    try {
      await sendTemplatedEmail({
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

    this.assertOtp(user, otpCode, OtpPurpose.PASSWORD_RESET);

    // Update password and clear OTP
    await AuthRepo.updateUser(user.id, {
      password: this.hashPassword(newPassword),
      otpCode: null,
      otpExpiry: null,
      otpPurpose: null,
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
      otpPurpose: OtpPurpose.EMAIL_VERIFICATION,
    });

    try {
      await sendTemplatedEmail({
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

  // ── Password change (signed-in) ────────────────────────────────────────────
  //
  // Split into request + confirm so the change is gated on two independent
  // factors: knowing the current password, and controlling the inbox. A stolen
  // session alone cannot rotate the password and lock the owner out.

  /**
   * Step 1 — check the current password and email a PASSWORD_CHANGE code.
   */
  static async requestPasswordChange(userId: string, currentPassword: string) {
    const user = await AuthRepo.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.password) {
      // SSO-only accounts have no password to compare against, so there is
      // nothing this flow can verify. Point them at the reset flow, which
      // establishes a password from inbox control alone.
      throw new Error(
        "This account signs in with Google or Facebook. Use 'Forgot password' to set a password first.",
      );
    }

    if (!this.verifyPassword(currentPassword, user.password)) {
      const err: any = new Error("Your current password is incorrect");
      err.statusCode = 401;
      throw err;
    }

    const otp = generateOTP();

    await AuthRepo.updateUser(user.id, {
      otpCode: otp,
      otpExpiry: getOTPExpiry(),
      otpPurpose: OtpPurpose.PASSWORD_CHANGE,
    });

    try {
      await sendTemplatedEmail({
        subject: "Confirm Your Password Change",
        email_data: { email: user.email, OTP_CODE: otp.toString() },
        template_name: "forgot-password.html",
      });
    } catch (error) {
      console.log(`Password change OTP for ${user.email}: ${otp}`);
    }

    return {
      message: "We sent a confirmation code to your email.",
      data: { email: user.email },
    };
  }

  /**
   * Step 2 — redeem the code and write the new password.
   *
   * currentPassword is re-checked here rather than trusted from step 1: the two
   * calls are minutes apart, and re-checking means a code intercepted in that
   * window is still not enough on its own.
   */
  static async confirmPasswordChange(
    userId: string,
    currentPassword: string,
    otpCode: string,
    newPassword: string,
    /**
     * The caller's own refresh token, so its session survives the purge. The
     * access token only carries `userId`, so the server cannot identify the
     * calling session on its own. Omitted (older clients) means every session
     * dies, including this one — safe, just a forced re-login.
     */
    keepRefreshToken?: string | null,
  ) {
    const user = await AuthRepo.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (!this.verifyPassword(currentPassword, user.password)) {
      const err: any = new Error("Your current password is incorrect");
      err.statusCode = 401;
      throw err;
    }

    if (this.verifyPassword(newPassword, user.password)) {
      throw new Error(
        "Your new password must be different from your current one.",
      );
    }

    this.assertOtp(user, otpCode, OtpPurpose.PASSWORD_CHANGE);

    await AuthRepo.updateUser(user.id, {
      password: this.hashPassword(newPassword),
      otpCode: null,
      otpExpiry: null,
      otpPurpose: null,
    });

    // Rotating a password is how someone evicts an intruder, so every other
    // refresh token has to die with it — otherwise a stolen session outlives
    // the change and the rotation accomplishes nothing.
    await AuthRepo.deleteSessionsForUser(user.id, keepRefreshToken);
    await CacheUtil.del(`user:${user.id}`);

    return {
      message:
        "Password changed successfully. Other devices have been signed out.",
      data: { keptCurrentSession: !!keepRefreshToken },
    };
  }

  // ── Email change (signed-in) ───────────────────────────────────────────────

  /**
   * Step 1 — stage the new address and email a code *to that address*.
   *
   * The live `email` is untouched until step 2. Sending the code to the new
   * address (not the current one) is what proves the user actually receives
   * mail there; validating the format alone would happily hand account
   * recovery to a typo.
   */
  static async requestEmailChange(userId: string, newEmail: string) {
    const user = await AuthRepo.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const email = (newEmail || "").trim().toLowerCase();

    if (!isValidEmail(email)) {
      throw new Error("Please enter a valid email address");
    }

    if (email === user.email.toLowerCase()) {
      throw new Error("That is already your email address");
    }

    const taken = await AuthRepo.findUserByEmail(email);
    if (taken) {
      throw new Error("Email already in use");
    }

    const otp = generateOTP();

    await AuthRepo.updateUser(user.id, {
      pendingEmail: email,
      otpCode: otp,
      otpExpiry: getOTPExpiry(),
      otpPurpose: OtpPurpose.EMAIL_CHANGE,
    });

    try {
      await sendTemplatedEmail({
        subject: "Confirm Your New Email Address",
        email_data: { email, OTP_CODE: otp.toString() },
        template_name: "verification-email.html",
      });
    } catch (error) {
      console.log(`Email change OTP for ${email}: ${otp}`);
    }

    return {
      message: `We sent a confirmation code to ${email}.`,
      data: { pendingEmail: email },
    };
  }

  /** Step 2 — redeem the code and promote pendingEmail to the live address. */
  static async confirmEmailChange(userId: string, otpCode: string) {
    const user = await AuthRepo.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.pendingEmail) {
      throw new Error("No email change is pending. Please start again.");
    }

    this.assertOtp(user, otpCode, OtpPurpose.EMAIL_CHANGE);

    // Re-check at commit time: the address may have been claimed by someone
    // else in the minutes since it was staged, and the unique index would
    // otherwise surface that as a raw Prisma error.
    const taken = await AuthRepo.findUserByEmail(user.pendingEmail);
    if (taken && taken.id !== user.id) {
      await AuthRepo.updateUser(user.id, {
        pendingEmail: null,
        otpCode: null,
        otpExpiry: null,
        otpPurpose: null,
      });
      throw new Error("Email already in use");
    }

    const updated = await AuthRepo.updateUser(user.id, {
      email: user.pendingEmail,
      // The address is verified by definition — the code only reachable from
      // that inbox came back.
      isEmailVerified: true,
      pendingEmail: null,
      otpCode: null,
      otpExpiry: null,
      otpPurpose: null,
    });

    await CacheUtil.del(`user:${user.id}`);

    return {
      message: "Email updated successfully.",
      data: { email: updated.email },
    };
  }

  /** Abandon a staged email change without spending the code. */
  static async cancelEmailChange(userId: string) {
    await AuthRepo.updateUser(userId, {
      pendingEmail: null,
      otpCode: null,
      otpExpiry: null,
      otpPurpose: null,
    });
    return { message: "Email change cancelled." };
  }

  static async getAuthUser(userId: string) {
    return AuthRepo.getAuthUser(userId);
  }

  static async googleAuthSSO(idToken: string) {
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);

    console.log("[AuthSvc] googleAuthSSO verifying token:", {
      configuredWebId: GOOGLE_CLIENT_ID,
      configuredAndroidId: GOOGLE_ANDROID_CLIENT_ID,
      tokenPrefix: idToken?.substring(0, 30),
    });
    try {
      // Verify the ID token with Google
      const ticket = await client.verifyIdToken({
        idToken,
        audience: [GOOGLE_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID],
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
      console.error("[AuthSvc] Google SSO verification failed. Raw Error:");
      console.dir(error, { depth: null });
      throw new Error("Failed to verify Google token: " + error.message);
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

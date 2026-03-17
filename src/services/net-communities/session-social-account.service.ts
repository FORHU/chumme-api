import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import SessionSocialAccountRepo from "../../repositories/net-communities/session-social-account.repository";
import { AutoSyncSvc } from "./ingestion/auto-sync.service";
import { SocialPlatform } from "@prisma/client";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

export default class SessionSocialAccountSvc {
  /**
   * Link a Google/YouTube account to an existing user
   */
  static async linkGoogleAccount(userId: string, idToken: string, googleAccessToken?: string) {
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);

    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error("Invalid Google token payload");
      }

      // Check if this social account is already linked to another user
      const existingAccount = await SessionSocialAccountRepo.findByProviderId("google", payload.sub);
      if (existingAccount && existingAccount.userId !== userId) {
        throw new Error("This Google account is already linked to another user profile");
      }

      // Upsert Google connection
      await SessionSocialAccountRepo.upsertSocialAccount({
        userId,
        platform: "google",
        providerUserId: payload.sub,
        accessToken: idToken,
        avatarUrl: payload.picture,
      });

      // Upsert YouTube connection (sharable token context)
      await SessionSocialAccountRepo.upsertSocialAccount({
        userId,
        platform: "youtube",
        providerUserId: payload.sub,
        accessToken: googleAccessToken || idToken,
        avatarUrl: payload.picture,
      });

      // Trigger Auto-Sync (New)
      AutoSyncSvc.syncLinkedAccount(userId, SocialPlatform.YOUTUBE, googleAccessToken || idToken);

      return { message: "Google and YouTube accounts linked successfully" };
    } catch (error: any) {
      console.error("SessionSocialAccountSvc.linkGoogleAccount Error:", error);
      throw new Error(error.message || "Failed to link Google account");
    }
  }

  /**
   * Link a Facebook/Instagram account to an existing user
   */
  static async linkFacebookAccount(userId: string, accessToken: string) {
    try {
      // Verify token with Facebook
      const response = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`,
      );

      const userData = response.data;
      if (!userData || !userData.id) {
        throw new Error("Invalid Facebook token");
      }

      // Check if this social account is already linked to another user
      const existingAccount = await SessionSocialAccountRepo.findByProviderId("facebook", userData.id);
      if (existingAccount && existingAccount.userId !== userId) {
        throw new Error("This Facebook account is already linked to another user profile");
      }

      // Upsert Facebook connection
      await SessionSocialAccountRepo.upsertSocialAccount({
        userId,
        platform: "facebook",
        providerUserId: userData.id,
        accessToken,
        avatarUrl: userData.picture?.data?.url,
      });

      // Upsert Instagram connection (Meta ecosystem)
      await SessionSocialAccountRepo.upsertSocialAccount({
        userId,
        platform: "instagram",
        providerUserId: userData.id,
        accessToken,
        avatarUrl: userData.picture?.data?.url,
      });

      // Trigger Auto-Sync (New)
      AutoSyncSvc.syncLinkedAccount(userId, SocialPlatform.FACEBOOK, accessToken);

      return { message: "Facebook and Instagram accounts linked successfully" };
    } catch (error: any) {
      console.error("SessionSocialAccountSvc.linkFacebookAccount Error:", error);
      throw new Error(error.message || "Failed to link Facebook account");
    }
  }

  /**
   * Get all connected platforms for a user
   */
  static async getConnectedPlatforms(userId: string) {
    const accounts = await SessionSocialAccountRepo.getSocialAccounts(userId);
    return accounts.map((acc: any) => ({
      platform: acc.platform,
      providerUserId: acc.providerUserId,
      avatarUrl: acc.avatarUrl,
      linkedAt: acc.createdAt,
    }));
  }

  /**
   * Unlink a platform
   */
  static async unlinkPlatform(userId: string, platform: string) {
    await SessionSocialAccountRepo.deleteSocialAccount(userId, platform);
    return { message: `Successfully unlinked ${platform}` };
  }
}

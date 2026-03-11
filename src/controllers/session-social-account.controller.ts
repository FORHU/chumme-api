import { Request, Response } from "express";
import SessionSessionSocialAccountSvc from "../services/session-social-account.service";

export default class SessionSessionSocialAccountCtrl {
  /**
   * Link a social platform to the current user
   */
  static async linkAccount(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { platform, token } = req.body;

      if (!platform || !token) {
        return res
          .status(400)
          .json({ message: "Platform and token are required" });
      }

      let result;
      switch (platform.toLowerCase()) {
        case "google":
        case "youtube":
          result = await SessionSessionSocialAccountSvc.linkGoogleAccount(userId, token);
          break;
        case "facebook":
        case "instagram":
          result = await SessionSessionSocialAccountSvc.linkFacebookAccount(userId, token);
          break;
        default:
          return res.status(400).json({ message: "Unsupported platform" });
      }

      return res.json(result);
    } catch (error: any) {
      console.error("SessionSessionSocialAccountCtrl.linkAccount Error:", error);
      return res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  }

  /**
   * Get all connected accounts for the current user
   */
  static async getMyAccounts(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const accounts = await SessionSessionSocialAccountSvc.getConnectedPlatforms(userId);

      return res.json({
        message: "Connected accounts fetched successfully",
        data: accounts,
      });
    } catch (error: any) {
      console.error("SessionSessionSocialAccountCtrl.getMyAccounts Error:", error);
      return res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  }

  /**
   * Unlink a platform
   */
  static async unlinkAccount(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { platform } = req.params;

      if (!platform) {
        return res.status(400).json({ message: "Platform is required" });
      }

      const result = await SessionSessionSocialAccountSvc.unlinkPlatform(userId, platform);
      return res.json(result);
    } catch (error: any) {
      console.error("SessionSessionSocialAccountCtrl.unlinkAccount Error:", error);
      return res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  }
}

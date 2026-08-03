import { Request, Response } from "express";
import Joi from "joi";
import AuthSvc from "../services/auth.service";
import { UserRole } from "@prisma/client";

export default class AuthCtrl {
  static async register(req: Request, res: Response) {
    const { email, password, username, name, mobileNumber, role } = req.body;

    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
      username: Joi.string().required(),
      name: Joi.string().optional(),
      mobileNumber: Joi.string().optional(),
      role: Joi.string().valid(UserRole.USER, UserRole.CREATOR).optional(),
    });

    const { error } = schema.validate({
      email,
      password,
      username,
      name,
      mobileNumber,
      role,
    });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const data = await AuthSvc.register({
        email,
        password,
        username,
        name,
        mobileNumber,
        role,
        idToken: req.body.idToken,
        accessToken: req.body.accessToken,
      });
      return res
        .status(201)
        .json({ message: "User created successfully", data });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
    }
  }

  static async verifyOtp(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        otpCode: Joi.string().length(6).required(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.message });
      }

      const result = await AuthSvc.verifyOtp(value.email, value.otpCode);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async verifyEmail(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        otpCode: Joi.string().length(6).required(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.message });
      }

      const result = await AuthSvc.verifyEmail(value.email, value.otpCode);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
      idToken: Joi.string().optional(), // For automatic Google/YouTube linking
      accessToken: Joi.string().optional(), // For automatic Facebook/Instagram linking
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const data = await AuthSvc.login({
        email,
        password,
        idToken: req.body.idToken,
        accessToken: req.body.accessToken,
      });
      return res.json({ message: "Login successful", data });
    } catch (error: any) {
      console.error("Login error:", error);
      return res.status(401).json({ message: error.message || error });
    }
  }

  static async refreshToken(req: Request, res: Response) {
    const { refreshToken } = req.body;

    const schema = Joi.object({
      refreshToken: Joi.string().required(),
    });

    const { error } = schema.validate({ refreshToken });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const result = await AuthSvc.refreshToken(refreshToken);
      return res.json(result);
    } catch (error: any) {
      console.error("Refresh token error:", error);
      return res.status(401).json({ message: error.message || error });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        email: Joi.string().email().required(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.message });
      }

      const result = await AuthSvc.forgotPassword(value.email);

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({
        message: error.message || "Failed to process request",
      });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        otpCode: Joi.string().length(6).required(),
        newPassword: Joi.string().min(6).required(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.message });
      }

      const result = await AuthSvc.resetPassword(
        value.email,
        value.otpCode,
        value.newPassword,
      );

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({
        message: error.message || "Failed to reset password",
      });
    }
  }

  static async resendVerificationOTP(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        email: Joi.string().email().required(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.message });
      }

      const result = await AuthSvc.resendVerificationOTP(value.email);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  // ── Password change (authenticated) ────────────────────────────────────────

  /**
   * Rules match the app's validatePassword so the client's live checklist and
   * the server agree on what "strong enough" means — a password the meter calls
   * Strong must not be rejected here.
   */
  private static readonly NEW_PASSWORD = Joi.string()
    .min(8)
    .max(16)
    .pattern(/[0-9]/, "a number")
    .pattern(/[a-z]/, "a lowercase letter")
    .pattern(/[A-Z]/, "an uppercase letter")
    .required();

  static async requestPasswordChange(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        currentPassword: Joi.string().required(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.message });
      }

      const result = await AuthSvc.requestPasswordChange(
        req.user.id,
        value.currentPassword,
      );
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(error.statusCode || 400).json({
        message: error.message || "Failed to start password change",
      });
    }
  }

  static async confirmPasswordChange(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        currentPassword: Joi.string().required(),
        otpCode: Joi.string().length(6).required(),
        newPassword: AuthCtrl.NEW_PASSWORD,
        // Optional so an older client that omits it still succeeds — it just
        // gets signed out along with every other device.
        refreshToken: Joi.string().optional(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.message });
      }

      const result = await AuthSvc.confirmPasswordChange(
        req.user.id,
        value.currentPassword,
        value.otpCode,
        value.newPassword,
        value.refreshToken ?? null,
      );
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(error.statusCode || 400).json({
        message: error.message || "Failed to change password",
      });
    }
  }

  // ── Email change (authenticated) ───────────────────────────────────────────

  static async requestEmailChange(req: Request, res: Response) {
    try {
      // minDomainSegments + an explicit TLD allowlist is what makes Joi reject
      // "a@b" and "a@b.c" — its permissive default is how a malformed address
      // reached the database in the first place.
      const schema = Joi.object({
        email: Joi.string()
          .email({ minDomainSegments: 2, tlds: { allow: true } })
          .max(254)
          .required(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res
          .status(400)
          .json({ message: "Please enter a valid email address" });
      }

      const result = await AuthSvc.requestEmailChange(req.user.id, value.email);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(error.statusCode || 400).json({
        message: error.message || "Failed to start email change",
      });
    }
  }

  static async confirmEmailChange(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        otpCode: Joi.string().length(6).required(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.message });
      }

      const result = await AuthSvc.confirmEmailChange(
        req.user.id,
        value.otpCode,
      );
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(error.statusCode || 400).json({
        message: error.message || "Failed to confirm email change",
      });
    }
  }

  static async cancelEmailChange(req: Request, res: Response) {
    try {
      const result = await AuthSvc.cancelEmailChange(req.user.id);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({
        message: error.message || "Failed to cancel email change",
      });
    }
  }

  static async googleAuthSSO(req: Request, res: Response) {
    const { idToken } = req.body;

    const schema = Joi.object({
      idToken: Joi.string().required(),
    });

    const { error } = schema.validate({ idToken });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const data = await AuthSvc.googleAuthSSO(idToken);
      return res.json({ message: "Google authentication successful", data });
    } catch (error: any) {
      console.error("Google auth error:", error);
      return res
        .status(401)
        .json({ message: error.message || "Google authentication failed" });
    }
  }

  static async facebookAuthSSO(req: Request, res: Response) {
    const { accessToken } = req.body;

    const schema = Joi.object({
      accessToken: Joi.string().required(),
    });

    const { error } = schema.validate({ accessToken });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const data = await AuthSvc.facebookAuthSSO(accessToken);
      return res.json({ message: "Facebook authentication successful", data });
    } catch (error: any) {
      console.error("Facebook auth error:", error);
      return res
        .status(401)
        .json({ message: error.message || "Facebook authentication failed" });
    }
  }

  static async logout(req: Request, res: Response) {
    const { refreshToken } = req.body;
    const userId = (req as any).user?.id;
    try {
      await AuthSvc.logout(userId, refreshToken);
      return res.json({ message: "Logged out successfully" });
    } catch (error: any) {
      console.error("Logout error:", error);
      return res.status(400).json({ message: error.message || error });
    }
  }
}

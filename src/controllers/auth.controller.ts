import { Request, Response } from "express";
import Joi from "joi";
import AuthSvc from "../services/auth.service";

export default class AuthCtrl {
  static async register(req: Request, res: Response) {
    const { email, password, username, name, mobileNumber } = req.body;

    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
      username: Joi.string().required(),
      name: Joi.string().optional(),
      mobileNumber: Joi.string().optional(),
    });

    const { error } = schema.validate({
      email,
      password,
      username,
      name,
      mobileNumber,
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
      });
      return res
        .status(201)
        .json({ message: "User created successfully", data });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || error });
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
    });

    const { error } = schema.validate({ email, password });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const data = await AuthSvc.login({ email, password });
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

import { Request, Response } from "express";
import Joi from "joi";
import { DevicePlatform, PushProvider } from "@prisma/client";
import DeviceTokenSvc from "../services/device-token.service";
import PushSvc from "../services/push.service";
import logger from "../utils/logger";

// The app sends lower-case values (`android`, `fcm`); the enums are
// upper-case. Accept either and normalise once here.
const lowerValues = (e: Record<string, string>) =>
  Object.values(e).flatMap((v) => [v, v.toLowerCase()]);

// FCM tokens are ~160 characters today; the cap only stops abuse.
const tokenField = Joi.string().trim().min(20).max(4096).required();

const registerSchema = Joi.object({
  token: tokenField,
  platform: Joi.string()
    .valid(...lowerValues(DevicePlatform))
    .required(),
  provider: Joi.string()
    .valid(...lowerValues(PushProvider))
    .optional(),
  appVersion: Joi.string().trim().max(50).optional(),
});

const unregisterSchema = Joi.object({ token: tokenField });

const testPushSchema = Joi.object({
  title: Joi.string().max(100).optional(),
  body: Joi.string().max(500).optional(),
});

function sendError(res: Response, error: any, fallback: string) {
  const status = error?.statusCode ?? 500;
  if (status >= 500) logger.error(`[DeviceTokenCtrl] ${fallback}:`, error);
  return res.status(status).json({
    success: false,
    message: status >= 500 ? fallback : error.message,
  });
}

export default class DeviceTokenCtrl {
  static async register(req: Request, res: Response) {
    try {
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        return res
          .status(400)
          .json({ success: false, message: error.details[0].message });
      }
      await DeviceTokenSvc.register(req.user.id, {
        token: value.token,
        platform: value.platform.toUpperCase() as DevicePlatform,
        provider: value.provider?.toUpperCase() as PushProvider | undefined,
        appVersion: value.appVersion,
      });
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return sendError(res, error, "Failed to register device");
    }
  }

  static async unregister(req: Request, res: Response) {
    try {
      const { error, value } = unregisterSchema.validate(req.body);
      if (error) {
        return res
          .status(400)
          .json({ success: false, message: error.details[0].message });
      }
      await DeviceTokenSvc.unregister(req.user.id, value.token);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return sendError(res, error, "Failed to unregister device");
    }
  }

  /** Admin-only: sends a push to the caller's own devices to check the chain. */
  static async sendTestPush(req: Request, res: Response) {
    try {
      const { error, value } = testPushSchema.validate(req.body ?? {});
      if (error) {
        return res
          .status(400)
          .json({ success: false, message: error.details[0].message });
      }
      if (!PushSvc.isEnabled()) {
        return res.status(503).json({
          success: false,
          message: "Push is not configured on this server",
        });
      }
      const data = await PushSvc.sendToUsers([req.user.id], {
        title: value.title ?? "Chumme test",
        body: value.body ?? "Push notifications are working.",
        data: { type: "test" },
      });
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return sendError(res, error, "Failed to send test push");
    }
  }
}

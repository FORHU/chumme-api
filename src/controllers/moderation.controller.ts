import { Request, Response } from "express";
import Joi from "joi";
import { ReportReason, ReportStatus, ReportTargetType } from "@prisma/client";
import ModerationSvc from "../services/moderation.service";
import logger from "../utils/logger";

// The app sends lower-case values (`message`, `self_harm`); the enums are
// upper-case. Accept either and normalise once here.
const lowerValues = (e: Record<string, string>) =>
  Object.values(e).flatMap((v) => [v, v.toLowerCase()]);

const reportSchema = Joi.object({
  targetType: Joi.string()
    .valid(...lowerValues(ReportTargetType))
    .required(),
  targetId: Joi.string().uuid().required(),
  reason: Joi.string()
    .valid(...lowerValues(ReportReason))
    .required(),
  details: Joi.string().allow("").max(1000).optional(),
});

const listSchema = Joi.object({
  status: Joi.string()
    .valid(...lowerValues(ReportStatus))
    .optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  before: Joi.date().iso().optional(),
});

const resolveSchema = Joi.object({
  status: Joi.string()
    .valid(...lowerValues(ReportStatus))
    .required(),
});

const userIdSchema = Joi.string().uuid().required();

/** Service errors carry `statusCode` (see utils/error.util); anything else is a 500. */
function sendError(res: Response, error: any, fallback: string) {
  const status = error?.statusCode ?? 500;
  if (status >= 500) logger.error(`[ModerationCtrl] ${fallback}:`, error);
  return res.status(status).json({
    success: false,
    message: status >= 500 ? fallback : error.message,
  });
}

export default class ModerationCtrl {
  static async blockUser(req: Request, res: Response) {
    try {
      const { error } = userIdSchema.validate(req.params.id);
      if (error) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid user id" });
      }
      await ModerationSvc.blockUser(req.user.id, req.params.id);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return sendError(res, error, "Failed to block user");
    }
  }

  static async unblockUser(req: Request, res: Response) {
    try {
      const { error } = userIdSchema.validate(req.params.id);
      if (error) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid user id" });
      }
      await ModerationSvc.unblockUser(req.user.id, req.params.id);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return sendError(res, error, "Failed to unblock user");
    }
  }

  static async getBlockedUsers(req: Request, res: Response) {
    try {
      const data = await ModerationSvc.getBlockedUsers(req.user.id);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return sendError(res, error, "Failed to fetch blocked users");
    }
  }

  static async submitReport(req: Request, res: Response) {
    try {
      const { error, value } = reportSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.message });
      }

      const { report, created } = await ModerationSvc.submitReport({
        reporterId: req.user.id,
        targetType: value.targetType.toUpperCase() as ReportTargetType,
        targetId: value.targetId,
        reason: value.reason.toUpperCase() as ReportReason,
        details: value.details,
      });

      return res.status(created ? 201 : 200).json({
        success: true,
        data: { id: report.id, status: report.status },
      });
    } catch (error: any) {
      return sendError(res, error, "Failed to submit report");
    }
  }

  static async listReports(req: Request, res: Response) {
    try {
      const { error, value } = listSchema.validate(req.query);
      if (error) {
        return res.status(400).json({ success: false, message: error.message });
      }
      const data = await ModerationSvc.listReports({
        status: value.status?.toUpperCase() as ReportStatus | undefined,
        limit: value.limit,
        before: value.before,
      });
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return sendError(res, error, "Failed to fetch reports");
    }
  }

  static async resolveReport(req: Request, res: Response) {
    try {
      const { error, value } = resolveSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.message });
      }
      const data = await ModerationSvc.resolveReport({
        id: req.params.id,
        status: value.status.toUpperCase() as ReportStatus,
        reviewedById: req.user.id,
      });
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return sendError(res, error, "Failed to update report");
    }
  }
}

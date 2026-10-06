import { ReportReason, ReportStatus, ReportTargetType } from "@prisma/client";
import ModerationRepo from "../repositories/moderation.repository";
import { BadRequestError, NotFoundError } from "../utils/error.util";

/**
 * Report and block.
 *
 * Blocking is recorded here and listed back to the blocker; it is not yet
 * enforced on reads (feeds, profiles, chat), which is a separate change per
 * surface. Reports land in a queue that admins read and resolve.
 */

const MAX_DETAILS_LENGTH = 1000;
const MAX_PAGE = 100;
const DEFAULT_PAGE = 50;

export default class ModerationSvc {
  // ── Blocks ────────────────────────────────────────────────────────────────

  static async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestError("You can't block yourself");
    }
    const target = await ModerationRepo.findActiveUser(blockedId);
    if (!target) throw new NotFoundError("User not found");

    await ModerationRepo.upsertBlock(blockerId, blockedId);
  }

  static async unblockUser(blockerId: string, blockedId: string) {
    await ModerationRepo.deleteBlock(blockerId, blockedId);
  }

  static async getBlockedUsers(blockerId: string) {
    const rows = await ModerationRepo.findBlocksByBlocker(blockerId);
    return rows.map(({ blocked, createdAt }) => ({
      id: blocked.id,
      username: blocked.username,
      name: blocked.name,
      avatarUrl: blocked.avatar?.fileUrl ?? null,
      blockedAt: createdAt,
    }));
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  /**
   * File a report. Re-reporting the same target while an earlier report is
   * still open returns that report instead of queueing a duplicate, so a
   * double-tap or a retry after a timeout can't inflate the count.
   */
  static async submitReport(params: {
    reporterId: string;
    targetType: ReportTargetType;
    targetId: string;
    reason: ReportReason;
    details?: string;
  }) {
    const details = params.details?.trim() || undefined;
    if (details && details.length > MAX_DETAILS_LENGTH) {
      throw new BadRequestError(
        `Details must be ${MAX_DETAILS_LENGTH} characters or fewer`,
      );
    }

    const reportedUserId = await ModerationSvc.resolveReportedUser(
      params.targetType,
      params.targetId,
    );
    if (reportedUserId === params.reporterId) {
      throw new BadRequestError("You can't report yourself");
    }

    const existing = await ModerationRepo.findOpenReport({
      reporterId: params.reporterId,
      targetType: params.targetType,
      targetId: params.targetId,
    });
    if (existing) return { report: existing, created: false };

    const report = await ModerationRepo.createReport({
      reporterId: params.reporterId,
      targetType: params.targetType,
      targetId: params.targetId,
      reportedUserId,
      reason: params.reason,
      details,
    });
    return { report, created: true };
  }

  static async listReports(params: {
    status?: ReportStatus;
    limit?: number;
    before?: Date;
  }) {
    const limit = Math.min(params.limit ?? DEFAULT_PAGE, MAX_PAGE);
    return ModerationRepo.findReports({ ...params, limit });
  }

  static async resolveReport(params: {
    id: string;
    status: ReportStatus;
    reviewedById: string;
  }) {
    const report = await ModerationRepo.findReportById(params.id);
    if (!report) throw new NotFoundError("Report not found");
    return ModerationRepo.updateReportStatus(params);
  }

  /** The person responsible for the target — never taken from the client. */
  private static async resolveReportedUser(
    targetType: ReportTargetType,
    targetId: string,
  ): Promise<string> {
    if (targetType === ReportTargetType.USER) {
      const user = await ModerationRepo.findActiveUser(targetId);
      if (!user) throw new NotFoundError("User not found");
      return user.id;
    }

    const authorId = await ModerationRepo.findMessageAuthorId(targetId);
    if (!authorId) throw new NotFoundError("Message not found");
    return authorId;
  }
}

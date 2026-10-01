import { ReportReason, ReportStatus, ReportTargetType } from "@prisma/client";
import { prisma } from "../utils/prisma";

/** What a row in the app's Blocked Accounts list needs. */
const BLOCKED_USER_SELECT = {
  id: true,
  username: true,
  name: true,
  avatar: { select: { fileUrl: true } },
} as const;

export default class ModerationRepo {
  // ── Blocks ────────────────────────────────────────────────────────────────

  /** Idempotent — blocking someone twice is not an error. */
  static async upsertBlock(blockerId: string, blockedId: string) {
    return prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
  }

  /** Idempotent — `deleteMany` so unblocking someone not blocked is a no-op. */
  static async deleteBlock(blockerId: string, blockedId: string) {
    return prisma.userBlock.deleteMany({ where: { blockerId, blockedId } });
  }

  static async findBlocksByBlocker(blockerId: string) {
    return prisma.userBlock.findMany({
      where: { blockerId, blocked: { isDeleted: false } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, blocked: { select: BLOCKED_USER_SELECT } },
    });
  }

  // ── Report targets ────────────────────────────────────────────────────────

  static async findActiveUser(userId: string) {
    return prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
      select: { id: true },
    });
  }

  /**
   * The author of a reported message. Circle chat and match-room chat live in
   * separate tables, and the app reports both as `message`, so check each.
   */
  static async findMessageAuthorId(messageId: string): Promise<string | null> {
    const circle = await prisma.roomMessage.findUnique({
      where: { id: messageId },
      select: { authorId: true },
    });
    if (circle) return circle.authorId;

    const sport = await prisma.sportRoomMessage.findUnique({
      where: { id: messageId },
      select: { authorId: true },
    });
    return sport?.authorId ?? null;
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  static async findOpenReport(params: {
    reporterId: string;
    targetType: ReportTargetType;
    targetId: string;
  }) {
    return prisma.userReport.findFirst({
      where: { ...params, status: ReportStatus.OPEN },
    });
  }

  static async createReport(data: {
    reporterId: string;
    targetType: ReportTargetType;
    targetId: string;
    reportedUserId: string | null;
    reason: ReportReason;
    details?: string;
  }) {
    return prisma.userReport.create({ data });
  }

  static async findReports(params: {
    status?: ReportStatus;
    limit: number;
    before?: Date;
  }) {
    return prisma.userReport.findMany({
      where: {
        ...(params.status && { status: params.status }),
        ...(params.before && { createdAt: { lt: params.before } }),
      },
      orderBy: { createdAt: "desc" },
      take: params.limit,
      include: {
        reporter: { select: { id: true, username: true } },
        reportedUser: { select: { id: true, username: true, isActive: true } },
        reviewedBy: { select: { id: true, username: true } },
      },
    });
  }

  static async updateReportStatus(params: {
    id: string;
    status: ReportStatus;
    reviewedById: string;
  }) {
    return prisma.userReport.update({
      where: { id: params.id },
      data: {
        status: params.status,
        reviewedById: params.reviewedById,
        reviewedAt: new Date(),
      },
    });
  }

  static async findReportById(id: string) {
    return prisma.userReport.findUnique({
      where: { id },
      select: { id: true },
    });
  }
}

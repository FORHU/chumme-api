import RedisUtil from "../../../utils/redis.util";
import { rabbitMQService } from "../../../utils/rabbitmq";
import { prisma } from "../../../utils/prisma";
import logger from "../../../utils/logger";

export default class MonitoringSvc {
  /**
   * Get overall pipeline health and metrics
   */
  static async getPipelineStatus() {
    try {
      // 1. Get worker metrics from Redis
      const workerMetricsRaw = await RedisUtil.redisClient.get(
        "worker:metrics:snapshot",
      );
      const workerMetrics = workerMetricsRaw
        ? JSON.parse(workerMetricsRaw)
        : null;

      // 2. Get RabbitMQ status
      const rabbitStatus = {
        connected: rabbitMQService.isConnectionActive(),
        // Note: Real queue depth requires Management API or custom tracking
      };

      // 3. Get recent ingestion stats from DB
      const recentJobs = await prisma.socialFeedItem.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
          },
        },
      });

      const snapshotCount = await prisma.socialFeedSnapshot.count({
        where: {
          snapshotAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      // 4. Scout Coverage (Topics vs Targets)
      const totalTopics = await prisma.chummeTopicCategory.count();
      const scoutedTopics = await prisma.socialIngestionTarget.count({
        where: { chummeTopicCategoryId: { not: null } },
      });

      // 5. Quota & Schedule Health
      const quotaBlockedCount = await prisma.socialIngestionTarget.count({
        where: {
          quotaLimitHitAt: {
            gte: new Date(Date.now() - 1000 * 60 * 60 * 6), // Within 6h backoff window
          },
        },
      });

      const scheduleModeCounts = await prisma.socialIngestionSchedule.groupBy({
        by: ["mode"],
        _count: { id: true },
      });

      const totalTargets = await prisma.socialIngestionTarget.count({
        where: { isActive: true },
      });

      return {
        status: workerMetrics ? "active" : "unknown",
        worker: workerMetrics,
        rabbitmq: rabbitStatus,
        database: {
          recentIngestions24h: recentJobs,
          recentSnapshots24h: snapshotCount,
        },
        ingestionHealth: {
          totalActiveTargets: totalTargets,
          quotaBlockedTargets: quotaBlockedCount,
          healthyTargets: totalTargets - quotaBlockedCount,
          schedulesByMode: scheduleModeCounts.map((s) => ({
            mode: s.mode,
            count: s._count.id,
          })),
        },
        scoutCoverage: {
          totalTopics,
          scoutedTopics,
          coveragePercent:
            totalTopics > 0 ? (scoutedTopics / totalTopics) * 100 : 0,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error("[MonitoringSvc] Error fetching pipeline status:", error);
      throw error;
    }
  }

  /**
   * Get detailed history for a specific content item
   */
  static async getContentHistory(feedItemId: string) {
    return prisma.socialFeedSnapshot.findMany({
      where: { socialFeedId: feedItemId },
      orderBy: { snapshotAt: "asc" },
    });
  }

  /**
   * Get ingestion analytics (Platform breakdown and 7-day trends)
   */
  static async getIngestionAnalytics() {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // 1. Ingestions by Platform (Last 7 days)
      const platformBreakdown = await prisma.socialFeedItem.groupBy({
        by: ["socialPlatform"],
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
        _count: { _all: true },
      });

      // 2. 7-Day Ingestion Trend (Daily totals)
      // Note: Grouping by date in Prisma can be tricky depending on DB; using a simple approach here.
      const rawTrend = await prisma.socialFeedItem.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      });

      const trendMap: Record<string, number> = {};
      rawTrend.forEach((item) => {
        const dateStr = item.createdAt.toISOString().split("T")[0];
        trendMap[dateStr] = (trendMap[dateStr] || 0) + 1;
      });

      const trend = Object.keys(trendMap)
        .sort()
        .map((date) => ({
          date,
          count: trendMap[date],
        }));

      // 3. Talent Scout Success (Draft artists created)
      const draftArtistCount = await prisma.chummeArtist.count({
        where: {
          isDraft: true,
          discoveredAt: { gte: sevenDaysAgo },
        },
      });

      return {
        platforms: platformBreakdown.map((p) => ({
          platform: p.socialPlatform,
          count: p._count._all,
        })),
        trend,
        scoutSuccess: {
          discoveredTalents7d: draftArtistCount,
        },
      };
    } catch (error) {
      logger.error(
        "[MonitoringSvc] Error fetching ingestion analytics:",
        error,
      );
      throw error;
    }
  }

  /**
   * Get low-level worker health (Throughput / Latency from Redis)
   */
  static async getWorkerHealthDetails() {
    const metricsRaw = await RedisUtil.redisClient.get(
      "worker:metrics:snapshot",
    );
    if (!metricsRaw) return null;

    const metrics = JSON.parse(metricsRaw);
    return {
      ...metrics,
      healthStatus: metrics.failureRate < 0.1 ? "healthy" : "warning",
      lastUpdated: new Date(),
    };
  }
}

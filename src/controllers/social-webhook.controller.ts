import { Request, Response } from "express";
import { XMLParser } from "fast-xml-parser";
import logger from "../utils/logger";
import { rabbitMQService } from "../utils/rabbitmq";
import { IngestionJobType } from "../listeners/ingestion.listener";
import { SocialPlatform } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { workerMetrics } from "../utils/worker-metrics";

const parser = new XMLParser();

export default class SocialWebhookController {
  /**
   * GET /api/v1/social/webhook/youtube
   * Handles WebSub verification challenge from Google.
   */
  static async verifyYouTube(req: Request, res: Response) {
    const mode = req.query["hub.mode"];
    const topic = req.query["hub.topic"];
    const challenge = req.query["hub.challenge"];
    const leaseSeconds = req.query["hub.lease_seconds"];

    logger.info(
      `[SocialWebhook] Received verification request: mode=${mode}, topic=${topic}, lease=${leaseSeconds}`,
    );

    if (mode === "subscribe" || mode === "unsubscribe") {
      // In a real production app, you'd verify the topic matches an expected channel
      // For now, we accept all to allow scaling subscriptions
      return res.status(200).send(challenge);
    }

    return res.status(404).end();
  }

  /**
   * POST /api/v1/social/webhook/youtube
   * Handles Atom/XML notifications for channel updates.
   */
  static async notifyYouTube(req: Request, res: Response) {
    try {
      // req.body should be the raw XML string (handled by express.text middleware)
      if (!req.body || typeof req.body !== "string") {
        logger.warn("[SocialWebhook] Received empty or invalid body");
        return res.status(204).end();
      }

      // 1. HMAC Signature Verification (Security Hardening)
      const signature = req.headers["x-hub-signature"] as string;
      if (signature) {
        const [algo, hash] = signature.split("=");
        if (algo === "sha1") {
          const crypto = await import("crypto");
          const parser = new XMLParser();
          const jsonObj = parser.parse(req.body);
          const channelId = jsonObj?.feed?.entry?.["yt:channelId"];

          if (channelId) {
            const target = await prisma.socialIngestionTarget.findFirst({
              where: { platform: "YOUTUBE", externalHandle: channelId },
            });

            if (target?.webSubSecret) {
              const expectedHash = crypto
                .createHmac("sha1", target.webSubSecret)
                .update(req.body)
                .digest("hex");

              if (hash !== expectedHash) {
                logger.warn(
                  `[SocialWebhook] Invalid HMAC signature for channel ${channelId}`,
                );
                workerMetrics.recordWebSubEvent("security_failure");
                return res.status(403).end();
              }
            }
          }
        }
      }

      workerMetrics.recordWebSubEvent("notification");
      const jsonObj = parser.parse(req.body);

      // Navigate to entry
      const entry = jsonObj?.feed?.entry;
      if (!entry) {
        logger.info(
          "[SocialWebhook] Notification received but no entry found (likely a heartbeat or deletion)",
        );
        return res.status(204).end();
      }

      const videoId = entry["yt:videoId"];
      const channelId = entry["yt:channelId"];
      const title = entry["title"];

      if (!videoId || !channelId) {
        logger.warn(
          "[SocialWebhook] Missing videoId or channelId in notification",
        );
        return res.status(204).end();
      }

      logger.info(
        `[SocialWebhook] YouTube Notification: Channel=${channelId}, Video=${videoId}, Title="${title}"`,
      );

      // Queue a priority job for verification (WEBSUB_VALIDATION)
      // We use the existing IngestionWorker but with a specific job type
      await rabbitMQService.publishMessage(`ingestion.metadata`, {
        type: IngestionJobType.WEBSUB_VALIDATION, // ENUM job type
        platform: SocialPlatform.YOUTUBE,
        targetId: videoId,
        priority: 10, // High priority for real-time
        meta: {
          channelId,
          title,
        },
      });

      return res.status(204).end();
    } catch (error) {
      logger.error(
        "[SocialWebhook] Error processing YouTube notification:",
        error,
      );
      return res.status(500).end();
    }
  }
}

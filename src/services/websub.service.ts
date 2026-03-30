import axios from "axios";
import logger from "../utils/logger";
import { prisma } from "../utils/prisma";

const HUB_URL = "https://pubsubhubbub.appspot.com/subscribe";
const CALLBACK_URL = process.env.WEBSUB_CALLBACK_URL;

export default class WebSubService {
  /**
   * Subscribe or Unsubscribe to a YouTube channel's feed via WebSub.
   */
  static async toggleSubscription(
    channelId: string,
    mode: "subscribe" | "unsubscribe" = "subscribe",
  ) {
    if (!CALLBACK_URL) {
      logger.error(
        "[WebSubService] WEBSUB_CALLBACK_URL is not configured in .env",
      );
      throw new Error("WEBSUB_CALLBACK_URL_MISSING");
    }

    // 1. Get or create secret for security (HMAC)
    let target = await prisma.socialIngestionTarget.findFirst({
      where: { platform: "YOUTUBE", externalHandle: channelId },
    });

    if (!target) {
      throw new Error(`Target not found for channel: ${channelId}`);
    }

    if (!target.webSubSecret && mode === "subscribe") {
      const crypto = await import("crypto");
      const secret = crypto.randomBytes(16).toString("hex");
      target = await prisma.socialIngestionTarget.update({
        where: { id: target.id },
        data: { webSubSecret: secret },
      });
    }

    const topicUrl = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`;

    const params = new URLSearchParams();
    params.append("hub.callback", CALLBACK_URL);
    params.append("hub.topic", topicUrl);
    params.append("hub.mode", mode);
    params.append("hub.verify", "async");

    if (target.webSubSecret) {
      params.append("hub.secret", target.webSubSecret);
    }

    logger.info(
      `[WebSubService] Sending ${mode} request for channel: ${channelId}`,
    );

    try {
      const response = await axios.post(HUB_URL, params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (response.status === 202 || response.status === 204) {
        logger.info(
          `[WebSubService] ${mode} request accepted by Hub for ${channelId}`,
        );

        if (mode === "subscribe") {
          await prisma.socialIngestionTarget.updateMany({
            where: {
              platform: "YOUTUBE",
              externalHandle: channelId,
            },
            data: {
              webSubSubscribedAt: new Date(),
            },
          });
        }
      } else {
        logger.warn(
          `[WebSubService] Hub returned unexpected status: ${response.status}`,
        );
      }
    } catch (error: any) {
      logger.error(
        `[WebSubService] Failed to ${mode} for ${channelId}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  /**
   * Scans for YouTube targets that need subscription renewal.
   * Google typically grants 5-10 day leases.
   */
  static async renewExpiringSubscriptions() {
    const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Find targets where lease is expiring soon or never subscribed
    const targets = await prisma.socialIngestionTarget.findMany({
      where: {
        platform: "YOUTUBE",
        isActive: true,
        OR: [
          { webSubLeaseExpiresAt: { lte: twentyFourHoursFromNow } },
          { webSubSubscribedAt: null },
        ],
      },
    });

    if (targets.length === 0) return;

    logger.info(
      `[WebSubService] Found ${targets.length} subscriptions to renew/start`,
    );

    for (const target of targets) {
      try {
        await this.toggleSubscription(target.externalHandle, "subscribe");
        // We throttle slightly to avoid hitting Hub rate limits during bulk
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        logger.error(
          `[WebSubService] Error renewing ${target.externalHandle}`,
          err,
        );
      }
    }
  }
}

import axios from "axios";
import { prisma } from "../../../utils/prisma";
import { SocialPlatform } from "@prisma/client";
import logger from "../../../utils/logger";
import crypto from "crypto";
import { XMLParser } from "fast-xml-parser";
import { rabbitMQService } from "../../../utils/rabbitmq";
import { IngestionJobType } from "../../../listeners/ingestion.listener";

export class WebSubService {
  private static readonly HUB_URL = "https://pubsubhubbub.appspot.com/subscribe";
  private static readonly XML_PARSER = new XMLParser({ ignoreAttributes: false });

  /**
   * Subscribe to a YouTube channel's WebSub feed
   */
  static async subscribe(targetId: string): Promise<void> {
    const callbackUrl = process.env.WEBSUB_CALLBACK_URL;
    const secret = process.env.WEBSUB_SECRET;

    if (!callbackUrl || !secret) {
      logger.warn("[WebSubService] WEBSUB_CALLBACK_URL or WEBSUB_SECRET not set. Skipping subscription.");
      return;
    }

    const topicUrl = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${targetId}`;
    const fullCallbackUrl = `${callbackUrl}/ingestion/websub/youtube`;

    const params = new URLSearchParams();
    params.append("hub.callback", fullCallbackUrl);
    params.append("hub.topic", topicUrl);
    params.append("hub.mode", "subscribe");
    params.append("hub.verify", "async");
    params.append("hub.secret", secret);
    params.append("hub.lease_seconds", "864000"); // 10 days

    try {
      await axios.post(this.HUB_URL, params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      await prisma.socialIngestionTarget.updateMany({
        where: { platform: SocialPlatform.YOUTUBE, externalHandle: targetId },
        data: { webSubState: "PENDING" },
      });

      logger.info(`[WebSubService] Subscription request sent for YouTube channel: ${targetId}`);
    } catch (error) {
      logger.error(`[WebSubService] Failed to subscribe to YouTube channel ${targetId}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a YouTube channel's WebSub feed
   */
  static async unsubscribe(targetId: string): Promise<void> {
    const callbackUrl = process.env.WEBSUB_CALLBACK_URL;
    const secret = process.env.WEBSUB_SECRET;

    if (!callbackUrl || !secret) {
      logger.warn(
        "[WebSubService] WEBSUB_CALLBACK_URL or WEBSUB_SECRET not set. Skipping unsubscription.",
      );
      return;
    }

    const topicUrl = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${targetId}`;
    const fullCallbackUrl = `${callbackUrl}/ingestion/websub/youtube`;

    const params = new URLSearchParams();
    params.append("hub.callback", fullCallbackUrl);
    params.append("hub.topic", topicUrl);
    params.append("hub.mode", "unsubscribe");
    params.append("hub.verify", "async");
    params.append("hub.secret", secret);

    try {
      await axios.post(this.HUB_URL, params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      await prisma.socialIngestionTarget.updateMany({
        where: { platform: SocialPlatform.YOUTUBE, externalHandle: targetId },
        data: { webSubState: "PENDING_UNSUBSCRIBE" },
      });

      logger.info(
        `[WebSubService] Unsubscription request sent for YouTube channel: ${targetId}`,
      );
    } catch (error) {
      logger.error(
        `[WebSubService] Failed to unsubscribe from YouTube channel ${targetId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Verify the challenge sent by the Hub during subscription verification
   */
  static async verifyHandshake(query: any): Promise<string | null> {
    const mode = query["hub.mode"];
    const topic = query["hub.topic"];
    const challenge = query["hub.challenge"];
    const leaseSeconds = query["hub.lease_seconds"];

    if (!mode || !topic || !challenge) {
      logger.warn("[WebSubService] Invalid handshake request received.");
      return null;
    }

    // Extract channelId from topic URL
    const url = new URL(topic);
    const channelId = url.searchParams.get("channel_id");

    if (mode === "subscribe" && channelId) {
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + parseInt(leaseSeconds || "864000"));

      await prisma.socialIngestionTarget.updateMany({
        where: { platform: SocialPlatform.YOUTUBE, externalHandle: channelId },
        data: {
          webSubState: "SUBSCRIBED",
          webSubSubscribedAt: new Date(),
          webSubExpiresAt: expiresAt,
        },
      });

      logger.info(`[WebSubService] Handshake verified for channel: ${channelId}. Lease: ${leaseSeconds}s`);
      return challenge;
    }

    if (mode === "unsubscribe" && channelId) {
      await prisma.socialIngestionTarget.updateMany({
        where: { platform: SocialPlatform.YOUTUBE, externalHandle: channelId },
        data: {
          webSubState: "UNSUBSCRIBED",
          webSubExpiresAt: null,
        },
      });
      logger.info(`[WebSubService] Unsubscription verified for channel: ${channelId}`);
      return challenge;
    }

    return null;
  }

  /**
   * Process incoming notification payload
   */
  static async handleNotification(platform: string, body: string, signature: string): Promise<void> {
    const secret = process.env.WEBSUB_SECRET;
    if (!secret) return;

    // 1. Verify Signature
    if (signature) {
      const expectedSignature = "sha1=" + crypto
        .createHmac("sha1", secret)
        .update(body)
        .digest("hex");

      if (signature !== expectedSignature) {
        logger.warn(`[WebSubService] Invalid signature received for ${platform} notification.`);
        return;
      }
    }

    // 2. Parse Payload (YouTube Atom Feed)
    try {
      const jsonObj = this.XML_PARSER.parse(body);
      const entry = jsonObj.feed?.entry;
      
      if (!entry) {
        logger.warn("[WebSubService] Received empty or invalid Atom feed.");
        return;
      }

      const videoId = entry["yt:videoId"];
      const channelId = entry["yt:channelId"];
      const title = entry.title;

      logger.info(`[WebSubService] Notification: Video "${title}" (${videoId}) in channel ${channelId}`);

      // 3. Look up target to get artist and category context
      if (videoId && channelId) {
        const target = await prisma.socialIngestionTarget.findFirst({
          where: {
            platform: SocialPlatform.YOUTUBE,
            externalHandle: channelId,
            isActive: true,
          },
          select: {
            chummeArtistId: true,
            chummeCategoryId: true,
            chummeSubCategoryId: true,
            chummeTopicCategoryId: true,
          },
        });

        await rabbitMQService.publishMessage(
          `ingestion.${IngestionJobType.METADATA}`,
          {
            type: IngestionJobType.METADATA,
            platform: SocialPlatform.YOUTUBE,
            targetId: videoId,
            priority: 10, // High priority for real-time
            meta: {
              isLiveTrigger: true,
              artistId: target?.chummeArtistId,
              categoryId: target?.chummeCategoryId,
              subCategoryId: target?.chummeSubCategoryId,
              topicCategoryId: target?.chummeTopicCategoryId,
            },
          },
          { priority: 10 },
        );
      }
    } catch (error) {
      logger.error("[WebSubService] Error parsing notification payload:", error);
    }
  }
}

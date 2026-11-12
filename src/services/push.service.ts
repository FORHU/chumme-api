import { PushProvider } from "@prisma/client";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import type { Messaging, MulticastMessage } from "firebase-admin/messaging";
import { FIREBASE_SERVICE_ACCOUNT_BASE64 } from "../config";
import DeviceTokenRepo from "../repositories/device-token.repository";
import logger from "../utils/logger";

export interface PushMessage {
  title: string;
  body: string;
  /**
   * Tells the app what to open on tap, e.g. `{ type: "chat_room", id }`.
   * FCM only carries string values.
   */
  data?: Record<string, string>;
}

export interface PushResult {
  /** Device tokens FCM accepted. */
  sent: number;
  failed: number;
  /** Tokens FCM said are dead; already deleted. */
  pruned: number;
  /** Stored tokens this sender can't reach (the RN app's Expo tokens). */
  skipped: number;
}

/** FCM accepts at most 500 tokens per multicast. */
const FCM_BATCH = 500;

/**
 * The token itself is gone (app uninstalled, data cleared, token rotated).
 * Anything else, such as a quota or server error, leaves the row alone.
 */
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

/** Must match the channel id the app creates on Android. */
export const ANDROID_CHANNEL_ID = "chumme_default";

let messaging: Messaging | null | undefined;

function loadMessaging(): Messaging | null {
  if (messaging !== undefined) return messaging;
  if (!FIREBASE_SERVICE_ACCOUNT_BASE64) {
    logger.warn(
      "[PushSvc] FIREBASE_SERVICE_ACCOUNT_BASE64 is not set; push is off",
    );
    messaging = null;
    return messaging;
  }
  try {
    const json = JSON.parse(
      Buffer.from(FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8"),
    );
    const app = getApps()[0] ?? initializeApp({ credential: cert(json) });
    messaging = getMessaging(app);
  } catch (error) {
    // Never log the decoded value: it holds the private key.
    logger.error(
      "[PushSvc] FIREBASE_SERVICE_ACCOUNT_BASE64 is not a valid service account; push is off",
      (error as Error).message,
    );
    messaging = null;
  }
  return messaging;
}

export default class PushSvc {
  /** Tests swap in a fake; `undefined` goes back to the real one. */
  static setMessagingForTests(fake: Messaging | null | undefined) {
    messaging = fake;
  }

  static isEnabled() {
    return loadMessaging() !== null;
  }

  /**
   * Sends one alert to every device of these users and deletes the tokens FCM
   * reports as dead. Never throws: a failed push must not fail the request
   * that caused it, so callers can fire and forget.
   */
  static async sendToUsers(
    userIds: string[],
    message: PushMessage,
  ): Promise<PushResult> {
    const result: PushResult = { sent: 0, failed: 0, pruned: 0, skipped: 0 };
    const unique = [...new Set(userIds.filter(Boolean))];
    if (unique.length === 0) return result;

    try {
      const rows = await DeviceTokenRepo.findByUserIds(unique);
      const tokens = rows
        .filter((r) => r.provider === PushProvider.FCM)
        .map((r) => r.token);
      result.skipped = rows.length - tokens.length;
      if (tokens.length === 0) return result;

      const fcm = loadMessaging();
      if (!fcm) {
        result.skipped += tokens.length;
        return result;
      }

      const dead: string[] = [];
      for (let i = 0; i < tokens.length; i += FCM_BATCH) {
        const batch = tokens.slice(i, i + FCM_BATCH);
        const res = await fcm.sendEachForMulticast(
          PushSvc.buildMessage(batch, message),
        );
        result.sent += res.successCount;
        result.failed += res.failureCount;
        res.responses.forEach((r, idx) => {
          if (!r.success && r.error && DEAD_TOKEN_CODES.has(r.error.code)) {
            dead.push(batch[idx]);
          }
        });
      }

      if (dead.length > 0) {
        const { count } = await DeviceTokenRepo.deleteTokens(dead);
        result.pruned = count;
      }
    } catch (error) {
      logger.error("[PushSvc] send failed:", error);
    }
    return result;
  }

  static buildMessage(
    tokens: string[],
    message: PushMessage,
  ): MulticastMessage {
    return {
      tokens,
      notification: { title: message.title, body: message.body },
      data: message.data,
      android: {
        priority: "high",
        notification: { channelId: ANDROID_CHANNEL_ID },
      },
      apns: { payload: { aps: { sound: "default" } } },
    };
  }
}

import { DevicePlatform, PushProvider } from "@prisma/client";
import DeviceTokenRepo from "../repositories/device-token.repository";

/**
 * Most people have one or two phones. Past this, the rows that checked in
 * longest ago are dropped, so reinstalls don't pile up dead tokens.
 */
export const MAX_DEVICES_PER_USER = 10;

export interface RegisterDeviceInput {
  token: string;
  platform: DevicePlatform;
  provider?: PushProvider;
  appVersion?: string;
}

export default class DeviceTokenSvc {
  static async register(userId: string, input: RegisterDeviceInput) {
    await DeviceTokenRepo.upsert({
      userId,
      token: input.token,
      platform: input.platform,
      provider: input.provider ?? PushProvider.FCM,
      appVersion: input.appVersion ?? null,
    });
    const stale = await DeviceTokenRepo.findStaleIdsForUser(
      userId,
      MAX_DEVICES_PER_USER,
    );
    await DeviceTokenRepo.deleteByIds(stale);
  }

  /** Idempotent: removing a token that isn't stored is not an error. */
  static async unregister(userId: string, token: string) {
    await DeviceTokenRepo.deleteForUser(userId, token);
  }
}

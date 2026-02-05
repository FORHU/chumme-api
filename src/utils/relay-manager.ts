import { StudioRole, StudioType, RelayMode } from "@prisma/client";
import MusicStudioCacheSvc from "../services/music-studio-cache.service";

/**
 * RelayManager
 * Handles the logic for microphone distribution in RelaySinging mode.
 */
export default class RelayManager {
  /**
   * Determine the next singer based on current studio state and lyric progress.
   * Returns userId of the next singer, or null if no switch is needed.
   */
  static async getNextAutoSingerId(
    studioId: string,
    lineIndex: number,
  ): Promise<string | null> {
    const [relayMode, relayInterval, studioType] = await Promise.all([
      MusicStudioCacheSvc.getRelayMode(studioId),
      MusicStudioCacheSvc.getRelayInterval(studioId),
      MusicStudioCacheSvc.getStudioType(studioId),
    ]);

    // Only automate if we are in RELAYSINGING and not in MANUAL mode
    if (
      studioType !== StudioType.RELAYSINGING ||
      relayMode === RelayMode.MANUAL
    ) {
      return null;
    }

    let shouldSwitch = false;
    let targetRoleIndex: number | null = null;
    const phrasing = await MusicStudioCacheSvc.getPhrasing(studioId);

    // --- SMART AUTO / MODE DETECTION ---
    if (relayMode === RelayMode.AUTO) {
      // Use phrasing if available, fallback to 4-line interval
      if (phrasing && phrasing.length > 0) {
        const currentPart = phrasing.find(
          (p: any) => p.startLine === lineIndex,
        );
        if (currentPart) {
          shouldSwitch = true;
          targetRoleIndex = currentPart.vocalRoleIndex;
        }
      } else if (lineIndex > 0 && lineIndex % 4 === 0) {
        shouldSwitch = true;
      }
    } else if (relayMode === RelayMode.INTERVAL) {
      if (lineIndex > 0 && lineIndex % (relayInterval || 1) === 0) {
        shouldSwitch = true;
      }
    } else if (relayMode === RelayMode.PHRASING) {
      const currentPart = phrasing.find((p: any) => p.startLine === lineIndex);
      if (currentPart) {
        shouldSwitch = true;
        targetRoleIndex = currentPart.vocalRoleIndex;
      }
    }

    if (!shouldSwitch) return null;

    // --- ROTATION LOGIC ---
    const members = await MusicStudioCacheSvc.getMembers(studioId);

    // Filter and sort for a stable rotation
    const singers = members
      .filter(
        (m: any) =>
          m.role === StudioRole.SINGER || m.role === StudioRole.PRODUCER,
      )
      .sort((a: any, b: any) => {
        if (a.vocalRoleIndex !== b.vocalRoleIndex) {
          return (a.vocalRoleIndex || 0) - (b.vocalRoleIndex || 0);
        }
        return a.userId.localeCompare(b.userId);
      });

    if (singers.length === 0) return null;

    let nextSinger = null;
    const currentSingerId =
      await MusicStudioCacheSvc.getCurrentSinger(studioId);

    // A. Specific Role Group Rotation
    if (targetRoleIndex !== null) {
      const roleSingers = singers.filter(
        (s: any) => s.vocalRoleIndex === targetRoleIndex,
      );
      if (roleSingers.length > 0) {
        const currentIndex = roleSingers.findIndex(
          (s: any) => s.userId === currentSingerId,
        );
        nextSinger = roleSingers[(currentIndex + 1) % roleSingers.length];
      }
    }

    // B. Global Cycle Fallback (if no role match or generic interval)
    if (!nextSinger) {
      const currentIndex = singers.findIndex(
        (s: any) => s.userId === currentSingerId,
      );
      nextSinger = singers[(currentIndex + 1) % singers.length];
    }

    // Only return if it's actually a new person
    if (nextSinger && nextSinger.userId !== currentSingerId) {
      return nextSinger.userId;
    }

    return null;
  }
}

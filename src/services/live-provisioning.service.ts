import { prisma } from "../utils/prisma";
import logger from "../utils/logger";

/**
 * LiveProvisioningService
 *
 * After the live heartbeat updates ChummeArtist.isLive, this service:
 * 1. Finds the matching country community (ChummeCategory) by targetCountries
 * 2. Upserts a ChummeSubCategory named after the artist/channel
 * 3. Links the artist to that SubCategory
 * 4. Emits a socket event so the mobile app refreshes
 * 5. Tears down (soft-deletes) auto-provisioned SubCategories when the artist goes offline
 */
export class LiveProvisioningService {
  /**
   * Provision a live community subcategory for an artist that just went live.
   * Called when artist.isLive transitions to true.
   */
  static async provisionLiveCommunity(artistId: string): Promise<void> {
    try {
      const artist = await prisma.chummeArtist.findUnique({
        where: { id: artistId },
        select: {
          id: true,
          name: true,
          countries: true,
          isLive: true,
          isDraft: true,
          activeVideoId: true,
          channelId: true,
        },
      });

      if (!artist || !artist.isLive) {
        logger.info(
          `[LiveProvisioning] Artist ${artistId} is not live. Skipping.`,
        );
        return;
      }

      if (!artist.countries || artist.countries.length === 0) {
        logger.warn(
          `[LiveProvisioning] Artist "${artist.name}" has no countries set. Cannot map to community.`,
        );
        return;
      }

      // Find matching country communities (ChummeCategory)
      // A category matches if any of its targetCountries overlap with the artist's countries
      const matchingCategories = await prisma.chummeCategory.findMany({
        where: {
          deletedAt: null,
          targetCountries: {
            hasSome: artist.countries,
          },
        },
        select: {
          id: true,
          name: true,
          targetCountries: true,
        },
      });

      if (matchingCategories.length === 0) {
        logger.warn(
          `[LiveProvisioning] No country community found for artist "${artist.name}" (countries: ${artist.countries.join(", ")}). Skipping.`,
        );
        return;
      }

      // For each matching country category, upsert a subcategory
      for (const category of matchingCategories) {
        const subcategoryName = artist.name;

        // Check if an auto-provisioned subcategory already exists for this artist in this category
        let subcategory = await prisma.chummeSubCategory.findFirst({
          where: {
            chummeCategoryId: category.id,
            isAutoProvisioned: true,
            chummeArtists: {
              some: { id: artist.id },
            },
            deletedAt: null,
          },
        });

        if (!subcategory) {
          // Also check if there's a soft-deleted one we can restore
          const deletedSub = await prisma.chummeSubCategory.findFirst({
            where: {
              chummeCategoryId: category.id,
              isAutoProvisioned: true,
              chummeArtists: {
                some: { id: artist.id },
              },
              deletedAt: { not: null },
            },
          });

          if (deletedSub) {
            // Restore the soft-deleted subcategory
            subcategory = await prisma.chummeSubCategory.update({
              where: { id: deletedSub.id },
              data: {
                deletedAt: null,
                name: subcategoryName,
                autoProvisionedAt: new Date(),
              },
            });

            logger.info(
              `[LiveProvisioning] Restored subcategory "${subcategoryName}" in "${category.name}"`,
            );
          } else {
            // Create a brand new auto-provisioned subcategory
            subcategory = await prisma.chummeSubCategory.create({
              data: {
                name: subcategoryName,
                chummeCategoryId: category.id,
                isAutoProvisioned: true,
                autoProvisionedAt: new Date(),
                chummeArtists: {
                  connect: { id: artist.id },
                },
              },
            });

            logger.info(
              `[LiveProvisioning] Created subcategory "${subcategoryName}" in "${category.name}"`,
            );
          }
        } else {
          // Subcategory exists, just make sure name is up to date
          if (subcategory.name !== subcategoryName) {
            await prisma.chummeSubCategory.update({
              where: { id: subcategory.id },
              data: { name: subcategoryName },
            });
          }
          logger.info(
            `[LiveProvisioning] Subcategory "${subcategoryName}" already exists in "${category.name}". Skipping creation.`,
          );
        }

        // Ensure artist is linked to the subcategory
        await prisma.chummeSubCategory.update({
          where: { id: subcategory.id },
          data: {
            chummeArtists: {
              connect: { id: artist.id },
            },
          },
        });

        // Emit socket event for real-time UI update
        LiveProvisioningService.emitLiveUpdate({
          categoryId: category.id,
          subcategoryId: subcategory.id,
          artistId: artist.id,
          artistName: artist.name,
          isLive: true,
          activeVideoId: artist.activeVideoId,
        });
      }
    } catch (error) {
      logger.error(
        `[LiveProvisioning] Error provisioning for artist ${artistId}:`,
        error,
      );
    }
  }

  /**
   * Deprovision (soft-delete) auto-created subcategories when an artist goes offline.
   * Only touches subcategories flagged with isAutoProvisioned = true.
   */
  static async deprovisionLiveCommunity(artistId: string): Promise<void> {
    try {
      // Find all auto-provisioned subcategories linked to this artist
      const autoSubcategories = await prisma.chummeSubCategory.findMany({
        where: {
          isAutoProvisioned: true,
          deletedAt: null,
          chummeArtists: {
            some: { id: artistId },
          },
        },
        select: {
          id: true,
          name: true,
          chummeCategoryId: true,
        },
      });

      if (autoSubcategories.length === 0) return;

      const artist = await prisma.chummeArtist.findUnique({
        where: { id: artistId },
        select: { name: true },
      });

      for (const sub of autoSubcategories) {
        // Soft-delete the auto-provisioned subcategory
        await prisma.chummeSubCategory.update({
          where: { id: sub.id },
          data: { deletedAt: new Date() },
        });

        logger.info(
          `[LiveProvisioning] Deprovisioned subcategory "${sub.name}" (artist went offline)`,
        );

        // Emit socket event
        LiveProvisioningService.emitLiveUpdate({
          categoryId: sub.chummeCategoryId,
          subcategoryId: sub.id,
          artistId,
          artistName: artist?.name || "",
          isLive: false,
          activeVideoId: null,
        });
      }
    } catch (error) {
      logger.error(
        `[LiveProvisioning] Error deprovisioning for artist ${artistId}:`,
        error,
      );
    }
  }

  /**
   * Sync all live artists — called after the heartbeat batch update completes.
   * Provisions for currently live artists, deprovisions for artists that went offline.
   */
  static async syncAllLiveArtists(): Promise<void> {
    logger.info("[LiveProvisioning] Syncing all live artists...");

    try {
      // 1. Get all currently live artists
      const liveArtists = await prisma.chummeArtist.findMany({
        where: {
          isLive: true,
          isDeleted: false,
          countries: { isEmpty: false },
        },
        select: { id: true, name: true },
      });

      // 2. Provision for each live artist
      for (const artist of liveArtists) {
        await LiveProvisioningService.provisionLiveCommunity(artist.id);
      }

      // 3. Find auto-provisioned subcategories whose artists are NO LONGER live
      const staleSubcategories = await prisma.chummeSubCategory.findMany({
        where: {
          isAutoProvisioned: true,
          deletedAt: null,
          chummeArtists: {
            every: {
              isLive: false,
            },
          },
        },
        select: {
          id: true,
          name: true,
          chummeCategoryId: true,
          chummeArtists: {
            select: { id: true, name: true },
          },
        },
      });

      // 4. Deprovision stale subcategories
      for (const sub of staleSubcategories) {
        await prisma.chummeSubCategory.update({
          where: { id: sub.id },
          data: { deletedAt: new Date() },
        });

        logger.info(
          `[LiveProvisioning] Deprovisioned stale subcategory "${sub.name}"`,
        );

        const artistId = sub.chummeArtists[0]?.id || "";
        const artistName = sub.chummeArtists[0]?.name || "";

        LiveProvisioningService.emitLiveUpdate({
          categoryId: sub.chummeCategoryId,
          subcategoryId: sub.id,
          artistId,
          artistName,
          isLive: false,
          activeVideoId: null,
        });
      }

      logger.info(
        `[LiveProvisioning] Sync complete. ${liveArtists.length} live, ${staleSubcategories.length} deprovisioned.`,
      );
    } catch (error) {
      logger.error("[LiveProvisioning] Error during sync:", error);
    }
  }

  /**
   * Refresh live status for a single artist on demand.
   *
   * Used when the mobile player hits an embed error — the stored activeVideoId
   * may have ended/rotated since the last 15m heartbeat. Re-runs checkLiveStatus
   * for just this artist's channel, updates the DB, and emits the socket event
   * so connected clients pick up the new videoId immediately.
   */
  static async refreshArtistLive(artistId: string): Promise<{
    isLive: boolean;
    activeVideoId: string | null;
    channelId: string | null;
  }> {
    const artist = await prisma.chummeArtist.findUnique({
      where: { id: artistId },
      select: {
        id: true,
        channelId: true,
        isLive: true,
        activeVideoId: true,
      },
    });

    if (!artist || !artist.channelId || artist.channelId.length === 0) {
      return { isLive: false, activeVideoId: null, channelId: null };
    }

    const primaryChannelId = artist.channelId[0];

    const { default: YouTubeService } = await import(
      "./net-communities/youtube.service"
    );
    const liveMap = await YouTubeService.checkLiveStatus([primaryChannelId]);
    const liveData = liveMap.get(primaryChannelId);
    const newVideoId = liveData?.videoId || null;
    const nowLive = !!newVideoId;

    const changed =
      nowLive !== artist.isLive || newVideoId !== artist.activeVideoId;

    if (changed) {
      await prisma.chummeArtist.update({
        where: { id: artistId },
        data: {
          isLive: nowLive,
          activeVideoId: nowLive ? newVideoId : null,
          liveViewCount: nowLive ? (liveData?.concurrentViewers || 0) : 0,
          liveStartedAt: nowLive ? (liveData?.actualStartTime ? new Date(liveData.actualStartTime) : undefined) : null,
          lastLiveAt: nowLive ? new Date() : undefined,
        },
      });

      if (nowLive) {
        await LiveProvisioningService.provisionLiveCommunity(artistId);
      } else {
        await LiveProvisioningService.deprovisionLiveCommunity(artistId);
      }

      logger.info(
        `[LiveProvisioning] Refreshed artist ${artistId}: isLive=${nowLive} videoId=${newVideoId}`,
      );
    }

    return {
      isLive: nowLive,
      activeVideoId: newVideoId,
      channelId: primaryChannelId,
    };
  }

  /**
   * Refresh live status for whichever artist is linked to a given subcategory/room.
   * Returns null if the room doesn't exist or has no artist link.
   */
  static async refreshByRoom(roomId: string): Promise<{
    isLive: boolean;
    activeVideoId: string | null;
    channelId: string | null;
  } | null> {
    const sub = await prisma.chummeSubCategory.findUnique({
      where: { id: roomId },
      select: {
        chummeArtists: { select: { id: true } },
      },
    });

    const artistId = sub?.chummeArtists[0]?.id;
    if (!artistId) return null;

    return await LiveProvisioningService.refreshArtistLive(artistId);
  }

  /**
   * Emit a socket event for live status changes.
   * Uses the global io instance set by app.ts
   */
  private static emitLiveUpdate(payload: {
    categoryId: string;
    subcategoryId: string;
    artistId: string;
    artistName: string;
    isLive: boolean;
    activeVideoId: string | null;
  }): void {
    try {
      const io = (global as any).io;
      if (io) {
        io.emit("artist_live_updated", payload);

        // Also emit subcategory events so existing listeners pick up changes
        if (payload.isLive) {
          io.emit("subcategory_created", {
            categoryId: payload.categoryId,
            subCategory: {
              id: payload.subcategoryId,
              name: payload.artistName,
              isLive: true,
              activeVideoId: payload.activeVideoId,
            },
          });
        } else {
          io.emit("subcategory_deleted", { id: payload.subcategoryId });
        }
      }
    } catch (error) {
      logger.error("[LiveProvisioning] Error emitting socket event:", error);
    }
  }
}

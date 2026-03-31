import * as ChummeArtistRepo from "../../repositories/chumme-artist.repository";
import SocialFeedRepo from "../../repositories/social-feed.repository";
import { filterShownVideos } from "../video/track-shown-videos.util";
import logger from "../logger";
import type { ParsedVideo } from "./parse-response.util";
import { isYoutubeSearchIntentItem } from "./source-metadata.util";

/**
 * For each youtube_intent in sourceMetadata, try to find matching videos in
 * our DB before falling back to the YouTube API.
 *
 * Matching strategy: case-insensitive check whether any artist name in our DB
 * appears inside the intent query string (e.g. query "Coldplay Yellow official"
 * matches artist "Coldplay").
 *
 * Returns:
 *  - dbVideos         : ParsedVideo[] resolved from DB
 *  - unmatchedMetadata: source_metadata items that had NO DB match — pass these
 *                       straight to appendYouTubeSearchResultsFromSourceMetadata
 */
export async function searchDbVideosFromSourceMetadata(
  sourceMetadata: unknown[],
  userId: string,
): Promise<{ dbVideos: ParsedVideo[]; unmatchedMetadata: unknown[] }> {
  const dbVideos: ParsedVideo[] = [];
  const unmatchedMetadata: unknown[] = [];

  const intentItems = sourceMetadata.filter(isYoutubeSearchIntentItem);
  const nonIntentItems = sourceMetadata.filter(
    (item) => !isYoutubeSearchIntentItem(item),
  );

  if (intentItems.length === 0) {
    return { dbVideos: [], unmatchedMetadata: sourceMetadata };
  }

  // Load all artists once — list is small
  const allArtists = await ChummeArtistRepo.getAllArtists();

  for (const item of intentItems) {
    const query = item.intent?.query?.trim().toLowerCase();

    if (!query) {
      unmatchedMetadata.push(item);
      continue;
    }

    // Find first artist whose name appears in the query string
    const matchedArtist = allArtists.find(
      (a) => a.name && query.includes(a.name.toLowerCase()),
    );

    if (!matchedArtist) {
      logger.info(
        `[DB-VIDEO-LOOKUP] No DB artist match for query "${query}" — falling back to YouTube`,
      );
      unmatchedMetadata.push(item);
      continue;
    }

    logger.info(
      `[DB-VIDEO-LOOKUP] Artist "${matchedArtist.name}" matched query "${query}" — searching DB`,
    );

    const rawVideos = await SocialFeedRepo.findExternalMedia(
      [matchedArtist.id],
      5,
    );

    if (rawVideos.length === 0) {
      logger.info(
        `[DB-VIDEO-LOOKUP] Artist "${matchedArtist.name}" has no feed videos — falling back to YouTube`,
      );
      unmatchedMetadata.push(item);
      continue;
    }

    // Filter out videos already seen; fall back to pool if exhausted
    const freshVideos = await filterShownVideos(rawVideos, userId);
    const videosToUse = freshVideos.length > 0 ? freshVideos : rawVideos.slice(0, 3);

    logger.info(
      `[DB-VIDEO-LOOKUP] Found ${videosToUse.length} DB video(s) for "${matchedArtist.name}" — skipping YouTube for this intent`,
    );

    for (const v of videosToUse) {
      if (!v.externalUrl) continue;
      dbVideos.push({
        title: (v as any).title ?? "Video",
        artist: matchedArtist.name ?? null,
        url: v.externalUrl,
      });
    }
  }

  return { dbVideos, unmatchedMetadata: [...nonIntentItems, ...unmatchedMetadata] };
}

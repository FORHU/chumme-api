import logger from "../logger";
import type { ParsedVideo } from "./parse-response.util";
import YouTubeService from "../../services/net-communities/youtube.service";
import CacheUtil from "../cache.util";

/** Shape from chat-wonder-api when search_videos returns youtube_intent */
export interface YoutubeSearchIntentItem {
  type: "video_intent";
  action: "youtube_search";
  title?: string;
  intent: {
    action: string;
    query: string;
    filters?: { max_results?: number; media_type?: string };
    suggestion?: string;
  };
  relevance?: number;
}

function tryParseLeadingJsonArray(
  s: string,
): { array: unknown[]; rest: string } | null {
  if (!s.startsWith("[")) return null;
  for (let end = 1; end <= s.length; end++) {
    const slice = s.slice(0, end);
    try {
      const parsed = JSON.parse(slice);
      if (Array.isArray(parsed)) {
        return { array: parsed, rest: s.slice(end) };
      }
    } catch {
      // incomplete JSON — keep extending
    }
  }
  return null;
}

function isYoutubeSearchIntentItem(
  item: unknown,
): item is YoutubeSearchIntentItem {
  if (item === null || typeof item !== "object") return false;
  const o = item as Record<string, unknown>;
  if (o.type !== "video_intent") return false;
  const action = o.action;
  const intent = o.intent as Record<string, unknown> | undefined;
  const intentAction = intent?.action;
  return action === "youtube_search" || intentAction === "youtube_search";
}

/**
 * Strip leading `[Sources] [...]` from Wonder WebSocket stream accumulation.
 * Wonder sends this as the first frame before model tokens.
 */
export function stripSourcesPrefix(raw: string): {
  cleaned: string;
  sourceMetadata: unknown[];
} {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith("[Sources]")) {
    return { cleaned: raw, sourceMetadata: [] };
  }
  const afterLabel = trimmed.slice("[Sources]".length).trimStart();
  const parsed = tryParseLeadingJsonArray(afterLabel);
  if (!parsed) {
    logger.warn(
      "[CHAT.WONDER.SOURCE] Could not parse [Sources] JSON array; trying line strip",
    );
    const lineEnd = trimmed.indexOf("\n");
    const firstLine = lineEnd >= 0 ? trimmed.slice(0, lineEnd) : trimmed;
    if (firstLine.startsWith("[Sources]") && lineEnd >= 0) {
      return {
        cleaned: trimmed.slice(lineEnd + 1).trimStart(),
        sourceMetadata: [],
      };
    }
    return { cleaned: raw, sourceMetadata: [] };
  }
  return {
    cleaned: parsed.rest.trimStart(),
    sourceMetadata: parsed.array,
  };
}

/**
 * Append YouTube search intent rows as ParsedVideo entries (results URL from query).
 * Dedupes by URL against existing videos.
 */
export function mergeYoutubeSearchFromSourceMetadata(
  sourceMetadata: unknown[],
  existingVideos: ParsedVideo[],
): ParsedVideo[] {
  const seen = new Set(
    existingVideos.map((v) => v.url).filter((u): u is string => Boolean(u)),
  );
  const merged: ParsedVideo[] = [...existingVideos];

  for (const item of sourceMetadata) {
    if (!isYoutubeSearchIntentItem(item)) continue;
    const query = item.intent?.query?.trim();
    if (!query) continue;
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    if (seen.has(url)) continue;
    seen.add(url);
    const title =
      (typeof item.title === "string" && item.title.trim()) ||
      (typeof item.intent?.suggestion === "string" &&
        item.intent.suggestion.trim()) ||
      `YouTube: ${query}`;
    merged.push({
      title,
      artist: null,
      url,
    });
  }
  return merged;
}

/**
 * Use the YouTube search intent from ChatWonder `source_metadata` and call
 * YouTube Data API to fetch actual video details (instead of only building
 * `youtube.com/results?search_query=...` links).
 *
 * If the YouTube API call fails (quota/misconfig), it falls back to the
 * existing results-url approach so the UI still has something to render.
 */
export async function appendYouTubeSearchResultsFromSourceMetadata(
  sourceMetadata: unknown[],
  existingVideos: ParsedVideo[],
  options?: {
    maxQueries?: number;
    maxResultsPerQuery?: number;
    enableCache?: boolean;
    cacheTtlSeconds?: number;
  },
): Promise<ParsedVideo[]> {
  const maxQueries = options?.maxQueries ?? 2;
  const maxResultsPerQuery = options?.maxResultsPerQuery ?? 3;
  const enableCache = options?.enableCache ?? true;

  const seen = new Set(
    existingVideos.map((v) => v.url).filter((u): u is string => Boolean(u)),
  );
  // Filter out placeholder videos (empty or missing URLs) — real results will replace them
  const merged: ParsedVideo[] = existingVideos.filter((v) => Boolean(v.url));

  // Prefer queries that were already suggested in the parsed `videos` field.
  // In our current ChatWonder prompt, these often look like:
  // - "YouTube results for coheed and cambria"
  // - "YouTube: <query>"
  const extractPreferredQueriesFromExistingVideos = (
    videos: ParsedVideo[],
  ): string[] => {
    const out: string[] = [];
    const seen = new Set<string>();

    for (const v of videos) {
      const title = typeof v?.title === "string" ? v.title : "";
      const t = title.trim();
      if (!t) continue;

      const m1 = t.match(/^YouTube results for\s+(.+)$/i);
      const m2 = t.match(/^YouTube:\s*(.+)$/i);

      const q = (m1?.[1] ?? m2?.[1] ?? "").trim();
      if (!q) continue;
      if (seen.has(q)) continue;
      seen.add(q);
      out.push(q);

      if (out.length >= maxQueries) break;
    }
    return out;
  };

  const preferredQueries =
    extractPreferredQueriesFromExistingVideos(existingVideos);

  // Extract unique queries from `[Sources]` metadata while keeping order
  const queriesFromMetadata: string[] = [];
  if (preferredQueries.length === 0) {
    const seenQueries = new Set<string>();
    for (const item of sourceMetadata) {
      if (!isYoutubeSearchIntentItem(item)) continue;
      const q = item.intent?.query?.trim();
      if (!q) continue;
      if (seenQueries.has(q)) continue;
      seenQueries.add(q);
      queriesFromMetadata.push(q);
      if (queriesFromMetadata.length >= maxQueries) break;
    }
  }

  const queries =
    preferredQueries.length > 0 ? preferredQueries : queriesFromMetadata;

  for (const query of queries) {
    try {
      const cacheKey = `chat:youtube:search:${query}`;
      if (enableCache) {
        const cached = await CacheUtil.get<ParsedVideo[]>(cacheKey);
        if (cached && Array.isArray(cached) && cached.length) {
          for (const v of cached) {
            if (v?.url && !seen.has(v.url)) {
              seen.add(v.url);
              merged.push(v);
            }
          }
          continue;
        }
      }

      const results = await YouTubeService.searchVideos(
        query,
        maxResultsPerQuery,
      );

      const videosToAdd: ParsedVideo[] = (results as any[])
        .map((r: any) => {
          const videoId = r?.id?.videoId ?? r?.id;
          const title = r?.snippet?.title ?? "YouTube Video";
          const channelTitle = r?.snippet?.channelTitle ?? null;
          if (!videoId || typeof videoId !== "string") return null;
          return {
            title,
            artist: channelTitle || null,
            url: `https://www.youtube.com/watch?v=${videoId}`,
          } as ParsedVideo;
        })
        .filter((v): v is ParsedVideo => Boolean(v && v.url));

      for (const v of videosToAdd) {
        if (v?.url && !seen.has(v.url)) {
          seen.add(v.url);
          merged.push(v);
        }
      }

      if (enableCache && videosToAdd.length) {
        await CacheUtil.set(cacheKey, videosToAdd, options?.cacheTtlSeconds);
      }
    } catch (error: any) {
      logger.warn(
        `[YouTube intent->search] Failed for query "${query}", falling back to results URL: ${error?.message || error}`,
      );
      const fallbackUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
        query,
      )}`;
      if (!seen.has(fallbackUrl)) {
        seen.add(fallbackUrl);
        merged.push({
          title: `YouTube: ${query}`,
          artist: null,
          url: fallbackUrl,
        });
      }
    }
  }

  return merged;
}

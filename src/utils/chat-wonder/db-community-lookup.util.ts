import ChummeSubCategoryRepo from "../../repositories/chumme-subcategory.repository";
import logger from "../logger";

export interface RecommendedCommunity {
  id: string;
  name: string;
  note: string | null;
  memberCount: number;
  isPrivate: boolean;
  category: string | null;
}

/**
 * Searches public communities from the DB and returns the best matches
 * for a given query keyword.
 *
 * Matching strategy (in priority order):
 *  1. Community name contains the query
 *  2. discoveryKeywords array contains the query
 *  3. note/description contains the query
 *
 * Falls back to returning the most popular public communities
 * when the query is empty or no matches are found.
 *
 * @param query - Keyword extracted from community intent detection
 * @param limit - Max number of communities to return (default 3)
 */
export async function searchDbCommunities(
  query: string,
  limit: number = 3,
): Promise<RecommendedCommunity[]> {
  try {
    const allCommunities = await ChummeSubCategoryRepo.getAllSubCategories({
      publicOnly: true,
    });

    if (allCommunities.length === 0) {
      logger.info(`[DB-COMMUNITY-LOOKUP] No public communities found in DB`);
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();

    let matched = allCommunities;

    if (normalizedQuery) {
      const scored = allCommunities.map((c) => {
        const nameMatch = c.name?.toLowerCase().includes(normalizedQuery);
        const noteMatch = c.note?.toLowerCase().includes(normalizedQuery);
        const keywordMatch = Array.isArray((c as any).discoveryKeywords)
          ? (c as any).discoveryKeywords.some((k: string) =>
              k.toLowerCase().includes(normalizedQuery),
            )
          : false;
        const categoryMatch = c.chummeCategory?.name
          ?.toLowerCase()
          .includes(normalizedQuery);

        const score =
          (nameMatch ? 4 : 0) +
          (keywordMatch ? 3 : 0) +
          (categoryMatch ? 2 : 0) +
          (noteMatch ? 1 : 0);

        return { community: c, score };
      });

      const filtered = scored
        .filter((s) => s.score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          // Tie-break by member count
          return (
            (b.community.populationCount ?? 0) -
            (a.community.populationCount ?? 0)
          );
        });

      matched = filtered.length > 0
        ? filtered.map((s) => s.community)
        : allCommunities;
    }

    // Sort by population when no query filtering was applied
    if (!normalizedQuery) {
      matched = [...matched].sort(
        (a, b) => (b.populationCount ?? 0) - (a.populationCount ?? 0),
      );
    }

    const top = matched.slice(0, limit);

    logger.info(
      `[DB-COMMUNITY-LOOKUP] query="${normalizedQuery}" → ${top.length} result(s): ${top.map((c) => c.name).join(", ")}`,
    );

    return top.map((c) => ({
      id: c.id,
      name: c.name,
      note: c.note ?? null,
      memberCount: c.populationCount ?? 0,
      isPrivate: !!(c.keyPassword && c.keyPassword.trim() !== ""),
      category: c.chummeCategory?.name ?? null,
    }));
  } catch (error: any) {
    logger.error(`[DB-COMMUNITY-LOOKUP] error: ${error?.message || error}`);
    return [];
  }
}

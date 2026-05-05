/**
 * Helper to map live status from linked artists to a category or subcategory item
 */
export const mapLiveStatus = (item: any, globalLiveArtists: any[] = []) => {
  if (!item) return item;

  // 1. Identify the type of item
  // Top-level categories have chummeTraits but no parent link
  // Sub-categories have chummeCategoryId or a chummeCategory relation
  const isSub = !!item.chummeCategoryId || !!item.chummeCategory;
  const isTopic = !!item.chummeSubCategoryId || !!item.chummeSubCategory;
  const isTopLevel = !isSub && !isTopic;

  // 2. Resolve target countries (used for matching live artists)
  const targetCountries = (item.targetCountries && item.targetCountries.length > 0)
    ? item.targetCountries
    : (item.chummeCategory?.targetCountries || item.chummeSubCategory?.chummeCategory?.targetCountries || []);

  // 3. Resolve local artists
  // Top-level categories can use their own linked artists.
  // We STOP subcategories/topics from inheriting artists from their parents (as per user request).
  const localArtists = (item.chummeArtists && item.chummeArtists.length > 0)
    ? item.chummeArtists
    : [];

  // 4. Check if any local artist is live
  let liveArtist = localArtists.find((a: any) => a.isLive);

  // 5. Global geographical fallback - ONLY for top-level categories
  // This makes the country bubble (e.g. "United States") light up if ANYONE in that country is live.
  // It is DISABLED for subcategories/topics to prevent "NBC News" from lighting up "Some Topic".
  if (!liveArtist && isTopLevel && targetCountries.length > 0 && globalLiveArtists.length > 0) {
    liveArtist = globalLiveArtists.find((a: any) =>
      a.countries?.some((c: string) => targetCountries.includes(c))
    );
  }

  return {
    ...item,
    isLive: !!liveArtist,
    activeVideoId: liveArtist?.activeVideoId || null,
    liveArtistName: liveArtist?.name || null,
    liveArtistId: liveArtist?.id || null,
    liveArtistCountries: liveArtist?.countries || [],
  };
};

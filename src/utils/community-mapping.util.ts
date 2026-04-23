/**
 * Helper to map live status from linked artists to a category or subcategory item
 */
export const mapLiveStatus = (item: any, globalLiveArtists: any[] = []) => {
  if (!item) return item;

  // Direct artists associated with this item
  const localArtists = (item.chummeArtists && item.chummeArtists.length > 0) 
    ? item.chummeArtists 
    : (item.chummeCategory?.chummeArtists || []);
  
  const targetCountries = item.targetCountries || [];

  // 1. Check local artists first (standard link logic)
  let liveArtist = localArtists.find((a: any) => {
    if (!a.isLive) return false;
    // If category has target countries, linked artist must match one to "represent" this bubble correctly
    if (targetCountries.length > 0) {
      return a.countries?.some((c: string) => targetCountries.includes(c));
    }
    return true; 
  });

  // 2. If no local match, check GLOBAL live artists for geographical match
  if (!liveArtist && targetCountries.length > 0 && globalLiveArtists.length > 0) {
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

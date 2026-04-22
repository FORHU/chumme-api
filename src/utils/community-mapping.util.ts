/**
 * Helper to map live status from linked artists to a category or subcategory item
 */
export const mapLiveStatus = (item: any) => {
  if (!item) return item;

  // Direct artists (for Category) or nested artists (for Subcategory)
  const artists = item.chummeArtists || item.chummeCategory?.chummeArtists || [];
  const liveArtist = artists.find((a: any) => a.isLive);

  return {
    ...item,
    isLive: !!liveArtist,
    activeVideoId: liveArtist?.activeVideoId || null,
  };
};

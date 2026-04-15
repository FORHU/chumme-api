import SearchRepo from "../repositories/search.repository";

type SearchType = "tracks" | "albums" | "artists" | "playlists" | "all";

export default class SearchSvc {
  static async search(params: {
    q: string;
    type?: SearchType;
    limit?: number;
  }) {
    const { q, type = "all", limit = 10 } = params;
    const perType = type === "all" ? Math.ceil(limit / 4) : limit;

    const [tracks, albums, artists, playlists] = await Promise.all([
      type === "all" || type === "tracks"
        ? SearchRepo.searchTracks(q, perType)
        : [],
      type === "all" || type === "albums"
        ? SearchRepo.searchAlbums(q, perType)
        : [],
      type === "all" || type === "artists"
        ? SearchRepo.searchArtists(q, perType)
        : [],
      type === "all" || type === "playlists"
        ? SearchRepo.searchPlaylists(q, perType)
        : [],
    ]);

    if (type !== "all") {
      return { [type]: { tracks, albums, artists, playlists }[type] };
    }

    return { tracks, albums, artists, playlists };
  }
}

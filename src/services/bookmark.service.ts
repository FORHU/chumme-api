import UserRepo from "../repositories/user.repository";
import BookmarkRepo from "../repositories/bookmark.repository";
import CacheUtil from "../utils/cache.util";
export default class BookmarkSvc {
  static async fetchAllUserBookmarks(
    userId: string,
    page: number,
    limit: number
  ) {
    if (page < 0) {
      throw new Error("Page must be non-negative");
    }
    if (limit < 1 || limit > 50) {
      throw new Error("Limit must be between 1 and 50");
    }

    const cacheKey = `feed:page:${page}:limit:${limit}`;
    const cached = await CacheUtil.get(cacheKey);
    if (cached) {
      return cached;
    }
    const bookmark = await BookmarkRepo.fetchUserBookmarks(userId, page, limit);
    await CacheUtil.set(cacheKey, bookmark);
  }

  static async saveBookmark(userId: string, feedId: string) {
  
    const query = { userFeed: { userId, feedId } };
    const existingBookmark = await BookmarkRepo.getBookmark(query);

    let message = "";
    let bookmarkResult;

    if (existingBookmark) {
      await BookmarkRepo.deleteUserBookmark(existingBookmark.id);
      message = "Bookmark removed";
    } else {
      await BookmarkRepo.createUserBookmark(userId, feedId);
      message = "Bookmark added";
    }

    const updatedUser = await UserRepo.findUserBookmark(userId);
    const bookmarkIds = updatedUser?.bookmarks?.map((b) => b.id) ?? [];

    if (bookmarkIds.length > 0) {
      bookmarkResult = await BookmarkRepo.getBookmarksByIds(bookmarkIds);
    }

    return {
      message,
      results: bookmarkResult ?? [],
    };
  }
}

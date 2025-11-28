import { Bookmark } from "@prisma/client";
import UserRepo from "../repositories/user.repository";
import { prisma } from "../utils/prisma";
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

  static async saveBookmark(userId: string, bookmarkId: string) {
    const user = await UserRepo.findUserBookmark(userId);
    if (!user) throw new Error("User cannot be found");

    const bookmarks: Bookmark[] = user.bookmarks || [];
    const existingBookmark = bookmarks.find((b) => b.id === bookmarkId);

    let message = "";

    if (existingBookmark) {
      await BookmarkRepo.deleteUserBookmark(bookmarkId);
      message = "Bookmark removed";
    } else {
      await BookmarkRepo.createUserBookmark(bookmarkId, userId);
      message = "Bookmark added";
    }

    const updatedUser = await UserRepo.findUserBookmark(userId);

    return {
      message,
      results: updatedUser?.bookmarks.map((b) => b.id) || [],
    };
  }
}

import * as artistRepo from "../repositories/artist.repository";
import CacheUtil from "../utils/cache.util";

export const getAllArtists = async () => {
    const cacheKey = "artists:all";

    const cached = await CacheUtil.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const artists = await artistRepo.getAllArtists();

    await CacheUtil.set(cacheKey, JSON.stringify(artists), 3600);

    return artists;
};

export const getUserArtists = async (userId: string) => {
    const cacheKey = `user:${userId}:artists`;

    const cached = await CacheUtil.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const userArtists = await artistRepo.getUserArtists(userId);

    await CacheUtil.set(cacheKey, JSON.stringify(userArtists), 3600);

    return userArtists;
};

export const addUserArtists = async (
    userId: string,
    artistIds: string[]
) => {
    await artistRepo.addUserArtists(userId, artistIds);
    await CacheUtil.del(`user:${userId}:artists`);

    const data = await artistRepo.getUserArtists(userId);
    return data;
};
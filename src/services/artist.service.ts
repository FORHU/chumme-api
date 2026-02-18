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

export const addUserArtists = async (userId: string, artistIds: string[]) => {
  await artistRepo.addUserArtists(userId, artistIds);

  // Clear user artists cache
  await CacheUtil.del(`user:${userId}:artists`);

  // Clear personalized feed cache since artist preferences changed
  await CacheUtil.delByPattern(`feed:personalized:${userId}:*`);

  const data = await artistRepo.getUserArtists(userId);
  return data;
};

export const removeUserArtist = async (userId: string, artistId: string) => {
  const result = await artistRepo.removeUserArtist(userId, artistId);

  // Clear user artists cache
  await CacheUtil.del(`user:${userId}:artists`);

  // Clear personalized feed cache since artist preferences changed
  await CacheUtil.delByPattern(`feed:personalized:${userId}:*`);

  return result;
};

export const getArtistById = async (id: string) => {
  const cacheKey = `artist:${id}`;

  const cached = await CacheUtil.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const artist = await artistRepo.findById(id);

  if (artist) {
    await CacheUtil.set(cacheKey, JSON.stringify(artist), 3600);
  }

  return artist;
};

export const createArtist = async (data: any) => {
  const artist = await artistRepo.create(data);

  // Clear global artists cache
  await CacheUtil.del("artists:all");

  return artist;
};

export const updateArtist = async (id: string, data: any) => {
  const artist = await artistRepo.update(id, data);

  // Clear caches
  await CacheUtil.del("artists:all");
  await CacheUtil.del(`artist:${id}`);

  return artist;
};

export const deleteArtist = async (id: string) => {
  const result = await artistRepo.deleteArtist(id);

  // Clear caches
  await CacheUtil.del("artists:all");
  await CacheUtil.del(`artist:${id}`);

  return result;
};

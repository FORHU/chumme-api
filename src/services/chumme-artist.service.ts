import * as chummeArtistRepo from "../repositories/chumme-artist.repository";
import CacheUtil from "../utils/cache.util";

export const getAllArtists = async () => {
  const cacheKey = "artists:all";

  const cached = await CacheUtil.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const artists = await chummeArtistRepo.getAllArtists();

  await CacheUtil.set(cacheKey, JSON.stringify(artists), 3600);

  return artists;
};

export const getUserArtists = async (userId: string) => {
  const cacheKey = `user:${userId}:artists`;

  const cached = await CacheUtil.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const userArtists = await chummeArtistRepo.getUserArtists(userId);

  await CacheUtil.set(cacheKey, JSON.stringify(userArtists), 3600);

  return userArtists;
};

export const addUserArtists = async (userId: string, artistIds: string[]) => {
  await chummeArtistRepo.addUserArtists(userId, artistIds);

  // Clear user artists cache
  await CacheUtil.del(`user:${userId}:artists`);
  await CacheUtil.del(`user:${userId}`);

  // Clear personalized feed cache since artist preferences changed
  await CacheUtil.delByPattern(`feed:personalized:${userId}:*`);

  const data = await chummeArtistRepo.getUserArtists(userId);
  return data;
};

export const assignRandomArtists = async (userId: string) => {
  const randomArtists = await chummeArtistRepo.getRandomArtists(4);

  if (randomArtists.length === 0) {
    return [];
  }

  const artistIds = randomArtists.map((a) => a.id);
  await addUserArtists(userId, artistIds);
  await CacheUtil.del(`user:${userId}`);

  return await getUserArtists(userId);
};

export const removeUserArtist = async (userId: string, artistId: string) => {
  const result = await chummeArtistRepo.removeUserArtist(userId, artistId);

  // Clear user artists cache
  await CacheUtil.del(`user:${userId}:artists`);
  await CacheUtil.del(`user:${userId}`);

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

  const artist = await chummeArtistRepo.findById(id);

  if (artist) {
    await CacheUtil.set(cacheKey, JSON.stringify(artist), 3600);
  }

  return artist;
};

export const createArtist = async (data: any) => {
  const artist = await chummeArtistRepo.create(data);

  // Clear global artists cache
  await CacheUtil.del("artists:all");

  return artist;
};

export const updateArtist = async (id: string, data: any) => {
  const artist = await chummeArtistRepo.update(id, data);

  // Clear caches
  await CacheUtil.del("artists:all");
  await CacheUtil.del(`artist:${id}`);

  return artist;
};

export const deleteArtist = async (id: string) => {
  const result = await chummeArtistRepo.deleteArtist(id);

  // Clear caches
  await CacheUtil.del("artists:all");
  await CacheUtil.del(`artist:${id}`);

  return result;
};

export const getLiveArtists = async () => {
  const cacheKey = "artists:live";

  const cached = await CacheUtil.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const artists = await chummeArtistRepo.getLiveArtists();

  await CacheUtil.set(cacheKey, JSON.stringify(artists), 300); // Cache for 5 mins

  return artists;
};

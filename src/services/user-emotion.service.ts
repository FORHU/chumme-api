import * as userEmotionRepo from "../repositories/user-emotion.repository";
import CacheUtil from "../utils/cache.util";


export const getAllEmotions = async () => {
    const cacheKey = "emotions:all";

    const cached = await CacheUtil.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const emotions = await userEmotionRepo.getAllEmotions();

    await CacheUtil.set(cacheKey, JSON.stringify(emotions), 3600);

    return emotions;
};

export const getUserEmotions = async (userId: string) => {
    const cacheKey = `user:${userId}:emotions`;

    const cached = await CacheUtil.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const userEmotions = await userEmotionRepo.getUserEmotions(userId);

    await CacheUtil.set(cacheKey, JSON.stringify(userEmotions), 3600);

    return userEmotions;
};

export const addUserEmotions = async (
    userId: string,
    emotionIds: string[]
) => {
    await userEmotionRepo.addUserEmotions(userId, emotionIds);
    await CacheUtil.del(`user:${userId}:emotions`);

    // Fetch fresh data from DB without caching it in this response
    const freshData = await userEmotionRepo.getUserEmotions(userId);
    return freshData;
};

export const removeUserEmotion = async (
    userId: string,
    userEmotionId: string
) => {
    await userEmotionRepo.removeUserEmotion(userId, userEmotionId);
    await CacheUtil.del(`user:${userId}:emotions`);

    return { success: true };
};

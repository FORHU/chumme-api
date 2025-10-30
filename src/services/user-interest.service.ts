import * as userInterestRepo from "../repositories/user-interest.repository";
import CacheUtil from "../utils/cache.util";


export const getAllInterests = async () => {
    const cacheKey = "interests:all";

    const cached = await CacheUtil.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const interests = await userInterestRepo.getAllInterests();

    await CacheUtil.set(cacheKey, JSON.stringify(interests), 3600);

    return interests;
};

export const getUserInterests = async (userId: string) => {
    const cacheKey = `user:${userId}:interests`;

    const cached = await CacheUtil.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const userInterests = await userInterestRepo.getUserInterests(userId);

    await CacheUtil.set(cacheKey, JSON.stringify(userInterests), 3600);

    return userInterests;
};

export const addUserInterests = async (
    userId: string,
    interestIds: string[]
) => {
    await userInterestRepo.addUserInterests(userId, interestIds);
    await CacheUtil.del(`user:${userId}:interests`);

    const freshData = await userInterestRepo.getUserInterests(userId);
    return freshData;

}; export const removeUserInterest = async (
    userId: string,
    userInterestId: string
) => {
    await userInterestRepo.removeUserInterest(userId, userInterestId);
    await CacheUtil.del(`user:${userId}:interests`);

    return { success: true };
};

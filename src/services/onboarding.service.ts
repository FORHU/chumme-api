import OnboardingRepo from "../repositories/onboarding.repository";
import CacheUtil from "../utils/cache.util";

export default class OnboardingSvc {
    /**
     * Get user's onboarding status and current selections
     */
    static async getOnboardingStatus(userId: string) {
        const cacheKey = `onboarding:status:${userId}`;

        const cached = await CacheUtil.get(cacheKey);
        if (cached) {
            return cached;
        }

        const status = await OnboardingRepo.getOnboardingStatus(userId);
        if (!status) {
            throw new Error("User not found");
        }

        const response = {
            onboardingCompleted: status.onboardingCompleted,
            selectedInterests: status.userInterests.map(ui => ui.interest),
            selectedEmotions: status.userEmotionPreferences.map(uep => uep.emotion),
            selectedArtists: [] // Relation chummeArtists was removed from SocialUserDiscovery

        };

        await CacheUtil.set(cacheKey, response);

        return response;
    }

    /**
     * Save user's selected interests (replace all)
     */
    static async saveInterests(userId: string, interestIds: string[]) {
        const result = await OnboardingRepo.saveInterests(userId, interestIds);

        // Clear onboarding status cache
        await CacheUtil.del(`onboarding:status:${userId}`);
        await CacheUtil.del(`user:${userId}:interests`);

        return result.map(ui => ui.interest);
    }

    /**
     * Save user's selected emotions (replace all)
     */
    static async saveEmotions(userId: string, emotionIds: string[]) {
        const result = await OnboardingRepo.saveEmotions(userId, emotionIds);

        // Clear onboarding status cache
        await CacheUtil.del(`onboarding:status:${userId}`);
        await CacheUtil.del(`user:${userId}:emotions`);

        return result.map(uep => uep.emotion);
    }

    /**
     * Save user's favorite artists (replace all)
     */
    static async saveArtists(userId: string, artistIds: string[]) {
        const result = await OnboardingRepo.saveArtists(userId, artistIds);

        // Clear onboarding status cache
        await CacheUtil.del(`onboarding:status:${userId}`);
        await CacheUtil.del(`user:${userId}:artists`);

        return result; //Repo now returns artist array directly
    }

    /**
     * Mark onboarding as complete
     */
    static async completeOnboarding(userId: string) {
        const result = await OnboardingRepo.completeOnboarding(userId);

        // Clear caches
        await CacheUtil.del(`onboarding:status:${userId}`);
        await CacheUtil.del(`user:${userId}`); // User cache has onboardingCompleted field

        return result;
    }
}

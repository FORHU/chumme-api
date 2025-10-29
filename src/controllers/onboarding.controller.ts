import { Request, Response } from "express";
import Joi from "joi";
import OnboardingSvc from "../services/onboarding.service";

export default class OnboardingCtrl {
    /**
     * GET /onboarding/status
     * Get user's onboarding status and current selections
     */
    static async getStatus(req: Request, res: Response) {
        try {
            const userId = req.user.id;
            const status = await OnboardingSvc.getOnboardingStatus(userId);
            return res.json(status);
        } catch (error) {
            console.error('Error in getStatus:', error);
            return res.status(500).json({
                message: error instanceof Error ? error.message : "Failed to get onboarding status"
            });
        }
    }

    /**
     * POST /onboarding/interests
     * Save user's selected interests (replace all)
     */
    static async saveInterests(req: Request, res: Response) {
        try {
            const schema = Joi.object({
                interestIds: Joi.array().items(Joi.string().uuid()).min(1).required()
            });

            const { error, value } = schema.validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.details[0].message });
            }

            const userId = req.user.id;
            const interests = await OnboardingSvc.saveInterests(userId, value.interestIds);

            return res.json({
                message: "Interests saved successfully",
                interests
            });
        } catch (error) {
            console.error('Error in saveInterests:', error);
            return res.status(500).json({
                message: error instanceof Error ? error.message : "Failed to save interests"
            });
        }
    }

    /**
     * POST /onboarding/emotions
     * Save user's selected emotions (replace all)
     */
    static async saveEmotions(req: Request, res: Response) {
        try {
            const schema = Joi.object({
                emotionIds: Joi.array().items(Joi.string().uuid()).min(1).required()
            });

            const { error, value } = schema.validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.details[0].message });
            }

            const userId = req.user.id;
            const emotions = await OnboardingSvc.saveEmotions(userId, value.emotionIds);

            return res.json({
                message: "Emotions saved successfully",
                emotions
            });
        } catch (error) {
            console.error('Error in saveEmotions:', error);
            return res.status(500).json({
                message: error instanceof Error ? error.message : "Failed to save emotions"
            });
        }
    }

    /**
     * POST /onboarding/artists
     * Save user's favorite artists (replace all)
     */
    static async saveArtists(req: Request, res: Response) {
        try {
            const schema = Joi.object({
                artistIds: Joi.array().items(Joi.string().uuid()).min(1).required()
            });

            const { error, value } = schema.validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.details[0].message });
            }

            const userId = req.user.id;
            const artists = await OnboardingSvc.saveArtists(userId, value.artistIds);

            return res.json({
                message: "Artists saved successfully",
                artists
            });
        } catch (error) {
            console.error('Error in saveArtists:', error);
            return res.status(500).json({
                message: error instanceof Error ? error.message : "Failed to save artists"
            });
        }
    }

    /**
     * PATCH /onboarding/complete
     * Mark user's onboarding as complete
     */
    static async complete(req: Request, res: Response) {
        try {
            const userId = req.user.id;
            const user = await OnboardingSvc.completeOnboarding(userId);

            return res.json({
                message: "Onboarding completed successfully",
                user
            });
        } catch (error) {
            console.error('Error in complete:', error);
            return res.status(500).json({
                message: error instanceof Error ? error.message : "Failed to complete onboarding"
            });
        }
    }
}

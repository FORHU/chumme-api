import { Request, Response } from "express";
import Joi from "joi";
import * as userInterestService from "../services/user-interest.service";


export const getAllInterests = async (req: Request, res: Response) => {
    try {
        const interests = await userInterestService.getAllInterests();

        res.status(200).json({
            success: true,
            data: interests,
        });
    } catch (error) {
        console.error("Error fetching all interests:", error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to fetch interests",
        });
    }
};

export const getUserInterests = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;

        const userInterests = await userInterestService.getUserInterests(userId);

        res.status(200).json({
            success: true,
            data: userInterests,
        });
    } catch (error) {
        console.error("Error fetching user interests:", error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to fetch user interests",
        });
    }
};

export const addUserInterests = async (req: Request, res: Response) => {
    try {
        const schema = Joi.object({
            interestIds: Joi.array()
                .items(Joi.string().uuid())
                .min(1)
                .required()
                .messages({
                    "array.min": "At least one interest is required",
                    "any.required": "interestIds is required",
                }),
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message,
            });
        }

        const userId = req.user.id;
        const { interestIds } = value;

        const updatedInterests = await userInterestService.addUserInterests(
            userId,
            interestIds
        );

        res.status(200).json({
            success: true,
            message: "Interests added successfully",
            data: updatedInterests,
        });
    } catch (error) {
        console.error("Error adding user interests:", error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to add interests",
        });
    }
};

export const removeUserInterest = async (req: Request, res: Response) => {
    try {
        const schema = Joi.object({
            id: Joi.string().uuid().required().messages({
                "string.guid": "Invalid interest ID format",
                "any.required": "Interest ID is required",
            }),
        });

        const { error, value } = schema.validate(req.params);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message,
            });
        }

        const userId = req.user.id;
        const { id: userInterestId } = value;

        await userInterestService.removeUserInterest(userId, userInterestId);

        res.status(200).json({
            success: true,
            message: "Interest removed successfully",
        });
    } catch (error) {
        console.error("Error removing user interest:", error);

        if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
            return res.status(404).json({
                success: false,
                message: "Interest not found or does not belong to you",
            });
        }

        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to remove interest",
        });
    }
};

import { Request, Response } from "express";
import Joi from "joi";
import * as userEmotionService from "../services/user-emotion.service";

export const getAllEmotions = async (req: Request, res: Response) => {
  try {
    const emotions = await userEmotionService.getAllEmotions();

    res.status(200).json({
      success: true,
      data: emotions,
    });
  } catch (error) {
    console.error("Error fetching all emotions:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch emotions",
    });
  }
};

export const getUserEmotions = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    const userEmotions = await userEmotionService.getUserEmotions(userId);

    res.status(200).json({
      success: true,
      data: userEmotions,
    });
  } catch (error) {
    console.error("Error fetching user emotions:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch user emotions",
    });
  }
};

export const addUserEmotions = async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      emotionIds: Joi.array()
        .items(Joi.string().uuid())
        .min(1)
        .required()
        .messages({
          "array.min": "At least one emotion is required",
          "any.required": "emotionIds is required",
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
    const { emotionIds } = value;

    const updatedEmotions = await userEmotionService.addUserEmotions(
      userId,
      emotionIds,
    );

    res.status(200).json({
      success: true,
      message: "Emotions added successfully",
      data: updatedEmotions,
    });
  } catch (error) {
    console.error("Error adding user emotions:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to add emotions",
    });
  }
};

export const removeUserEmotion = async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      id: Joi.string().uuid().required().messages({
        "string.guid": "Invalid emotion ID format",
        "any.required": "Emotion ID is required",
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
    const { id: userEmotionId } = value;

    await userEmotionService.removeUserEmotion(userId, userEmotionId);

    res.status(200).json({
      success: true,
      message: "Emotion removed successfully",
    });
  } catch (error) {
    console.error("Error removing user emotion:", error);

    if (
      error instanceof Error &&
      error.message.includes("Record to delete does not exist")
    ) {
      return res.status(404).json({
        success: false,
        message: "Emotion not found or does not belong to you",
      });
    }

    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to remove emotion",
    });
  }
};

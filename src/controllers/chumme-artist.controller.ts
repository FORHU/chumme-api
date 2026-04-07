import { Request, Response } from "express";
import Joi from "joi";
import * as chummeArtistService from "../services/chumme-artist.service";

export const getAllArtists = async (req: Request, res: Response) => {
  try {
    const artists = await chummeArtistService.getAllArtists();

    res.status(200).json({
      success: true,
      data: artists,
    });
  } catch (error) {
    console.error("Error fetching all artists:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch artists",
    });
  }
};

export const getArtistById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const artist = await chummeArtistService.getArtistById(id);

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist not found",
      });
    }

    res.status(200).json({
      success: true,
      data: artist,
    });
  } catch (error) {
    console.error("Error fetching artist by ID:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch artist",
    });
  }
};

export const createArtist = async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
      bio: Joi.string().allow(null, ""),
      imageUrl: Joi.string().uri().allow(null, ""),
      nationality: Joi.string().allow(null, ""),
      genre: Joi.string().allow(null, ""),
      socialPlatformUsername: Joi.string().allow(null, ""),
      platform: Joi.string().required(),
      isLive: Joi.boolean().optional(),
      subscriberCount: Joi.number().integer().allow(null).optional(),
      totalViews: Joi.alternatives()
        .try(Joi.number(), Joi.string().regex(/^\d+$/))
        .allow(null)
        .optional(),
      lastLiveAt: Joi.date().allow(null).optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const artist = await chummeArtistService.createArtist(value);

    res.status(201).json({
      success: true,
      message: "Artist created successfully",
      data: artist,
    });
  } catch (error: any) {
    console.error("Error creating artist:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create artist",
    });
  }
};

export const updateArtist = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const schema = Joi.object({
      name: Joi.string(),
      bio: Joi.string().allow(null, ""),
      imageUrl: Joi.string().uri().allow(null, ""),
      nationality: Joi.string().allow(null, ""),
      genre: Joi.string().allow(null, ""),
      socialPlatformUsername: Joi.string().allow(null, ""),
      platform: Joi.string(),
      isLive: Joi.boolean().optional(),
      subscriberCount: Joi.number().integer().allow(null).optional(),
      totalViews: Joi.alternatives()
        .try(Joi.number(), Joi.string().regex(/^\d+$/))
        .allow(null)
        .optional(),
      lastLiveAt: Joi.date().allow(null).optional(),
    }).min(1);

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const artist = await chummeArtistService.updateArtist(id, value);

    res.status(200).json({
      success: true,
      message: "Artist updated successfully",
      data: artist,
    });
  } catch (error: any) {
    console.error("Error updating artist:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update artist",
    });
  }
};

export const deleteArtist = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await chummeArtistService.deleteArtist(id);

    res.status(200).json({
      success: true,
      message: "Artist deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting artist:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete artist",
    });
  }
};

export const getUserArtists = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    const userArtists = await chummeArtistService.getUserArtists(userId);

    res.status(200).json({
      success: true,
      data: userArtists,
    });
  } catch (error) {
    console.error("Error fetching user artists:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch user artists",
    });
  }
};

export const addUserArtists = async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      artistIds: Joi.array()
        .items(Joi.string().uuid())
        .min(1)
        .required()
        .messages({
          "array.min": "At least one artist is required",
          "any.required": "artistIds is required",
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
    const { artistIds } = value;

    const updatedArtists = await chummeArtistService.addUserArtists(
      userId,
      artistIds,
    );

    res.status(200).json({
      success: true,
      message: "Artists added successfully",
      data: updatedArtists,
    });
  } catch (error) {
    console.error("Error adding user artists:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to add artists",
    });
  }
};

export const removeUserArtist = async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      artistId: Joi.string().uuid().required().messages({
        "string.guid": "Invalid artist ID format",
        "any.required": "artistId is required",
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
    const { artistId } = value;

    await chummeArtistService.removeUserArtist(userId, artistId);

    res.status(200).json({
      success: true,
      message: "Artist removed successfully",
    });
  } catch (error) {
    console.error("Error removing user artist:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to remove artist",
    });
  }
};

export const skipOnboarding = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    // 1. Assign 4 random artists
    const updatedArtists =
      await chummeArtistService.assignRandomArtists(userId);

    // 2. Mark onboarding as complete using the User repository
    const UserRepo = (await import("../repositories/user.repository")).default;
    await UserRepo.markOnboardingComplete(userId);

    res.status(200).json({
      success: true,
      message: "Onboarding skipped and random artists added",
      data: updatedArtists,
    });
  } catch (error) {
    console.error("Error skipping onboarding for artists:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to skip onboarding",
    });
  }
};

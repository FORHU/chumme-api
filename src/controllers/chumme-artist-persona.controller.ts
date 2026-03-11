import { Request, Response } from "express";
import Joi from "joi";
import * as chummeArtistPersonaService from "../services/chumme-artist-persona.service";

export const getPersonaByArtistId = async (req: Request, res: Response) => {
  try {
    const { artistId } = req.params;
    const persona = await chummeArtistPersonaService.getPersonaByArtistId(artistId);

    if (!persona) {
      return res.status(404).json({
        success: false,
        message: "Persona not found for this artist",
      });
    }

    res.status(200).json({
      success: true,
      data: persona,
    });
  } catch (error) {
    console.error("Error fetching persona:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch persona",
    });
  }
};

export const getAllPersonas = async (req: Request, res: Response) => {
  try {
    const personas = await chummeArtistPersonaService.getAllPersonas();

    res.status(200).json({
      success: true,
      data: personas,
    });
  } catch (error) {
    console.error("Error fetching all personas:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch personas",
    });
  }
};

export const createPersona = async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      artistId: Joi.string().uuid().allow(null),
      personaVoiceId: Joi.string().required(),
      personaFileId: Joi.string().uuid().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const persona = await chummeArtistPersonaService.createPersona(value);

    res.status(201).json({
      success: true,
      message: "Persona created successfully",
      data: persona,
    });
  } catch (error: any) {
    console.error("Error creating persona:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create persona",
    });
  }
};

export const updatePersona = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const schema = Joi.object({
      artistId: Joi.string().uuid().allow(null),
      personaVoiceId: Joi.string(),
      personaFileId: Joi.string().uuid(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const persona = await chummeArtistPersonaService.updatePersona(id, value);

    res.status(200).json({
      success: true,
      message: "Persona updated successfully",
      data: persona,
    });
  } catch (error: any) {
    console.error("Error updating persona:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update persona",
    });
  }
};

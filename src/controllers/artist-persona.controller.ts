import { Request, Response } from "express";
import Joi from "joi";
import * as artistPersonaService from "../services/artist-persona.service";

export const getAllPersonas = async (req: Request, res: Response) => {
  try {
    const personas = await artistPersonaService.getAllPersonas();

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
      name: Joi.string().allow(null),
      voiceKey: Joi.string().required(),
      persona: Joi.string().allow(null),
      audioPathId: Joi.string().uuid().allow(null),
      videoPathId: Joi.string().uuid().allow(null),
      imagePathId: Joi.string().uuid().allow(null),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const persona = await artistPersonaService.createPersona(value);

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
      name: Joi.string().allow(null),
      voiceKey: Joi.string(),
      persona: Joi.string().allow(null),
      audioPathId: Joi.string().uuid().allow(null),
      videoPathId: Joi.string().uuid().allow(null),
      imagePathId: Joi.string().uuid().allow(null),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const persona = await artistPersonaService.updatePersona(id, value);

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

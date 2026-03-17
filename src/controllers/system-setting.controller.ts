import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

/**
 * Get system setting by key
 * GET /api/settings/:key
 */
export const getSetting = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const setting = await prisma.systemSetting.findUnique({ where: { key } });

    res.status(200).json({
      success: true,
      data: setting,
    });
  } catch (error) {
    console.error(`Error fetching setting [${req.params.key}]:`, error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch setting",
    });
  }
};

/**
 * Upsert system setting
 * POST /api/settings
 */
export const updateSetting = async (req: Request, res: Response) => {
  try {
    const { key, value, name, description } = req.body;
    
    if (!key) {
      return res.status(400).json({ success: false, message: "key is required" });
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value, name, description },
      create: { key, value, name, description },
    });

    res.status(200).json({
      success: true,
      data: setting,
    });
  } catch (error) {
    console.error("Error updating setting:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to update setting",
    });
  }
};

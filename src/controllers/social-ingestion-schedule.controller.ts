import { Request, Response } from "express";
import Joi from "joi";
import * as scheduleService from "../services/social-ingestion-schedule.service";

export const getSchedulesByTarget = async (req: Request, res: Response) => {
  try {
    const { targetId } = req.params;
    const schedules = await scheduleService.getSchedulesByTargetId(targetId);

    res.status(200).json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    console.error("Error fetching schedules:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch schedules",
    });
  }
};

export const createSchedule = async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      socialIngestionTargetId: Joi.string().uuid().required(),
      mode: Joi.string().valid("AUTO", "MANUAL"),
      exactTime: Joi.string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .allow(null, ""), // HH:MM
      intervalHours: Joi.number().integer().min(1).allow(null),
      isActive: Joi.boolean(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const schedule = await scheduleService.createSchedule(value);

    res.status(201).json({
      success: true,
      message: "Schedule created successfully",
      data: schedule,
    });
  } catch (error: any) {
    console.error("Error creating schedule:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create schedule",
    });
  }
};

export const updateSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const schema = Joi.object({
      mode: Joi.string().valid("AUTO", "MANUAL"),
      exactTime: Joi.string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .allow(null, ""),
      intervalHours: Joi.number().integer().min(1).allow(null),
      isActive: Joi.boolean(),
    }).min(1);

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const schedule = await scheduleService.updateSchedule(id, value);

    res.status(200).json({
      success: true,
      message: "Schedule updated successfully",
      data: schedule,
    });
  } catch (error: any) {
    console.error("Error updating schedule:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update schedule",
    });
  }
};

export const deleteSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await scheduleService.deleteSchedule(id);

    res.status(200).json({
      success: true,
      message: "Schedule deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting schedule:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete schedule",
    });
  }
};

import { Request, Response } from "express";
import Joi from "joi";
import * as scheduleService from "../services/social-ingestion-schedule.service";
import { rabbitMQService } from "../utils/rabbitmq";
import { IngestionJobType, IngestionJob } from "../listeners/ingestion.listener";
import SocialFeedSvc from "../services/social-feed.service";

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
      message: error instanceof Error ? error.message : "Failed to fetch schedules",
    });
  }
};

export const createSchedule = async (req: Request, res: Response) => {
  try {
    const schema = Joi.object({
      socialIngestionTargetId: Joi.string().uuid().required(),
      mode: Joi.string().valid("AUTO", "MANUAL"),
      exactTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).allow(null, ""), // HH:MM
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
      exactTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).allow(null, ""),
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

export const triggerScheduleNow = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const schedule = await scheduleService.getScheduleById(id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    const { target } = schedule as any; // Loaded via repository findById target: true

    if (!target) {
       return res.status(404).json({
        success: false,
        message: "Associated Ingestion Target not found",
      });
    }

    const job: IngestionJob = {
      type: IngestionJobType.DISCOVERY,
      platform: target.platform,
      targetId: target.externalHandle,
      priority: 3, // High priority for manual actions
      meta: {
        artistId: target.chummeArtistId,
        categoryId: target.chummeCategoryId,
        subCategoryId: target.chummeSubCategoryId,
        topicCategoryId: target.chummeTopicCategoryId,
        pageToken: target.nextPageToken || undefined,
      },
    };

    await rabbitMQService.publishMessage(
      `ingestion.${IngestionJobType.DISCOVERY}`,
      job,
      { priority: job.priority }
    );

    res.status(200).json({
      success: true,
      message: "Ingestion job triggered successfully to queue",
    });
  } catch (error: any) {
    console.error("Error triggering schedule:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to trigger schedule",
    });
  }
};

export const getSnapshots = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const snapshots = await SocialFeedSvc.getSnapshots(id);

    res.status(200).json({
      success: true,
      data: snapshots,
    });
  } catch (error) {
    console.error("Error fetching snapshots:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch snapshots",
    });
  }
};

export const skipChainStep = async (req: Request, res: Response) => {
  const { prisma } = require("../utils/prisma");
  const { SchedulingService } = require("../services/net-communities/ingestion/scheduling.service");
  const RedisUtil = require("../utils/redis.util").default;

  try {
     const stepSetting = await prisma.systemSetting.findUnique({
       where: { key: "CURRENT_CHAIN_STEP" },
     });
     
     if (stepSetting) {
       const platform = stepSetting.value.toLowerCase();
       // Force counter to 0
       await RedisUtil.redisClient.set(`chain_pending_jobs:${platform}`, "0");
     }

     // Trigger advance
     await SchedulingService.triggerNextStep();

     res.status(200).json({
       success: true,
       message: "Skipped current chain step successfully.",
     });
  } catch (error: any) {
    console.error("Error skipping chain step:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to skip chain step",
    });
  }
};

export const startChain = async (req: Request, res: Response) => {
  const { SchedulingService } = require("../services/net-communities/ingestion/scheduling.service");

  try {
     await SchedulingService.startSequentialChain();

     res.status(200).json({
       success: true,
       message: "Chain sequence started successfully.",
     });
  } catch (error: any) {
    console.error("Error starting chain:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to start chain",
    });
  }
};

export const getChainStatus = async (req: Request, res: Response) => {
  const { prisma } = require("../utils/prisma");
  const RedisUtil = require("../utils/redis.util").default;

  try {
     const activeSetting = await prisma.systemSetting.findUnique({
       where: { key: "CHAIN_ACTIVE" },
     });
     const isActive = activeSetting ? activeSetting.value === "true" : false;

     const chainSetting = await prisma.systemSetting.findUnique({
       where: { key: "CRAWL_CHAIN" },
     });
     const chain = chainSetting ? JSON.parse(chainSetting.value) : [];

     const stepSetting = await prisma.systemSetting.findUnique({
       where: { key: "CURRENT_CHAIN_STEP" },
     });
     const currentStep = stepSetting ? stepSetting.value : (chain[0] || "None");

     let pendingJobs = 0;
     if (currentStep && currentStep !== "None") {
       const platform = currentStep.toLowerCase();
       const count = await RedisUtil.redisClient.get(`chain_pending_jobs:${platform}`);
       pendingJobs = count ? parseInt(count, 10) : 0;
     }

     const currentIndex = chain.indexOf(currentStep);
     const nextIndex = currentIndex + 1 >= chain.length ? 0 : currentIndex + 1;
     const nextStep = chain.length > 0 ? chain[nextIndex] : "None";

     res.status(200).json({
       success: true,
       data: {
         isActive,
         currentStep,
         nextStep,
         chain,
         pendingJobs: Math.max(0, pendingJobs), // Prevent negative counts from bugs
       },
     });
  } catch (error: any) {
    console.error("Error fetching chain status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch chain status",
    });
  }
};

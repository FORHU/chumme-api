import { Request, Response } from "express";
import MonitoringSvc from "../services/net-communities/ingestion/monitoring.service";
import { SchedulingService } from "../services/net-communities/ingestion/scheduling.service";

export default class MonitoringCtrl {
  /**
   * Get ingestion pipeline status
   */
  static async getPipelineStatus(req: Request, res: Response) {
    try {
      const stats = await MonitoringSvc.getPipelineStatus();
      return res.json({
        message: "Pipeline status fetched successfully",
        data: stats,
      });
    } catch (error: any) {
      return res.status(500).json({
        message: error.message || "Internal server error",
      });
    }
  }

  /**
   * Get historical snapshots for a content item
   */
  static async getContentHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ message: "Content ID is required" });
      }

      const history = await MonitoringSvc.getContentHistory(id);
      return res.json({
        message: "Content history fetched successfully",
        data: history,
      });
    } catch (error: any) {
      return res.status(500).json({
        message: error.message || "Internal server error",
      });
    }
  }

  /**
   * Get detailed analytics for the web dashboard
   */
  static async getAnalytics(req: Request, res: Response) {
    try {
      const data = await MonitoringSvc.getIngestionAnalytics();
      return res.json({
        message: "Analytics fetched successfully",
        data,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  }

  /**
   * Get low-level worker health details
   */
  static async getHealthDetails(req: Request, res: Response) {
    try {
      const data = await MonitoringSvc.getWorkerHealthDetails();
      return res.json({
        message: "Health details fetched successfully",
        data,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  }

  /**
   * Manually trigger ingestion crawler
   */
  static async triggerCrawl(req: Request, res: Response) {
    try {
      const force = req.query.force === "true";
      await SchedulingService.processScheduledTasks(force);

      return res.json({
        success: true,
        message: `Manual crawl triggered successfully (force=${force})`,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  }
}

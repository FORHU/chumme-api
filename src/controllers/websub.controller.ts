import { Request, Response } from "express";
import { WebSubService } from "../services/net-communities/ingestion/websub.service";
import logger from "../utils/logger";

export class WebSubController {
  /**
   * GET /api/ingestion/websub/:platform
   * Hub verification endpoint
   */
  static async verify(req: Request, res: Response) {
    const platform = req.params.platform;
    logger.info(`[WebSubController] Received verification request for platform: ${platform}`);

    const challenge = await WebSubService.verifyHandshake(req.query);

    if (challenge) {
      return res.status(200).send(challenge);
    } else {
      return res.status(404).send("Not Found");
    }
  }

  /**
   * POST /api/ingestion/websub/:platform
   * Notification endpoint
   */
  static async notify(req: Request, res: Response) {
    const platform = req.params.platform;
    const signature = req.headers["x-hub-signature"] as string;
    const body = req.body; // Needs to be raw string (text/xml)

    logger.info(`[WebSubController] Received notification for platform: ${platform}`);

    try {
      await WebSubService.handleNotification(platform, body, signature);
      return res.status(200).send("OK");
    } catch (error) {
      logger.error(`[WebSubController] Error processing notification:`, error);
      return res.status(500).send("Internal Error");
    }
  }
}

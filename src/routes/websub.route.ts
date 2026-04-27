import { Router, text } from "express";
import { WebSubController } from "../controllers/websub.controller";

const router = Router();

/**
 * YouTube and other WebSub hubs send notifications in XML/Atom format.
 * We use express.text() middleware to capture the raw body as a string,
 * which is required for HMAC signature verification.
 */
const xmlParser = text({ type: ["application/atom+xml", "text/xml", "application/xml"] });

router.get("/:platform", WebSubController.verify);
router.post("/:platform", xmlParser, WebSubController.notify);

export default router;

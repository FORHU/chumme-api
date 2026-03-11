import { Router } from "express";
import SocialUserDiscoveryCtrl from "../controllers/social-user-discovery.controller";
import { authenticate } from "../middleware/auth.middleware";

const discoveryRoute = Router();

discoveryRoute.use(authenticate);

discoveryRoute.get("/", SocialUserDiscoveryCtrl.getDiscovery);
discoveryRoute.put("/", SocialUserDiscoveryCtrl.updateDiscovery);

export default discoveryRoute;

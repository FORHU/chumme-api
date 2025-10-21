import express from "express";
import authRoute from "./auth.route";
import chatRoutes from "./chat.route";

const router = express.Router();

router.get("/v1", (_, res) => {
  res.json({
    message: "Welcome to my API",
  });
});

router.use("/auth", authRoute);
router.use("/v1/chat", chatRoutes);

export default router;



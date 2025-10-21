import express from "express";
import chatRoutes from "./chat.route";

const router = express.Router();

router.get("/v1", (_, res) => {
  res.json({
    message: "Welcome to my API",
  });
});

router.use("/v1/chat", chatRoutes);

export default router;



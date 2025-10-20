import express from "express";
import TodoCtrl from "../controllers/todo.controller";

const router = express.Router();

router.post("/register", TodoCtrl.register);

export default router;

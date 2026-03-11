import express from "express";
import ChummeTopicCategoryCtrl from "../controllers/chumme-topic-category.controller";

const router = express.Router();

router.post("/", ChummeTopicCategoryCtrl.createTopicCategory);
router.get("/", ChummeTopicCategoryCtrl.getAllTopicCategories);
router.get("/:id", ChummeTopicCategoryCtrl.getTopicCategoryById);
router.patch("/:id", ChummeTopicCategoryCtrl.updateTopicCategory);
router.delete("/:id", ChummeTopicCategoryCtrl.deleteTopicCategory);

export default router;

import express from "express";
import RoomSubCategoryCtrl from "../controllers/room-subcategory.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();
router.use(authenticate);

router.post("/create", RoomSubCategoryCtrl.createSubCategory);
router.get("/", RoomSubCategoryCtrl.getAllSubCategories);
router.get("/:id", RoomSubCategoryCtrl.getSubCategoryById);
router.put("/:id", RoomSubCategoryCtrl.updateSubCategory);
router.delete("/:id", RoomSubCategoryCtrl.deleteSubCategory);

export default router;

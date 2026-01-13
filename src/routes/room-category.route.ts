import express from "express";
import RoomCategoryCtrl from "../controllers/room-category.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();
router.use(authenticate);

router.post("/create", RoomCategoryCtrl.createCategory);
router.get("/", RoomCategoryCtrl.getAllCategories);
router.get("/:id", RoomCategoryCtrl.getCategoryById);
router.put("/:id", RoomCategoryCtrl.updateCategory);
router.delete("/:id", RoomCategoryCtrl.deleteCategory);

// Bulk room operations within a category
router.get("/:id/rooms", RoomCategoryCtrl.getRoomsInCategory);
router.delete("/:id/rooms/bulk-delete", RoomCategoryCtrl.bulkDeleteRooms);

export default router;

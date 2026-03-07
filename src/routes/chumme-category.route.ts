import express from "express";
import ChummeCategoryCtrl from "../controllers/chumme-category.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();
router.use(authenticate);

router.post("/create", ChummeCategoryCtrl.createCategory);
router.get("/", ChummeCategoryCtrl.getAllCategories);
router.get("/:id", ChummeCategoryCtrl.getCategoryById);
router.put("/:id", ChummeCategoryCtrl.updateCategory);
router.delete("/:id", ChummeCategoryCtrl.deleteCategory);

// Bulk room operations within a category
router.get(
  "/:categoryId/subcategories",
  ChummeCategoryCtrl.getSubCategoriesInCategory,
);
router.post(
  "/:categoryId/subcategories/bulk-delete",
  ChummeCategoryCtrl.bulkDeleteSubCategories,
);

export default router;

import express from "express";
import ChummeCategoryCtrl from "../controllers/chumme-category.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();
router.use(authenticate);

router.post("/create", ChummeCategoryCtrl.createCategory);
router.get("/", ChummeCategoryCtrl.getAllCategories);
// Specific named routes MUST come before /:id
router.get("/entertainment", ChummeCategoryCtrl.getChummeEntertainment);
router.get("/communities", ChummeCategoryCtrl.getChummeCommunities);
router.get(
  "/specialized/:chummeTrait",
  ChummeCategoryCtrl.getSpecializedCategories,
);

// Wildcard /:id comes LAST
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

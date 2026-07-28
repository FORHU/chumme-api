import express from "express";
import ChummeSubCategoryCtrl from "../controllers/chumme-subcategory.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();
router.use(authenticate);

router.post("/create", ChummeSubCategoryCtrl.createSubCategory);
router.get("/", ChummeSubCategoryCtrl.getAllSubCategories);
// Specific named routes MUST come before /:id — otherwise Express matches
// "/category/<uuid>" against /:id with id="category".
router.get(
  "/category/:categoryId",
  ChummeSubCategoryCtrl.getChummeSubCategoryByChummeCategoryID,
);
router.get("/:id", ChummeSubCategoryCtrl.getSubCategoryById);
router.put("/:id", ChummeSubCategoryCtrl.updateSubCategory);
router.delete("/:id", ChummeSubCategoryCtrl.deleteSubCategory);

export default router;

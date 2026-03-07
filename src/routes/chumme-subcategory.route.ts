import express from "express";
import ChummeSubCategoryCtrl from "../controllers/chumme-subcategory.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();
router.use(authenticate);

router.post("/create", ChummeSubCategoryCtrl.createSubCategory);
router.get("/", ChummeSubCategoryCtrl.getAllSubCategories);
router.get("/:id", ChummeSubCategoryCtrl.getSubCategoryById);
router.get(
  "/category/:categoryId",
  ChummeSubCategoryCtrl.getChummeSubCategoryByChummeCategoryID,
);
router.put("/:id", ChummeSubCategoryCtrl.updateSubCategory);
router.delete("/:id", ChummeSubCategoryCtrl.deleteSubCategory);

export default router;

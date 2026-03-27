import express, { Request } from "express";
import multer, { FileFilterCallback } from "multer";
import ApkCtrl from "../../controllers/apk.controller";

const router = express.Router();

const apkStorage = multer.memoryStorage();

const apkFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  const isApkMime =
    file.mimetype === "application/vnd.android.package-archive";
  const isApkExt = file.originalname.toLowerCase().endsWith(".apk");

  if (isApkMime || isApkExt) {
    cb(null, true);
  } else {
    cb(new Error("Only APK files are allowed"));
  }
};

const uploadApk = multer({
  storage: apkStorage,
  fileFilter: apkFileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max for APKs
  },
});

router.post("/upload", uploadApk.single("apk"), ApkCtrl.uploadApk);
router.get("/", ApkCtrl.getAllReleases);
router.get("/download/:id", ApkCtrl.getDownloadUrl);
router.put("/:id", ApkCtrl.updateRelease);
router.patch("/:id/set-latest", ApkCtrl.setLatest);
router.patch("/:id/set-stable", ApkCtrl.setStable);
router.delete("/:id", ApkCtrl.deleteRelease);

export default router;

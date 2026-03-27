import { Request, Response } from "express";
import ApkSvc from "../services/apk.service";

export default class ApkCtrl {
  static async uploadApk(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No APK file uploaded" });
      }

      const { versionName, buildNumber, whatIsNew, setAsLatest, setAsStable } =
        req.body;

      if (!versionName) {
        return res.status(400).json({ message: "versionName is required" });
      }

      if (!buildNumber) {
        return res.status(400).json({ message: "buildNumber is required" });
      }

      let parsedWhatIsNew: string[] = [];
      if (whatIsNew) {
        try {
          parsedWhatIsNew = JSON.parse(whatIsNew);
          if (!Array.isArray(parsedWhatIsNew)) {
            return res
              .status(400)
              .json({ message: "whatIsNew must be a JSON array of strings" });
          }
        } catch {
          return res
            .status(400)
            .json({ message: "whatIsNew must be a valid JSON array string" });
        }
      }

      const release = await ApkSvc.uploadApk(req.file, {
        versionName,
        buildNumber: parseInt(buildNumber, 10),
        whatIsNew: parsedWhatIsNew,
        setAsLatest: setAsLatest === "true" || setAsLatest === true,
        setAsStable: setAsStable === "true" || setAsStable === true,
      });

      return res
        .status(201)
        .json({ message: "APK uploaded successfully", release });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async getAllReleases(req: Request, res: Response) {
    try {
      const result = await ApkSvc.getAllReleases();
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message || err });
    }
  }

  static async getDownloadUrl(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await ApkSvc.getDownloadUrl(id);
      return res.status(200).json(result);
    } catch (err: any) {
      const statusCode = err.message === "APK release not found" ? 404 : 400;
      return res.status(statusCode).json({ message: err.message || err });
    }
  }

  static async updateRelease(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { versionName, buildNumber, whatIsNew } = req.body;

      let parsedWhatIsNew: string[] | undefined;
      if (whatIsNew !== undefined) {
        if (!Array.isArray(whatIsNew)) {
          return res
            .status(400)
            .json({ message: "whatIsNew must be an array of strings" });
        }
        parsedWhatIsNew = whatIsNew;
      }

      const release = await ApkSvc.updateRelease(id, {
        ...(versionName !== undefined && { versionName }),
        ...(buildNumber !== undefined && {
          buildNumber: parseInt(buildNumber, 10),
        }),
        ...(parsedWhatIsNew !== undefined && { whatIsNew: parsedWhatIsNew }),
      });

      return res
        .status(200)
        .json({ message: "APK release updated successfully", release });
    } catch (err: any) {
      const statusCode = err.message === "APK release not found" ? 404 : 400;
      return res.status(statusCode).json({ message: err.message || err });
    }
  }

  static async setLatest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const release = await ApkSvc.setLatest(id);
      return res
        .status(200)
        .json({ message: "APK release set as latest", release });
    } catch (err: any) {
      const statusCode = err.message === "APK release not found" ? 404 : 400;
      return res.status(statusCode).json({ message: err.message || err });
    }
  }

  static async setStable(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const release = await ApkSvc.setStable(id);
      return res
        .status(200)
        .json({ message: "APK release set as stable", release });
    } catch (err: any) {
      const statusCode = err.message === "APK release not found" ? 404 : 400;
      return res.status(statusCode).json({ message: err.message || err });
    }
  }

  static async deleteRelease(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await ApkSvc.deleteRelease(id);
      return res.status(200).json(result);
    } catch (err: any) {
      const statusCode = err.message === "APK release not found" ? 404 : 400;
      return res.status(statusCode).json({ message: err.message || err });
    }
  }
}

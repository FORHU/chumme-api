import multer from "multer";
import { Request } from "express";

// Store file in memory (not disk)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Allow common file types
    const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "video/mp4",
        "video/mpeg",
        "video/mkv",
        "video/mov",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true); // Accept file
    } else {
        cb(new Error(`File type ${file.mimetype} not allowed`));
    }
};

// Multer upload middleware
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    },
});

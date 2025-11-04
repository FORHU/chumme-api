import FileRepo from "../repositories/file.repository";
import S3Util from "../utils/s3.util";

export default class FileSvc {
    static async saveFile(data: { filename?: string; fileUrl?: string }) {
        if (!data.fileUrl && !data.filename) {
            throw new Error("Either fileUrl or filename is required to save a file record.");
        }

        const file = await FileRepo.createFile({
            filename: data.filename ?? null,
            fileUrl: data.fileUrl ?? null
        });

        return file;
    }

    static async upsertFile(data: { id: string; filename?: string; fileUrl?: string }) {
        if (!data.fileUrl && !data.filename) {
            throw new Error("Either fileUrl or filename is required to upsert a file record.");
        }

        if (!data.id) {
            throw new Error("id is required for upsert. Use POST /api/file to create with auto-generated ID.");
        }

        const result = await FileRepo.upsertFile(
            data.id,
            {
                filename: data.filename ?? null,
                fileUrl: data.fileUrl ?? null
            }
        );

        return result; // { file, isUpdate }
    }

    static async uploadFile(fileBuffer: Buffer, filename: string, mimeType: string) {
        const fileUrl = await S3Util.uploadFile(fileBuffer, filename, mimeType);

        const file = await FileRepo.createFile({
            filename: filename,
            fileUrl: fileUrl
        });
        return file;
    }

    static async getFileById(fileId: string) {
        const file = await FileRepo.findFileById(fileId);

        if (!file) {
            throw new Error("File not found");
        }

        return file;
    }

    static async deleteFile(fileId: string) {
        const file = await FileRepo.findFileById(fileId);

        if (!file) {
            throw new Error("File not found");
        }

        if (file.fileUrl) {
            await S3Util.deleteFile(file.fileUrl);
        }

        await FileRepo.deleteFile(fileId);

        return { message: "File deleted successfully" };
    }
}
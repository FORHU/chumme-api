import FileRepo from "../repositories/file.repository";

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
}
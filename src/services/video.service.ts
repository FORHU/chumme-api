import VideoRepo from "../repositories/video.repository";
import FileRepo from "../repositories/file.repository";

export default class VideoSvc {
    static async saveVideo(data: {
        title: string;
        fileId: string;
        platform: any;
        artistId?: string;
        meta_data?: any;
    }) {
        if (!data.title || data.title.trim().length === 0) {
            throw new Error("Video title is required");
        }
        if (!data.fileId) {
            throw new Error("fileId is required to create a video");
        }

        // Ensure file exists before creating a video that references it
        const file = await FileRepo.findFileById(data.fileId);
        if (!file) {
            throw new Error("Referenced file not found");
        }

        const video = await VideoRepo.createVideo({
            title: data.title.trim(),
            fileId: data.fileId,
            platform: data.platform,
            artistId: data.artistId ?? null,
            meta_data: data.meta_data ?? null
        });

        return video;
    }
}
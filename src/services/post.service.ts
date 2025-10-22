import PostRepo from "../repositories/post.repository";

export default class PostSvc {
    static async createPost(userId: string, data: {
        content: string;
        mediaUrls?: string[];
    }) {
        // ensure content is not empty
        if (!data.content || data.content.trim().length === 0) {
            throw new Error("Post content is required");
        }

        // Max content length 5000 characters
        if (data.content.length > 5000) {
            throw new Error("Post content is too long (max 5000 characters)");
        }

        // 10 media files max per post
        if (data.mediaUrls && data.mediaUrls.length > 10) {
            throw new Error("Maximum 10 media files allowed per post");
        }

        return PostRepo.createPost({
            userId,
            content: data.content,
            mediaUrls: data.mediaUrls
        });
    }
}
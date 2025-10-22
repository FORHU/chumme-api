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

    static async toggleLike(postId: string, userId: string) {
        // Check if post exists
        const post = await PostRepo.findPostById(postId);
        if (!post) {
            throw new Error("Post not found");
        }

        // Check if like exists (including soft-deleted ones)
        const existingLike = await PostRepo.findLike(postId, userId);

        if (existingLike) {
            if (existingLike.isDeleted) {
                // Like was previously deleted, reactivate it
                await PostRepo.reactivateLike(existingLike.id);
                const likesCount = await PostRepo.getLikesCount(postId);
                return {
                    liked: true,
                    likesCount,
                    message: "Post liked"
                };
            } else {
                // Like is active, soft delete it
                await PostRepo.softDeleteLike(existingLike.id);
                const likesCount = await PostRepo.getLikesCount(postId);
                return {
                    liked: false,
                    likesCount,
                    message: "Post unliked"
                };
            }
        } else {
            // No like exists, create new one
            await PostRepo.createLike(postId, userId);
            const likesCount = await PostRepo.getLikesCount(postId);
            return {
                liked: true,
                likesCount,
                message: "Post liked"
            };
        }
    }
}

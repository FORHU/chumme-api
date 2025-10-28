import PostRepo from "../repositories/post.repository";
import UserRepo from "../repositories/user.repository";
import CacheUtil from "../utils/cache.util";

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

        const newPost = await PostRepo.createPost({
            userId,
            content: data.content,
            mediaUrls: data.mediaUrls
        });

        // Clear cached data because new post was created
        // Clear user's posts cache (their profile posts list changed)
        await CacheUtil.del(`post:user:${userId}`);
        // Clear user's feed cache (new post affects their feed)
        await CacheUtil.del(`post:feed:${userId}`);

        return newPost;
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
                
                // Clear cache for post owner (like count changed)
                await CacheUtil.del(`post:user:${post.userId}`);
                
                return {
                    liked: true,
                    likesCount,
                    message: "Post liked"
                };
            } else {
                // Like is active, soft delete it
                await PostRepo.softDeleteLike(existingLike.id);
                const likesCount = await PostRepo.getLikesCount(postId);
                
                // Clear cache for post owner (like count changed)
                await CacheUtil.del(`post:user:${post.userId}`);
                
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
            
            // Clear cache for post owner (like count changed)
            await CacheUtil.del(`post:user:${post.userId}`);
            
            return {
                liked: true,
                likesCount,
                message: "Post liked"
            };
        }
    }

    static async createComment(postId: string, userId: string, content: string) {
        // Check if post exists
        const post = await PostRepo.findPostById(postId);
        if (!post) {
            throw new Error("Post not found");
        }

        // ensure content is not empty
        if (!content || content.trim().length === 0) {
            throw new Error("Comment content is required");
        }
        // Max content length 1000 characters
        if (content.length > 1000) {
            throw new Error("Comment is too long (max 1000 characters)");
        }

        const newComment = await PostRepo.createComment({
            postId,
            userId,
            content: content.trim()
        });

        // Clear cached comments for this post (new comment was added)
        await CacheUtil.del(`post:comments:${postId}`);

        return newComment;
    }

    static async getCommentsByPostId(postId: string) {
        // Cache key: unique identifier for this post's comments
        const cachedKey = `post:comments:${postId}`;
        
        // Try to get from cache first
        const cached = await CacheUtil.get(cachedKey);
        if (cached) {
            return cached; // Return cached data instantly (no DB query)
        }

        // Check if post exists
        const post = await PostRepo.findPostById(postId);
        if (!post) {
            throw new Error("Post not found");
        }

        const comments = await PostRepo.getCommentsByPostId(postId);
        const total = await PostRepo.getCommentsCount(postId);

        const result = {
            comments,
            total
        };

        // Save to cache for future requests (expires in 1 hour)
        await CacheUtil.set(cachedKey, result);

        return result;
    }

    static async getPostsByUserId(userId: string) {
        // Cache key: unique identifier for this user's posts
        const cachedKey = `post:user:${userId}`;
        
        // Try cache first
        const cached = await CacheUtil.get(cachedKey);
        if (cached) {
            return cached; // Fast return from cache
        }

        // Check if user exists
        const user = await UserRepo.findUserById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const posts = await PostRepo.getPostsByUserId(userId);

        const result = {
            posts,
            total: posts.length,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                avatar: user.avatar
            }
        };

        // Cache the result
        await CacheUtil.set(cachedKey, result);

        return result;
    }

    static async getFeed(userId: string) {
        // Cache key: personalized feed per user
        const cachedKey = `post:feed:${userId}`;
        
        // Check cache
        const cached = await CacheUtil.get(cachedKey);
        if (cached) {
            return cached; // Super fast feed loading!
        }

        const posts = await PostRepo.getFeedPosts(userId);

        const result = {
            posts,
            total: posts.length
        };

        // Cache feed (expires in 1 hour)
        await CacheUtil.set(cachedKey, result);

        return result;
    }
}

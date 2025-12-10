import { prisma } from "../utils/prisma";
import logger from "../utils/logger";

interface CreateEmbeddingData {
    model: string;
    vector: number[]; // Fixed: Changed from any[] for better type safety
    chatMessageId: string;
}

export default class EmbeddingRepository {
    static async createEmbedding(data: CreateEmbeddingData) {
        try {
            if (!Array.isArray(data.vector)) {
                throw new TypeError(
                    "Embedding vector must be an array of numbers"
                );
            }

            if (!data.vector.every((n) => typeof n === "number")) {
                throw new TypeError(
                    "All elements of embedding vector must be numbers"
                );
            }

            const created = await prisma.embedding.create({
                data: {
                    model: data.model,
                    vector: data.vector,
                    chatMessageId: data.chatMessageId,
                },
            });

            return created;
        } catch (error: any) {
            logger.error(
                `[EMBEDDING-REPO] Error creating embedding: ${error?.message}`,
                error
            );
            throw error;
        }
    }

    static async getEmbeddingByChatMessageId(chatMessageId: string) {
        return await prisma.embedding.findUnique({
            where: { chatMessageId },
        });
    }

    static async findNearestNeighbors(
        vector: number[],
        userId: string,
        limit: number = 5,
        excludeChatMessageId?: string,
        conversationId?: string
    ) {
        // 1. Fetch embeddings for this user (limited for performance)
        // Note: For production with large datasets, consider using pgvector/pinecone
        const userEmbeddings = await prisma.embedding.findMany({
            where: {
                chatMessage: {
                    userId: userId,
                    // Filter by conversationId if provided to scope RAG to current conversation
                    ...(conversationId ? { conversationId } : {}),
                },
                ...(excludeChatMessageId
                    ? { chatMessageId: { not: excludeChatMessageId } }
                    : {}),
            },
            include: {
                chatMessage: true,
            },
            take: 100, // Limit to reduce memory usage
            orderBy: {
                createdAt: "desc",
            },
        });

        if (userEmbeddings.length === 0) return [];

        // 2. Calculate cosine similarity in memory
        const similarities = userEmbeddings
            .map((emb) => {
                if (!emb.vector || !Array.isArray(emb.vector)) return null;

                const storedVector = emb.vector as number[];
                const similarity = this.cosineSimilarity(vector, storedVector);

                return {
                    ...emb,
                    similarity,
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .filter((item) => item.similarity >= 0.7) // Only return truly similar messages (threshold: 0.7)
            .sort((a, b) => b.similarity - a.similarity) // Descending order
            .slice(0, limit);

        return similarities;
    }

    private static cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA === 0 || normB === 0) return 0;

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

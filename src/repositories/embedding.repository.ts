import { prisma } from "../utils/prisma";

interface CreateEmbeddingData {
    model: string;
    vector: any[];
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
        } catch (error) {
            console.error("Error creating embedding:", error);
            throw error;
        }
    }

    static async getEmbeddingByChatMessageId(chatMessageId: string) {
        return await prisma.embedding.findUnique({
            where: { chatMessageId },
        });
    }
}

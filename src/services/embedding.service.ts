import EmbeddingRepo from "../repositories/embedding.repository";

export default class EmbeddingSvc {
    static async createEmbedding(
        model: string,
        vector: number[],
        chatMessageId: string
    ) {
        return await EmbeddingRepo.createEmbedding({
            model,
            vector,
            chatMessageId,
        });
    }
}

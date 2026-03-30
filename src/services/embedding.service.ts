import EmbeddingRepo from "../repositories/embedding.repository";

export default class EmbeddingSvc {
  static async createEmbedding(
    model: string,
    vector: number[],
    chatMessageId: string,
  ) {
    return await EmbeddingRepo.createEmbedding({
      model,
      vector,
      chatMessageId,
    });
  }

  static async findSimilarMessages(
    vector: number[],
    userId: string,
    limit: number = 5,
    conversationId?: string,
  ) {
    return await EmbeddingRepo.findNearestNeighbors(
      vector,
      userId,
      limit,
      undefined,
      conversationId,
    );
  }
}

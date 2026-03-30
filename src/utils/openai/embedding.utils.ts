import logger from "../logger";
import { embeddingOpenAIRequest } from "./ai-request.util";

export const getTextEmbedding = async (inputText: string) => {
  try {
    const start = Date.now();
    const embedding = await embeddingOpenAIRequest(inputText);
    const duration = Date.now() - start;
    logger.chat_response(
      `[OPENAI-GetTextEmbedding], response time: ${duration} `,
    );
    return embedding;
  } catch (error) {
    console.error("Error in getTextEmbedding utils:", error);
    logger.chat_error(
      `[OPENAI-GetTextEmbedding], response time: "Error in getTextEmbedding utils:"`,
      error,
    );
    throw new Error("Failed to Get Text Embedding response");
  }
};

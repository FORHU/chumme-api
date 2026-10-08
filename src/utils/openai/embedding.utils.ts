// DISABLED 2026-10-08: OpenAI was removed from chumme-api (chore/remove-openai).
// Kept commented out for reference. Re-enabling needs the `openai` package
// back in package.json and OPENAI_API_KEY set on the instance.

// import logger from "../logger";
// import { embeddingOpenAIRequest } from "./ai-request.util";
//
// export const getTextEmbedding = async (inputText: string) => {
//   try {
//     const start = Date.now();
//     const embedding = await embeddingOpenAIRequest(inputText);
//     const duration = Date.now() - start;
//     logger.chat_response(
//       `[OPENAI-GetTextEmbedding], response time: ${duration} `,
//     );
//     return embedding;
//   } catch (error) {
//     logger.error("Error in getTextEmbedding utils:", error);
//     logger.chat_error(
//       `[OPENAI-GetTextEmbedding], response time: "Error in getTextEmbedding utils:"`,
//       error,
//     );
//     throw new Error("Failed to Get Text Embedding response");
//   }
// };

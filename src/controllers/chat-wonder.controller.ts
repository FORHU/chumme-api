import { NextFunction, Request, Response } from "express";
import Joi from "joi";
import { BadRequestError, InternalServerError } from "../utils/error.util";
import ChatWonderSvc from "../services/chat-wonder.service";
import logger from "../utils/logger";
import ChatSvc from "../services/chat.service";
import { streamChat } from "../utils/chat-wonder-stream";
import { parseChatWonderResponse } from "../utils/chat-wonder";
import { stripSourcesPrefix } from "../utils/chat-wonder/source-metadata.util";
import { searchDbVideosFromSourceMetadata } from "../utils/chat-wonder/db-video-lookup.util";
import { detectVideoIntent } from "../utils/openai/detect-video-intent.util";
import { ParsedVideo } from "../utils/chat-wonder/parse-response.util";
import YouTubeService from "../services/net-communities/youtube.service";
import CacheUtil from "../utils/cache.util";

export default class ChatWonderCtrl {
  static async sendChat(req: Request, res: Response, next: NextFunction) {
    const { input, conversationId } = req.body;
    const { id: userId } = req.user;

    if (!userId) {
      return next(
        new InternalServerError("Authenticated user not found in request"),
      );
    }

    const schema = Joi.object({
      input: Joi.string().min(1).max(500).required(),
      conversationId: Joi.string().optional(),
    });

    const { error } = schema.validate(req.body);

    if (error) {
      return next(new BadRequestError(error.message));
    }

    try {
      const result = await ChatWonderSvc.sendChat(
        input,
        userId,
        conversationId,
      );
      // Debug: see the final parsed response payload returned to the app
      console.log("[ChatWonderCtrl.sendChat] response:", {
        message: result?.message,
        videosCount: result?.videos?.length ?? 0,
        sourceMetadataCount: result?.source_metadata?.length ?? 0,
      });
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async streamChat(req: Request, res: Response, next: NextFunction) {
    const { input, conversationId: inputConversationId, persona } = req.body;
    const { id: userId } = req.user;

    if (!userId) {
      return next(
        new InternalServerError("Authenticated user not found in request"),
      );
    }

    const schema = Joi.object({
      input: Joi.string().min(1).max(500).required(),
      conversationId: Joi.string().optional(),
      persona: Joi.string().optional().allow(null, ""),
    });

    const { error } = schema.validate(req.body);

    if (error) {
      return next(new BadRequestError(error.message));
    }

    try {
      // Ensure conversation exists
      const conversationId = await ChatSvc.ensureConversation(
        input,
        userId,
        inputConversationId,
      );

      // Generate session ID
      const chatSessionId =
        (await ChatWonderSvc.generateChatSessionId(userId)) ?? "";

      // Build prompt with chumme format
      const chummePrompt = await ChatWonderSvc.additionalPrompt(input);

      // Save user message before streaming
      const chatMessage = await ChatSvc.saveUserMessage(
        input,
        userId,
        conversationId,
      );

      // Set headers for Server-Sent Events (SSE)
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

      let fullResponse = "";

      let currentSessionId = chatSessionId;
      const maxRetries = 2;
      let retryCount = 0;

      while (retryCount < maxRetries) {
        try {
          // Stream from chat-wonder-api
          await streamChat(chummePrompt, currentSessionId, persona, {
            onChunk: (chunk: string) => {
              fullResponse += chunk;
              // Send chunk as SSE
              res.write(
                `data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`,
              );
              // Flush to ensure immediate delivery
              if (typeof (res as any).flush === "function") {
                (res as any).flush();
              }
            },
            onComplete: async () => {
              try {
                logger.info(
                  "[CHAT-WONDER-STREAM] Stream completed, parsing and saving AI response",
                );

                // Strip Wonder [Sources] prefix before JSON parse
                const { cleaned, sourceMetadata } =
                  stripSourcesPrefix(fullResponse);
                const parsedResponse = parseChatWonderResponse(cleaned);

                // Only fetch videos if the user actually wants media content
                const wantsVideo = await detectVideoIntent(input);

                let mergedVideos: ParsedVideo[] = [];
                if (wantsVideo) {
                  // 1. Check internal DB first using source_metadata
                  const { dbVideos } = await searchDbVideosFromSourceMetadata(sourceMetadata, userId);
                  mergedVideos = dbVideos;

                  // 2. If DB has nothing, search YouTube directly with the user's actual message
                  if (mergedVideos.length === 0) {
                    logger.info(`[CHAT-WONDER-STREAM] No DB videos found — searching YouTube directly for: "${input}"`);
                    try {
                      const results = await YouTubeService.searchVideos(input, 1);
                      const first = results[0];
                      const videoId = first?.id?.videoId;
                      if (videoId) {
                        mergedVideos = [{
                          title: first.snippet?.title ?? "YouTube Video",
                          artist: first.snippet?.channelTitle ?? null,
                          url: `https://www.youtube.com/watch?v=${videoId}`,
                        }];
                      }
                    } catch (ytErr: any) {
                      logger.warn(`[CHAT-WONDER-STREAM] Direct YouTube search failed: ${ytErr?.message}`);
                    }
                  }
                } else {
                  logger.info(`[CHAT-WONDER-STREAM] No video intent for: "${input}" — skipping video fetch`);
                }
                const { raw, ...cleanResponse } = parsedResponse;

                // Debug: show final parsed payload (keep it lightweight)
                console.log("[ChatWonderCtrl.streamChat.onComplete] parsed:", {
                  message: cleanResponse?.message,
                  videosCount: mergedVideos?.length ?? 0,
                  sourceMetadataCount: Array.isArray(sourceMetadata)
                    ? sourceMetadata.length
                    : 0,
                });

                // Debug: show raw payload we received from ChatWonder (truncated)
                const preview = (s: string | undefined, max = 1200) => {
                  if (!s) return "";
                  if (s.length <= max) return s;
                  return `${s.slice(0, max)}...<truncated>`;
                };
                console.log(
                  "[ChatWonderCtrl.streamChat.onComplete] raw payload preview:",
                  {
                    fullResponseLength:
                      typeof fullResponse === "string"
                        ? fullResponse.length
                        : 0,
                    cleanedLength:
                      typeof cleaned === "string" ? cleaned.length : 0,
                    fullResponsePreview: preview(fullResponse),
                    cleanedPreview: preview(cleaned),
                    parsedRawPreview: preview(raw),
                  },
                );

                // Save AI response (parsed message)
                const aiResponse = await ChatSvc.saveAIMessage(
                  input,
                  parsedResponse.message,
                  userId,
                  conversationId,
                );

                // Clear cache
                await CacheUtil.delByPattern(`chat:list:${userId}:*`);

                // Send completion event with parsed data and metadata
                res.write(
                  `data: ${JSON.stringify({
                    type: "complete",
                    ...cleanResponse,
                    videos: mergedVideos,
                    source_metadata: sourceMetadata,
                    metadata: {
                      conversationId,
                      chatMessageId: chatMessage.id,
                      aiResponseId: aiResponse.id,
                      chatSessionId: currentSessionId,
                    },
                  })}\n\n`,
                );
                res.end();
              } catch (err: any) {
                logger.error(
                  `[CHAT-WONDER-STREAM] Error saving response: ${err.message}`,
                );
                res.write(
                  `data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`,
                );
                res.end();
              }
            },
            onError: (error: Error) => {
              // Do not throw here. The streamChat function also calls reject(error)
              // which will be caught by the await in the try-catch block.
              logger.warn(
                `[CHAT-WONDER-STREAM] error callback received: ${error.message}`,
              );
            },
          });

          // If we get here, stream started successfully (though completion is async callback)
          // Ideally streamChat only resolves on close/error, so we can break loop
          break;
        } catch (error: any) {
          const errMessage = error?.message || "";

          // Check if error is related to session
          if (
            (errMessage.includes("Unknown session") ||
              errMessage.includes("401") ||
              errMessage.includes("session_id")) &&
            retryCount < maxRetries - 1
          ) {
            logger.warn(
              `[CHAT-WONDER-STREAM] Session error: ${errMessage}. Regenerating session and retrying... (${retryCount + 1}/${maxRetries})`,
            );

            // regenerate session id
            const cachedKey = `chat:sessionId:${userId}`;
            await CacheUtil.del(cachedKey);
            currentSessionId =
              (await ChatWonderSvc.generateChatSessionId(userId)) || "";

            // Reset response buffer for retry
            fullResponse = "";

            retryCount++;
            continue;
          }

          logger.error(
            `[CHAT-WONDER-STREAM] Controller error: ${error?.message}`,
          );
          if (!res.headersSent) {
            res.status(500).json({ error: error?.message || "Stream failed" });
          } else {
            res.write(
              `data: ${JSON.stringify({ type: "error", message: error?.message })}\n\n`,
            );
            res.end();
          }
          break; // Exit loop on non-retryable error
        }
      }
    } catch (error: any) {
      logger.error(`[CHAT-WONDER-STREAM] Controller error: ${error?.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: error?.message || "Stream failed" });
      } else {
        res.write(
          `data: ${JSON.stringify({ type: "error", message: error?.message })}\n\n`,
        );
        res.end();
      }
    }
  }
}

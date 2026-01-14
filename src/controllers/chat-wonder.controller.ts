import { NextFunction, Request, Response } from "express";
import Joi from "joi";
import { BadRequestError, InternalServerError } from "../utils/error.util";
import ChatWonderSvc from "../services/chat-wonder.service";
import logger from "../utils/logger";
import ChatSvc from "../services/chat.service";
import { streamChat } from "../utils/chat-wonder-stream";
import { parseChatWonderResponse } from "../utils/chat-wonder";
import CacheUtil from "../utils/cache.util";

export default class ChatWonderCtrl {
  static async sendChat(req: Request, res: Response, next: NextFunction) {
    const { input, conversationId } = req.body;
    const { id: userId } = req.user;

    if (!userId) {
      return next(
        new InternalServerError("Authenticated user not found in request")
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
        conversationId
      );
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async streamChat(req: Request, res: Response, next: NextFunction) {
    const { input, conversationId: inputConversationId } = req.body;
    const { id: userId } = req.user;

    if (!userId) {
      return next(
        new InternalServerError("Authenticated user not found in request")
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
      // Ensure conversation exists
      const conversationId = await ChatSvc.ensureConversation(
        input,
        userId,
        inputConversationId
      );

      // Generate session ID
      const chatSessionId =
        (await ChatWonderSvc.generateChatSessionId(userId)) ?? "";

      // Build prompt with chumme format
      const chummePrompt = await ChatWonderSvc["additionalPrompt"](input);

      // Save user message before streaming
      const chatMessage = await ChatSvc.saveUserMessage(
        input,
        userId,
        conversationId
      );

      // Set headers for Server-Sent Events (SSE)
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

      let fullResponse = "";

      // Stream from chat-wonder-api
      await streamChat(chummePrompt, chatSessionId, {
        onChunk: (chunk: string) => {
          fullResponse += chunk;
          // Send chunk as SSE
          res.write(
            `data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`
          );
          // Flush to ensure immediate delivery
          if (typeof (res as any).flush === "function") {
            (res as any).flush();
          }
        },
        onComplete: async () => {
          try {
            logger.info(
              "[CHAT-WONDER-STREAM] Stream completed, saving AI response"
            );

            // Parse the full response using the parser
            const parsedResponse = parseChatWonderResponse(fullResponse);
            const { raw, ...cleanResponse } = parsedResponse;

            // Save AI response (just the parsed message)
            const aiResponse = await ChatSvc.saveAIMessage(
              input,
              parsedResponse.message,
              userId,
              conversationId
            );

            // Clear cache
            await CacheUtil.delByPattern(`chat:list:${userId}:*`);

            // Send completion event with parsed data
            res.write(
              `data: ${JSON.stringify({
                type: "complete",
                ...cleanResponse,
                metadata: {
                  conversationId,
                  chatMessageId: chatMessage.id,
                  aiResponseId: aiResponse.id,
                  chatSessionId,
                },
              })}\n\n`
            );
            res.end();
          } catch (err: any) {
            logger.error(
              `[CHAT-WONDER-STREAM] Error saving response: ${err.message}`
            );
            res.write(
              `data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`
            );
            res.end();
          }
        },
        onError: (error: Error) => {
          logger.error(`[CHAT-WONDER-STREAM] Stream error: ${error.message}`);
          res.write(
            `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`
          );
          res.end();
        },
      });
    } catch (error: any) {
      logger.error(`[CHAT-WONDER-STREAM] Controller error: ${error?.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: error?.message || "Stream failed" });
      } else {
        res.write(
          `data: ${JSON.stringify({ type: "error", message: error?.message })}\n\n`
        );
        res.end();
      }
    }
  }
}

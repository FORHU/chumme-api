import { Prisma } from "@prisma/client";
import { BadRequestError, InternalServerError } from "../utils/error.util";
import logger from "../utils/logger";
import CacheUtil from "../utils/cache.util";

import {
  sendChat as sendChatWithChatWonder,
  getSessionId as getSessionIdWithChatWonder,
} from "../utils/chat-wonder-api";
import { parseChatWonderResponse } from "../utils/chat-wonder";
import { searchDbVideosFromSourceMetadata } from "../utils/chat-wonder/db-video-lookup.util";
import { detectVideoIntent } from "../utils/openai/detect-video-intent.util";
import { ParsedVideo } from "../utils/chat-wonder/parse-response.util";
import YouTubeService from "./net-communities/youtube.service";
import ChatSvc from "./chat.service";

export default class ChatWonderSvc {
  static async sendChat(
    inputText: string,
    userId: string,
    conversationId?: string,
  ) {
    // Validation
    if (!inputText || !inputText.trim()) {
      throw new BadRequestError("Input text cannot be empty");
    }
    if (!userId || !userId.trim()) {
      throw new BadRequestError("User ID is required");
    }

    try {
      conversationId = await ChatSvc.ensureConversation(
        inputText,
        userId,
        conversationId,
      );
      const chatSessionId = (await this.generateChatSessionId(userId)) ?? "";

      return this.handleNormalChat(
        inputText,
        userId,
        conversationId,
        chatSessionId,
      );
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        logger.error(`Database error: ${error?.message}`);
        throw new InternalServerError(`Database error: ${error?.message}`);
      }
      logger.error(`[CHAT.SERVICE] sendChat Error: ${error?.message}`);
      throw error;
    }
  }

  static async generateChatSessionId(userId: string) {
    try {
      // set/get chatSessionId from redis cache
      let chatSessionId = "";
      const cachedKey = `chat:sessionId:${userId}`;
      chatSessionId = (await CacheUtil.get(cachedKey)) ?? "";
      if (!chatSessionId) {
        const res = await getSessionIdWithChatWonder();
        const newSessionId = res?.session_id || "";
        chatSessionId = newSessionId;
        await CacheUtil.set(cachedKey, newSessionId, 24 * 60 * 60);
        logger.info(
          `[CHAT.WONDER.SERVICE] Generated new chatSessionId: ${chatSessionId}`,
        );
      }
      return chatSessionId;
    } catch (error: any) {
      const errMessage = error?.message;
      logger.error(
        `[CHAT.WONDER.SERVICE] generateChatSessionId Error: ${errMessage}`,
      );
    }
  }

  private static async handleNormalChat(
    inputText: string,
    userId: string,
    conversationId: string,
    chatSessionId: string,
  ) {
    let finalChatResponse = "";
    let currentSessionId = chatSessionId;
    const maxRetries = 2;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const chumeePrompt = await this.additionalPrompt(inputText);
        const chatWonderResObject = await sendChatWithChatWonder({
          user_input: chumeePrompt,
          user_history_select: "",
          session_id: currentSessionId,
        });
        logger.info(`[CHAT.WONDER.SERVICE] ChatWonder response received`);
        finalChatResponse = chatWonderResObject?.response || "";
        const sourceMetadata = Array.isArray(
          chatWonderResObject?.source_metadata,
        )
          ? chatWonderResObject.source_metadata
          : [];
        // Parse and normalize the response
        const parsedResponse = parseChatWonderResponse(finalChatResponse);

        // Only fetch videos if the user actually wants media content
        const wantsVideo = await detectVideoIntent(inputText);

        let mergedVideos: ParsedVideo[] = [];
        if (wantsVideo) {
          // 1. Check internal DB first using source_metadata
          const { dbVideos } = await searchDbVideosFromSourceMetadata(sourceMetadata, userId);
          mergedVideos = dbVideos;

          // 2. If DB has nothing, search YouTube directly with the user's actual message
          if (mergedVideos.length === 0) {
            logger.info(`[CHAT.WONDER.SERVICE] No DB videos found — searching YouTube directly for: "${inputText}"`);
            try {
              const results = await YouTubeService.searchVideos(inputText, 1);
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
              logger.warn(`[CHAT.WONDER.SERVICE] Direct YouTube search failed: ${ytErr?.message}`);
            }
          }
        } else {
          logger.info(`[CHAT.WONDER.SERVICE] No video intent detected for: "${inputText}" — skipping video fetch`);
        }
        // Save user message
        const chatMessage = await ChatSvc.saveUserMessage(
          inputText,
          userId,
          conversationId,
        );

        // Save AI response (just the message part)
        const aiResponse = await ChatSvc.saveAIMessage(
          inputText,
          parsedResponse.message,
          userId,
          conversationId,
        );

        await CacheUtil.delByPattern(`chat:list:${userId}:*`);

        // Use AI-generated videos from parsed response + YouTube intent from source_metadata
        const { ...cleanResponse } = parsedResponse;

        return {
          message: cleanResponse.message,
          emotion_data: cleanResponse.emotion_data,
          videos: mergedVideos,
          artist: cleanResponse.artist || [],
          images: cleanResponse.images || [],
          source_metadata: sourceMetadata,
          conversationId,
          chatMessageId: chatMessage.id,
          aiResponseId: aiResponse.id,
          chatSessionId: currentSessionId,
        };
      } catch (error: any) {
        const errMessage = error?.message;
        const errStatus = error?.status;
        logger.error(
          `[CHAT.WONDER.SERVICE] Chat Wonder API Error: ${errMessage} (status: ${errStatus})`,
        );
        if (
          (errStatus === 401 || errMessage.toLowerCase().includes("401")) &&
          retryCount < maxRetries - 1
        ) {
          // regenerate session id and retry
          const cachedKey = `chat:sessionId:${userId}`;
          await CacheUtil.del(cachedKey);
          currentSessionId = (await this.generateChatSessionId(userId)) || "";
          retryCount++;
          logger.warn(
            `[CHAT.WONDER.SERVICE] Retrying sendChat with new session id. Attempt ${retryCount + 1}`,
          );
        }
      }
    }

    // If we exhausted retries without success, throw error
    throw new BadRequestError(
      "Failed to get response from ChatWonder after retries",
    );
  }

  public static async additionalPrompt(userMessage: string) {
    return `RESPOND WITH ONLY VALID JSON. NO text before or after. NO markdown code fences. NO explanation.
{
  "message": "Your casual reply here with natural emojis",
  "videos": [
    { "title": "Video title", "artist": "Artist name", "url": "" }
  ],
  "artist": [
    { "name": "Artist name", "image": null }
  ],
  "images": []
}
Leave "url" as empty string — video URLs will be resolved separately.

IMPORTANT RULES FOR "videos":
- Only include videos if the user is EXPLICITLY asking for music, videos, songs, or entertainment content (e.g. "play me a song", "show me a video", "recommend something to watch", "give me hype music").
- For ALL other messages — greetings, questions about you, venting, general chat, emotional support, etc. — set "videos": [] and "artist": [].
- When in doubt, return "videos": [].

USER: ${userMessage}`;
  }
}

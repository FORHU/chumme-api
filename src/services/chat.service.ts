import {
  determineVideoEmotions,
  mapEmotionToDatabase,
  detectCrisis,
  generateCrisisResponse,
} from "../utils/emotion";
import {
  defaultOpenAIRequest,
  composePrompt,
  getTextEmbedding,
  fetchVideoRecommendation,
  detectEmotion,
  detectLanguage,
  detectSpecificSong,
} from "../utils/openai";
import ChatRepo, {
  TGetChatMessagesByUserIdOptions,
} from "../repositories/chat.repository";
import EmotionRepo from "../repositories/emotion.repository";
import EmbeddingSvc from "./embedding.service";
import { Prisma } from "@prisma/client";
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
} from "../utils/error.util";
import logger from "../utils/logger";
import CacheUtil from "../utils/cache.util";
import ConversationSvc from "./conversation.service";
import { getTimeStamp } from "../utils/helpers";

export default class ChatSvc {
  static async sendChat(
    inputText: string,
    userId: string,
    conversationId?: string
  ) {
    if (!inputText || !inputText.trim()) {
      throw new BadRequestError("Input text cannot be empty");
    }
    if (!userId || !userId.trim()) {
      throw new BadRequestError("User ID is required");
    }

    try {
      let conversation = null;
      // TODO
      // 1. check if user passes conversationID
      if (conversationId) {
        conversation = await ConversationSvc.getConversationById(
          conversationId,
          userId
        );
      } else {
        const conversationData = await ConversationSvc.createConversation(
          userId,
          `${getTimeStamp()}`
        );
        conversationId = conversationData.id;
      }

      const emotionResult = await detectEmotion(inputText);
      const { emotion, confidence } = emotionResult || {};

      // Get text embedding for the input
      const embedding = await getTextEmbedding(inputText);

      // Get chat history FIRST (needed for both crisis and normal flow)
      const chatHistoryArrayResponse = await this.getChatListByUserId(userId, {
        limit: 10,
        page: 1,
        excludeNeutral: true,
      });
      const chatHistoryArray = chatHistoryArrayResponse?.data || [];

      // RAG: Find similar messages from the past
      const similarMessages = await EmbeddingSvc.findSimilarMessages(
        embedding,
        userId,
        5
      );

      // Filter out messages that are already in the recent history to avoid duplicates
      const recentMessageIds = new Set(chatHistoryArray.map((m: any) => m.id));
      const relevantHistory = similarMessages
        .filter((item) => !recentMessageIds.has(item.chatMessageId))
        .map((item) => item.chatMessage)
        .filter((msg) => msg !== null);

      if (relevantHistory.length > 0) {
        logger.info(
          `[RAG] Found ${relevantHistory.length} relevant past messages for context.`
        );
      }

      // CRITICAL: Check for crisis situation
      const isCrisis = detectCrisis(emotion, inputText, confidence);

      if (isCrisis) {
        logger.warn(
          `[CHAT-SERVICE] ⚠️ CRISIS DETECTED - Providing emergency resources`
        );

        // Generate crisis response
        const crisisResponse = generateCrisisResponse("US"); // TODO: Detect user locale

        // Save the user message with embedding
        const chatMessage = await ChatRepo.createChatMessage({
          message: inputText,
          User: { connect: { id: userId } },
          role: "USER",
          conversation: conversationId
            ? { connect: { id: conversationId } } // existing conversation
            : {
                create: {
                  title: `${getTimeStamp()}`, // new Conversation
                  user: { connect: { id: userId } },
                },
              },
        });

        // Save embedding for crisis message
        await EmbeddingSvc.createEmbedding(
          "text-embedding-3-small",
          embedding,
          chatMessage.id
        );

        // Save AI crisis response
        const aiResponse = await ChatRepo.createChatMessage({
          message: crisisResponse,
          User: { connect: { id: userId } },
          role: "AI",
          conversation: conversationId
            ? { connect: { id: conversationId } } // existing conversation
            : {
                create: {
                  title: `${getTimeStamp()}`, // new Conversation
                  user: { connect: { id: userId } },
                },
              },
        });

        await CacheUtil.delByPattern(`chat:list:${userId}:*`);

        // Return crisis response WITHOUT video recommendation
        return {
          response: crisisResponse,
          emotion_data: {
            ...emotionResult,
            crisis: true, // Flag for frontend
          },
          chatMessageId: chatMessage.id,
          emotionMemoryId: null,
          aiResponseId: aiResponse.id,
          video: null, // No video in crisis situations
        };
      }

      let chatMessage = null;
      let emotionMemory = null;
      let aiResponse = null;

      // Detect language (for non-English support)
      const detectedLanguage = await detectLanguage(inputText);
      if (detectedLanguage) {
        logger.info(
          `[CHAT-SERVICE] Non-English language detected: ${detectedLanguage}`
        );
      }

      // Detect specific song request
      const specificSong = await detectSpecificSong(inputText);
      if (specificSong.songTitle) {
        logger.info(
          `[CHAT-SERVICE] Specific song requested: "${specificSong.songTitle}"${specificSong.artist ? ` by ${specificSong.artist}` : ""}`
        );
      }

      // Get all available emotions from database
      const dbEmotions = await EmotionRepo.getAllEmotions();
      const emotionNames = dbEmotions.map((e) => e.name);

      logger.info(
        `[CHAT-SERVICE] Available emotions in DB: ${emotionNames.join(", ")}`
      );
      logger.info(
        `[CHAT-SERVICE] Detected emotion from AI: "${emotion}" (confidence: ${confidence})`
      );

      // Map detected emotion to database emotion if needed
      const { mappedEmotion, wasMapping, originalEmotion } =
        await mapEmotionToDatabase(emotion, emotionNames);

      if (wasMapping) {
        logger.info(
          `[CHAT-SERVICE] Emotion mapped: "${originalEmotion}" → "${mappedEmotion}"`
        );
      }

      // Determine which emotions to use for video search (counter-emotion logic)
      const { primaryEmotions, fallbackEmotions, strategy } =
        await determineVideoEmotions(
          mappedEmotion, // Use mapped emotion instead of original
          confidence,
          emotionNames,
          inputText
        );

      logger.info(
        `[CHAT-SERVICE] Emotion strategy: ${strategy}, Primary: [${primaryEmotions.join(", ")}], Fallback: [${fallbackEmotions.join(", ")}]`
      );

      // Fetch video recommendation based on primary emotions
      // Pass chat history for context (to remember previous artist preferences)
      let result = await fetchVideoRecommendation(
        inputText,
        primaryEmotions,
        confidence,
        userId,
        chatHistoryArray // Pass conversation context
      );

      // If no video found with primary emotions, try fallback emotions
      if (!result.video && fallbackEmotions.length > 0) {
        logger.info(
          `[CHAT-SERVICE] No videos found with primary emotions, trying fallback`
        );
        result = await fetchVideoRecommendation(
          inputText,
          fallbackEmotions,
          confidence,
          userId,
          chatHistoryArray // Pass conversation context
        );
      }

      const selectedVideo = result.video;
      let videoMetadata = result.metadata || {};

      // Add language mismatch to metadata if detected
      if (detectedLanguage) {
        videoMetadata = {
          ...videoMetadata,
          languageMismatch: detectedLanguage,
        };
      }

      // Add specific song request to metadata if no video found
      if (specificSong.songTitle && !selectedVideo) {
        videoMetadata = {
          ...videoMetadata,
          specificSongNotFound: specificSong,
        };
      }

      const prompt = composePrompt(
        inputText,
        mappedEmotion,
        confidence,
        chatHistoryArray,
        relevantHistory as any[], // Pass RAG context
        selectedVideo,
        videoMetadata
      );

      const start = Date.now();
      const finalChatResponse = await defaultOpenAIRequest(prompt, {
        role: "user",
        temperature: 0.7,
        maxTokens: 800,
      });
      const duration = Date.now() - start;
      logger.chat_response(
        `[OPENAI-InputResponse], response time: ${duration} `
      );

      if (!finalChatResponse || typeof finalChatResponse !== "string") {
        logger.chat_error(
          `[OPENAI-InputResponse], Error: Invalid response from AI, expecting a string`
        );
        throw new InternalServerError(
          "[ChatSvc.sendChat], Invalid response from AI, expecting a string"
        );
      }

      chatMessage = await ChatRepo.createChatMessage({
        message: inputText,
        User: { connect: { id: userId } },
        role: "USER",
        conversation: conversationId
          ? { connect: { id: conversationId } } // existing conversation
          : {
              create: {
                title: `${getTimeStamp()}`, // new Conversation
                user: { connect: { id: userId } },
              },
            },
      });

      aiResponse = await ChatRepo.createChatMessage({
        message: finalChatResponse,
        User: { connect: { id: userId } },
        role: "AI",
        conversation: conversationId
          ? { connect: { id: conversationId } } // existing conversation
          : {
              create: {
                title: `${getTimeStamp()}`, // new Conversation
                user: { connect: { id: userId } },
              },
            },
      });

      await EmbeddingSvc.createEmbedding(
        "text-embedding-3-small",
        embedding,
        chatMessage.id
      );

      await CacheUtil.delByPattern(`chat:list:${userId}:*`);

      emotionMemory = await ChatRepo.createEmotionMemory({
        emotion: mappedEmotion, // Store mapped emotion for consistency with DB
        confidence,
        ChatMessage: { connect: { id: chatMessage.id } },
        User: { connect: { id: userId } },
      });

      return {
        response: finalChatResponse,
        emotion_data: {
          ...emotionResult,
          mappedEmotion: wasMapping ? mappedEmotion : undefined, // Include mapping info
          wasMapped: wasMapping,
        },
        chatMessageId: chatMessage?.id || null,
        emotionMemoryId: emotionMemory?.id || null,
        aiResponseId: aiResponse?.id || null,
        video: selectedVideo,
      };
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        logger.error(`Database error: ${error?.message}`);
        throw new InternalServerError(`Database error: ${error?.message}`);
      }
      logger.error(`[CHAT.SERVICE] sendChat Error: ${error?.message}`);
      throw error;
    }
  }

  static async getChatMessageById(
    chatMessageId: string,
    currentUserId: string
  ) {
    const cachedKey = `chat:message:${currentUserId}`;
    const cache = await CacheUtil.get(cachedKey);
    if (cache) {
      return cache;
    }

    if (!chatMessageId || !chatMessageId.trim()) {
      throw new BadRequestError("Chat Message ID is required");
    }

    try {
      const chatMessage = await ChatRepo.getChatMessageById(
        chatMessageId,
        currentUserId
      );
      if (!chatMessage) {
        throw new NotFoundError("Chat message not found");
      }
      await CacheUtil.set(cachedKey, chatMessage);
      return chatMessage;
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new InternalServerError(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  static async getChatListByUserId(
    currentUserId: string,
    options: TGetChatMessagesByUserIdOptions
  ) {
    const cachedKey = `chat:list:${currentUserId}:role:${options.role || "ALL"}:page:${options.page || 1}`;

    const cached = await CacheUtil.get(cachedKey);
    if (cached) {
      return cached;
    }

    try {
      const list = await ChatRepo.getChatListByUserId(currentUserId, options);
      await CacheUtil.set(cachedKey, list);
      return list;
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientInitializationError) {
        throw new InternalServerError(`Database error: ${error.message}`);
      }
      throw error;
    }
  }
}

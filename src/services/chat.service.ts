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
import { sendChat } from "../utils/chat-wonder-api";

// ========================================
// INTERNAL TYPES FOR CHAT PROCESSING
// ========================================

/**
 * Context gathered from initial parallel detection operations
 */
interface ChatContext {
  emotion: string;
  confidence: number;
  emotionResult: any;
  embedding: number[];
  dbEmotions: any[];
  emotionNames: string[];
  chatHistoryArray: any[];
  similarMessages: any[];
}

/**
 * Additional context from language and song detection
 */
interface AdditionalContext {
  detectedLanguage: string | null;
  specificSong: { songTitle: string | null; artist?: string | null };
  shouldDetectLanguage: boolean;
  shouldDetectSong: boolean;
}

/**
 * Video recommendation result with metadata
 */
interface VideoResult {
  video: any | null;
  metadata?: any;
  mappedEmotion?: string;
  wasMapping?: boolean;
  originalEmotion?: string;
}

export default class ChatSvc {
  /**
   * Helper to get conversation connect object for Prisma
   * Reduces code duplication across message creation calls
   */
  private static getConversationConnect(
    inputText?: string,
    conversationId?: string,
    userId?: string
  ) {
    if (conversationId) {
      return { connect: { id: conversationId } };
    }
    // Only create new conversation if userId is provided
    if (userId) {
      return {
        create: {
          title: inputText,
          user: { connect: { id: userId } },
        },
      };
    }
    return undefined;
  }

  // ========================================
  // PRIVATE HELPERS - SETUP
  // ========================================

  /**
   * Ensures a conversation exists, either by validating existing ID or creating new one
   */
   static async ensureConversation(
    inputText: string,
    userId: string,
    conversationId?: string
  ): Promise<string> {
    if (conversationId) {
      await ConversationSvc.getConversationById(conversationId, userId);
      return conversationId;
    }

    const conversationData = await ConversationSvc.createConversation(
      userId,
      inputText
    );
    return conversationData.id;
  }

  // ========================================
  // PRIVATE HELPERS - CONTEXT DETECTION
  // ========================================

  /**
   * Detects all context needed for chat in parallel
   * - Emotion detection
   * - Embedding generation
   * - DB emotions fetch
   * - Chat history (conversation-scoped)
   * - RAG similar messages
   */
  private static async detectChatContext(
    inputText: string,
    userId: string,
    conversationId: string
  ): Promise<ChatContext> {
    // Execute all independent operations in parallel
    const [emotionResult, embedding, dbEmotions] = await Promise.all([
      detectEmotion(inputText),
      getTextEmbedding(inputText),
      EmotionRepo.getAllEmotions(),
    ]);

    const { emotion, confidence } = emotionResult || {};
    const emotionNames = dbEmotions.map((e) => e.name);

    // Get conversation-scoped chat history
    const chatHistoryArrayResponse = conversationId
      ? await ChatRepo.getMessagesByConversationId(conversationId, userId, {
          limit: 10,
          page: 1,
          sortOrder: "desc",
        })
      : { data: [] };
    const chatHistoryArray = chatHistoryArrayResponse?.data || [];

    // RAG: Find similar messages (conversation-scoped)
    const similarMessages = await EmbeddingSvc.findSimilarMessages(
      embedding,
      userId,
      5,
      conversationId
    );

    return {
      emotion,
      confidence,
      emotionResult,
      embedding,
      dbEmotions,
      emotionNames,
      chatHistoryArray,
      similarMessages,
    };
  }

  /**
   * Detects additional context (language and song intent) in parallel
   * Only runs when needed based on input characteristics
   */
  private static async detectAdditionalContext(
    inputText: string
  ): Promise<AdditionalContext> {
    const hasNonEnglishChars = /[^\x00-\x7F]/.test(inputText);
    const shouldDetectLanguage = hasNonEnglishChars || inputText.length > 200;
    const shouldDetectSong = /song|music|track|play|send|show|video/i.test(
      inputText
    );

    const [detectedLanguage, specificSong] = await Promise.all([
      shouldDetectLanguage ? detectLanguage(inputText) : Promise.resolve(null),
      shouldDetectSong
        ? detectSpecificSong(inputText)
        : Promise.resolve({ songTitle: null }),
    ]);

    if (detectedLanguage) {
      logger.info(
        `[CHAT-SERVICE] Non-English language detected: ${detectedLanguage}`
      );
    }

    if (specificSong.songTitle) {
      logger.info(
        `[CHAT-SERVICE] Specific song requested: "${specificSong.songTitle}"${specificSong.artist ? ` by ${specificSong.artist}` : ""}`
      );
    }

    return {
      detectedLanguage,
      specificSong,
      shouldDetectLanguage,
      shouldDetectSong,
    };
  }

  // ========================================
  // PRIVATE HELPERS - VIDEO PROCESSING
  // ========================================

  /**
   * Processes video recommendation logic
   * - Maps emotions
   * - Determines video emotions (counter-emotion strategy)
   * - Fetches recommendation
   * - Adds metadata
   */
  private static async processVideoRecommendation(
    inputText: string,
    userId: string,
    context: ChatContext,
    additionalContext: AdditionalContext
  ): Promise<VideoResult> {
    logger.info(
      `[CHAT-SERVICE] Available emotions in DB: ${context.emotionNames.join(", ")}`
    );
    logger.info(
      `[CHAT-SERVICE] Detected emotion from AI: "${context.emotion}" (confidence: ${context.confidence})`
    );

    // Map detected emotion to database emotion
    const { mappedEmotion, wasMapping, originalEmotion } =
      await mapEmotionToDatabase(context.emotion, context.emotionNames);

    if (wasMapping) {
      logger.info(
        `[CHAT-SERVICE] Emotion mapped: "${originalEmotion}" → "${mappedEmotion}"`
      );
    }

    // Determine video emotions (counter-emotion logic)
    const { primaryEmotions, fallbackEmotions, strategy } =
      await determineVideoEmotions(
        mappedEmotion,
        context.confidence,
        context.emotionNames,
        inputText
      );

    logger.info(
      `[CHAT-SERVICE] Emotion strategy: ${strategy}, Primary: [${primaryEmotions.join(", ")}], Fallback: [${fallbackEmotions.join(", ")}]`
    );

    // Fetch video recommendation
    let result = await fetchVideoRecommendation(
      inputText,
      primaryEmotions,
      context.confidence,
      userId,
      context.chatHistoryArray
    );

    // Try fallback emotions if needed
    if (!result.video && fallbackEmotions.length > 0) {
      logger.info(
        `[CHAT-SERVICE] No videos found with primary emotions, trying fallback`
      );
      result = await fetchVideoRecommendation(
        inputText,
        fallbackEmotions,
        context.confidence,
        userId,
        context.chatHistoryArray
      );
    }

    // Add metadata
    let videoMetadata = result.metadata || {};

    if (additionalContext.detectedLanguage) {
      videoMetadata = {
        ...videoMetadata,
        languageMismatch: additionalContext.detectedLanguage,
      };
    }

    if (additionalContext.specificSong.songTitle && !result.video) {
      videoMetadata = {
        ...videoMetadata,
        specificSongNotFound: additionalContext.specificSong,
      };
    }

    return {
      video: result.video,
      metadata: videoMetadata,
      mappedEmotion,
      wasMapping,
      originalEmotion,
    };
  }

  // ========================================
  // PRIVATE HELPERS - AI RESPONSE
  // ========================================

  /**
   * Generates AI response with full context
   * - Composes prompt with RAG context
   * - Calls OpenAI
   * - Returns response
   */
  private static async generateAIResponse(
    inputText: string,
    context: ChatContext,
    videoResult: VideoResult
  ): Promise<string> {
    // Filter out duplicate messages from RAG
    const recentMessageIds = new Set(
      context.chatHistoryArray.map((m: any) => m.id)
    );
    const relevantHistory = context.similarMessages
      .filter((item) => !recentMessageIds.has(item.chatMessageId))
      .map((item) => item.chatMessage)
      .filter((msg) => msg !== null);

    if (relevantHistory.length > 0) {
      logger.info(
        `[RAG] Found ${relevantHistory.length} relevant past messages for context.`
      );
    }

    const prompt = composePrompt(
      inputText,
      videoResult.mappedEmotion || context.emotion,
      context.confidence,
      context.chatHistoryArray,
      relevantHistory as any[],
      videoResult.video,
      videoResult.metadata
    );

    const start = Date.now();
    const finalChatResponse = await defaultOpenAIRequest(prompt, {
      role: "user",
      temperature: 0.7,
      maxTokens: 800,
    });
    const duration = Date.now() - start;

    logger.chat_response(`[OPENAI-InputResponse], response time: ${duration}`);

    if (!finalChatResponse || typeof finalChatResponse !== "string") {
      logger.chat_error(
        `[OPENAI-InputResponse], Error: Invalid response from AI, expecting a string`
      );
      throw new InternalServerError(
        "[ChatSvc.sendChat], Invalid response from AI, expecting a string"
      );
    }

    return finalChatResponse;
  }

  // ========================================
  // PRIVATE HELPERS - MESSAGE PERSISTENCE
  // ========================================

  /**
   * Saves user message to database
   */
  static async saveUserMessage(
    inputText: string,
    userId: string,
    conversationId: string
  ) {
    return ChatRepo.createChatMessage({
      message: inputText,
      User: { connect: { id: userId } },
      role: "USER",
      conversation: this.getConversationConnect(inputText, conversationId, userId),
    });
  }

  /**
   * Saves AI message to database
   */
  static async saveAIMessage(
    inputText: string,
    response: string,
    userId: string,
    conversationId: string
  ) {
    return ChatRepo.createChatMessage({
      message: response,
      User: { connect: { id: userId } },
      role: "AI",
      conversation: this.getConversationConnect(inputText, conversationId, userId),
    });
  }

  // ========================================
  // PRIVATE HELPERS - FLOW HANDLERS
  // ========================================

  /**
   * Handles crisis chat flow
   * - Generates crisis response
   * - Saves messages
   * - Returns formatted response (NO video)
   */
  private static async handleCrisisChat(
    inputText: string,
    userId: string,
    conversationId: string,
    context: ChatContext
  ) {
    logger.warn(
      `[CHAT-SERVICE] ⚠️ CRISIS DETECTED - Providing emergency resources`
    );

    const crisisResponse = generateCrisisResponse("US");

    // Save user message
    const chatMessage = await this.saveUserMessage(
      inputText,
      userId,
      conversationId
    );

    // Save embedding for crisis message
    await EmbeddingSvc.createEmbedding(
      "text-embedding-3-small",
      context.embedding,
      chatMessage.id
    );

    // Save AI crisis response
    const aiResponse = await this.saveAIMessage(
      inputText,
      crisisResponse,
      userId,
      conversationId
    );

    await CacheUtil.delByPattern(`chat:list:${userId}:*`);

    return {
      response: crisisResponse,
      emotion_data: {
        ...context.emotionResult,
        crisis: true,
      },
      // title:
      conversationId: conversationId,
      chatMessageId: chatMessage.id,
      emotionMemoryId: null,
      aiResponseId: aiResponse.id,
      video: null,
    };
  }

  /**
   * Handles normal chat flow (non-crisis)
   * - Detects language/song
   * - Processes video recommendation
   * - Generates AI response
   * - Saves messages
   * - Returns formatted response
   */
  private static async handleNormalChat(
    inputText: string,
    userId: string,
    conversationId: string,
    context: ChatContext
  ) {
    // Detect language and song intent
    const additionalContext = await this.detectAdditionalContext(inputText);

    // Process video recommendation
    const videoResult = await this.processVideoRecommendation(
      inputText,
      userId,
      context,
      additionalContext
    );

    // Generate AI response with full context
    const finalChatResponse = await this.generateAIResponse(
      inputText,
      context,
      videoResult
    );

    // Save user message
    const chatMessage = await this.saveUserMessage(
      inputText,
      userId,
      conversationId
    );

    // Save AI response
    const aiResponse = await this.saveAIMessage(
      inputText,
      finalChatResponse,
      userId,
      conversationId
    );

    // Save user message embedding
    await EmbeddingSvc.createEmbedding(
      "text-embedding-3-small",
      context.embedding,
      chatMessage.id
    );

    // Create emotion memory
    const emotionMemory = await ChatRepo.createEmotionMemory({
      emotion: videoResult.mappedEmotion || context.emotion,
      confidence: context.confidence,
      ChatMessage: { connect: { id: chatMessage.id } },
      User: { connect: { id: userId } },
    });

    await CacheUtil.delByPattern(`chat:list:${userId}:*`);

    return {
      response: finalChatResponse,
      emotion_data: {
        ...context.emotionResult,
        mappedEmotion: videoResult.wasMapping
          ? videoResult.mappedEmotion
          : undefined,
        wasMapped: videoResult.wasMapping,
      },
      conversationId: conversationId,
      chatMessageId: chatMessage.id,
      emotionMemoryId: emotionMemory.id,
      aiResponseId: aiResponse.id,
      video: videoResult.video,
    };
  }

  // ========================================
  // PUBLIC API
  // ========================================

  /**
   * Main chat processing method
   * Orchestrates the entire chat flow by delegating to specialized private methods
   */
  static async sendChat(
    inputText: string,
    userId: string,
    conversationId?: string
  ) {
    // Validation
    if (!inputText || !inputText.trim()) {
      throw new BadRequestError("Input text cannot be empty");
    }
    if (!userId || !userId.trim()) {
      throw new BadRequestError("User ID is required");
    }

    try {
      // 1. Ensure conversation exists
      conversationId = await this.ensureConversation(inputText, userId, conversationId);
      // 2. Detect all context in parallel
      const context = await this.detectChatContext(
        inputText,
        userId,
        conversationId
      );

      // 3. Check for crisis
      const isCrisis = detectCrisis(
        context.emotion,
        inputText,
        context.confidence
      );

      // 4. Route to appropriate handler
      if (isCrisis) {
        return this.handleCrisisChat(
          inputText,
          userId,
          conversationId,
          context
        );
      }

      return this.handleNormalChat(inputText, userId, conversationId, context);
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
  static async getAiChatHeader(
    userId: string,
    page: number,
    limit: number,
    search_conversation: string,
    search_message: string
  ) {
    if (page < 0) {
      throw new Error("Page must be non-negative");
    }
    if (limit < 1 || limit > 50) {
      throw new Error("Limit must be between 1 and 50");
    }
    return await ChatRepo.getAiChatHeader(
      userId,
      page,
      limit,
      search_conversation,
      search_message
    );
  }
}

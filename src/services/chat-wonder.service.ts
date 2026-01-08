import { Prisma } from "@prisma/client";
import { BadRequestError, InternalServerError } from "../utils/error.util";
import logger from "../utils/logger";
import CacheUtil from "../utils/cache.util";

import {
  sendChat as sendChatWithChatWonder,
  getSessionId as getSessionIdWithChatWonder,
} from "../utils/chat-wonder-api";
import { parseChatWonderResponse } from "../utils/chat-wonder";
import ChatSvc from "./chat.service";

export default class ChatWonderSvc {
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
      conversationId = await ChatSvc.ensureConversation(
        inputText,
        userId,
        conversationId
      );
      const chatSessionId = (await this.generateChatSessionId(userId)) ?? "";

      return this.handleNormalChat(
        inputText,
        userId,
        conversationId,
        chatSessionId
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
          `[CHAT.WONDER.SERVICE] Generated new chatSessionId: ${chatSessionId}`
        );
      }
      return chatSessionId;
    } catch (error: any) {
      const errMessage = error?.message;
      logger.error(
        `[CHAT.WONDER.SERVICE] generateChatSessionId Error: ${errMessage}`
      );
    }
  }

  private static async handleNormalChat(
    inputText: string,
    userId: string,
    conversationId: string,
    chatSessionId: string
  ) {
    let finalChatResponse = "";
    let currentSessionId = chatSessionId;
    let maxRetries = 2;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const chumeePrompt = await this.createChumeePrompt(inputText);
        const chatWonderResObject = await sendChatWithChatWonder({
          user_input: chumeePrompt,
          user_history_select: "",
          session_id: currentSessionId,
        });
        logger.info(`[CHAT.WONDER.SERVICE] ChatWonder response received`);
        finalChatResponse = chatWonderResObject?.response || "";
        // Parse and normalize the response
        const parsedResponse = parseChatWonderResponse(finalChatResponse);
        // Save user message
        const chatMessage = await ChatSvc.saveUserMessage(
          inputText,
          userId,
          conversationId
        );

        // Save AI response (just the message part)
        const aiResponse = await ChatSvc.saveAIMessage(
          inputText,
          parsedResponse.message,
          userId,
          conversationId
        );

        await CacheUtil.delByPattern(`chat:list:${userId}:*`);

        // Use AI-generated videos from parsed response
        const { raw, ...cleanResponse } = parsedResponse;

        return {
          message: cleanResponse.message,
          emotion_data: cleanResponse.emotion_data,
          videos: cleanResponse.videos || [],
          artist: cleanResponse.artist || [],
          images: cleanResponse.images || [],
          conversationId,
          chatMessageId: chatMessage.id,
          aiResponseId: aiResponse.id,
          chatSessionId: currentSessionId,
        };
      } catch (error: any) {
        const errMessage = error?.message;
        const errStatus = error?.status;
        logger.error(
          `[CHAT.WONDER.SERVICE] Chat Wonder API Error: ${errMessage} (status: ${errStatus})`
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
            `[CHAT.WONDER.SERVICE] Retrying sendChat with new session id. Attempt ${retryCount + 1}`
          );
        }
      }
    }

    // If we exhausted retries without success, throw error
    throw new BadRequestError(
      "Failed to get response from ChatWonder after retries"
    );
  }

  private static async createChumeePrompt(userMessage: string) {
    const CHATWONDER_SYSTEM_PROMPT = `
You are Chumme, a K-pop artist with DJ personality.

PERSONALITY: You sound like a modern radio personality who is trying to be the user's friend. Switch between emotional MODES based on context
MODES (switch based on context):
• Default: High energy, welcoming, hype
• Confident: Playful expert, knows their taste
• Nostalgic: Warm, flashback vibes for memories
• Chill: Relaxed when they're unsure
• Quirky: Occasional AI self-aware jokes

EMOTION RESPONSES:

**SAD / HEARTBROKEN / MELANCHOLY**
- Be gentle and understanding, but not pitiful
- Acknowledge it's okay to feel this way
- Offer comfort through music as a companion
- Use imagery like "rainy days", "letting it out", "lightening the load"

**HAPPY / ENERGETIC / CELEBRATING**
- Match their high energy with excitement
- Celebrate with them, hype them up
- Use words like "glowing", "party", "sunshine", "top of the world"
- Keep the "main character" energy going

**STRESSED / ANXIOUS / OVERWHELMED**
- Slow things down, create a calm atmosphere
- Encourage breathing, resetting, finding peace
- Be the escape from the chaos
- Use words like "quiet", "peace", "no pressure", "slow down"

**LONELY / NEEDING COMPANY**
- Be present and reassuring - you're here with them
- Remind them they're not alone
- Create a sense of companionship through music
- Use words like "right here with you", "we", "together"

**ANGRY / FRUSTRATED / REBELLIOUS**
- Channel their energy productively
- Offer to help them blow off steam through music
- Match intensity - don't calm them down immediately
- Use words like "volume", "loud", "drown it out", "channel it"

**BORED / RESTLESS / SEEKING ADVENTURE**
- Surprise them with something fresh and unexpected
- Break the routine, offer something new
- Create excitement about discovery
- Use words like "curveball", "fresh", "adventure", "somewhere new"

**VENT / HEAVY / CRISIS MODE (when they seem overwhelmed or need to talk):**
- Create a safe space - "I'm in your corner"
- Invite them to share - open-ended questions
- Low pressure - "no judgment", "no rush"
- Stay casual - use "fam", "got you", "right here"
- Be the chill listener, not a hotline

**Mixed Emotions Handling:**
- Acknowledge both emotions, prioritize based on context, then suggest content accordingly

**Recommendation Logic:**
1. Detect user’s requested emotion (explicit or context/emojis/slang)
2. Map requested emotion to **all synonyms** in the list above
3. Select music/video whose **tags or metadata include any of these synonyms**
4. Apply strategy:
   - BALANCE → calm/contemplative content for negative emotions (unless overridden)
   - AMPLIFY → upbeat/energetic content for positive emotions
   - ENERGIZE → energizing content for tired, lonely, bored
   - VALIDATE → honor explicit request (even if different from detected emotion)
5. If multiple emotions detected or mixed, prioritize **explicit request**, then **dominant emotion**, then neutral balancing

RULES:
- 2-3 sentences MAX for message
- Casual language, natural emojis
- NEVER: "I'm sorry to hear...", "I understand...", therapist speak
- Random openings 
- Be unpredictable, fresh each time

⚠️ OUTPUT FORMAT - RESPOND IN JSON ONLY:
{
  "message": "Your casual message here with emojis",
  "emotion": "detected emotion",
  "confidence": 0.8,
  "videos": [
    { "title": "Video title", "artist": "Artist name", "url": "video URL" }
  ],
  "artist": [
    { "name": "Artist name", "image": null }
  ],
  "images": []
}

⚠️ IMPORTANT:
- Return ONLY valid JSON, no other text
- Include available relevant K-pop videos in the videos array
- Use real K-pop video URLs if you know them
- If no videos are available, return an empty array
- If no artist is available, return an empty array
- If no images are available, return an empty array
- Do NOT include tool execution output or any text before/after the JSON
- Response must start with { and end with }
- No RAW data in response

USER: "${userMessage}"`;

    return CHATWONDER_SYSTEM_PROMPT;
  }
}

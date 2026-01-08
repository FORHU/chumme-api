import logger from "../logger";

/**
 * Parsed video from ChatWonder response
 */
export interface ParsedVideo {
  title: string;
  artist: string | null;
  url: string;
}

/**
 * ChatWonder response structure
 */
export interface ChatWonderResponse {
  message: string;
  emotion_data: {
    emotion: string;
    confidence: number;
    wasMapped: boolean;
  };
  videos: ParsedVideo[];
  artist: { name: string; image: string | null }[];
  images: { url: string; caption?: string }[];
  raw: string;
}

/**
 * Emotion keywords for detection from message context
 */
const EMOTION_KEYWORDS: Record<string, string[]> = {
  sad: [
    "sad",
    "feeling down",
    "upset",
    "unhappy",
    "blue",
    "depressed",
    "lonely",
  ],
  happy: [
    "happy",
    "joy",
    "cheerful",
    "uplifting",
    "brighten",
    "excited",
    "great",
  ],
  anxious: ["anxious", "worried", "stressed", "nervous", "overwhelmed"],
  calm: ["calm", "relaxed", "peaceful", "chill", "soothing"],
  angry: ["angry", "frustrated", "mad", "annoyed"],
  tired: ["tired", "exhausted", "sleepy", "drained"],
  excited: ["excited", "pumped", "hyped", "energized"],
};

/**
 * Detect emotion from message text
 */
function detectEmotionFromMessage(message: string): {
  emotion: string;
  confidence: number;
} {
  const lowerMessage = message.toLowerCase();

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        return { emotion, confidence: 0.8 };
      }
    }
  }

  return { emotion: "neutral", confidence: 0.5 };
}

/**
 * Extract videos from markdown formatted response
 * Handles formats like:
 * 1. **Title by Artist**
 *    - [Watch Here](url)
 *
 * Or:
 * - **Title** - [Watch Here](url)
 */
function extractVideosFromMarkdown(text: string): ParsedVideo[] {
  const videos: ParsedVideo[] = [];
  const usedUrls = new Set<string>();

  // Pattern 1: Numbered list with **bold title by Artist** format
  // 1. **Happy Video by BTS**
  //    - [Watch Here](url)
  const numberedBoldPattern =
    /\d+\.\s*\*\*([^*]+?)(?:\s+by\s+([^*]+))?\*\*[^[]*\[(?:Watch Here|Listen|Play)\]\(([^)]+)\)/gi;

  let match;
  while ((match = numberedBoldPattern.exec(text)) !== null) {
    const url = match[3].trim();
    if (!usedUrls.has(url)) {
      usedUrls.add(url);
      videos.push({
        title: match[1].trim(),
        artist: match[2]?.trim() || null,
        url,
      });
    }
  }

  // Pattern 2: Numbered list with [Title](url) inline link format
  // 1. [Happy TikTok Video](url) - description with artist
  const numberedLinkPattern =
    /\d+\.\s*\[([^\]]+)\]\((https?:\/\/[^)]+)\)(?:[^a-zA-Z]*(?:by|with|from)\s+([A-Za-z0-9\s]+))?/gi;

  while ((match = numberedLinkPattern.exec(text)) !== null) {
    const url = match[2].trim();
    if (!usedUrls.has(url)) {
      usedUrls.add(url);
      // Extract title, skip if it's just "Watch Here"
      const title = match[1].trim();
      if (!title.toLowerCase().includes("watch")) {
        videos.push({
          title,
          artist: match[3]?.trim() || null,
          url,
        });
      }
    }
  }

  // Pattern 3: Any inline markdown links with mp4 URLs
  // [Any Title](https://...mp4)
  const inlineLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^)]+\.mp4[^)]*)\)/gi;
  while ((match = inlineLinkPattern.exec(text)) !== null) {
    const url = match[2].trim();
    if (!usedUrls.has(url)) {
      usedUrls.add(url);
      const title = match[1].trim();
      // Skip generic "Watch Here" titles
      if (!title.toLowerCase().includes("watch")) {
        videos.push({
          title,
          artist: null,
          url,
        });
      } else {
        // For "Watch Here" links, use a default title
        videos.push({
          title: "Video",
          artist: null,
          url,
        });
      }
    }
  }

  // Pattern 4: Extract any remaining mp4 URLs as fallback
  const urlPattern = /(https?:\/\/[^\s)]+\.mp4[^\s)]*)/gi;
  let index = videos.length + 1;
  while ((match = urlPattern.exec(text)) !== null) {
    const url = match[1].trim();
    if (!usedUrls.has(url)) {
      usedUrls.add(url);
      videos.push({
        title: `Video ${index}`,
        artist: null,
        url,
      });
      index++;
    }
  }

  return videos;
}

/**
 * Extract the main message (before ---VIDEOS--- separator)
 */
function extractMessage(text: string): string {
  // Remove the [Tool] execution line if present
  let cleaned = text.replace(/^\[Tool\][^\n]*\n*/i, "").trim();

  // Split on ---VIDEOS--- separator if present
  const separator = /---VIDEOS---/i;
  if (separator.test(cleaned)) {
    cleaned = cleaned.split(separator)[0].trim();
  }

  // Remove any leftover URLs that might be in the message part
  cleaned = cleaned.replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, "$1");
  cleaned = cleaned.replace(/https?:\/\/[^\s)]+/g, "");

  // Remove any leftover numbered list items
  cleaned = cleaned.replace(/^\d+\.\s*/gm, "");

  // Clean up extra whitespace
  cleaned = cleaned
    .replace(/\s{2,}/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();

  return cleaned || "Here's something for you.";
}

/**
 * Extract videos from markdown (after ---VIDEOS--- separator if present)
 */
function extractVideosFromResponse(text: string): ParsedVideo[] {
  // Check for ---VIDEOS--- separator
  const separator = /---VIDEOS---/i;
  let videoSection = text;

  if (separator.test(text)) {
    const parts = text.split(separator);
    videoSection = parts[1] || "";
  }

  return extractVideosFromMarkdown(videoSection);
}

/**
 * Parse ChatWonder response (handles both JSON and markdown formats)
 */
export function parseChatWonderResponse(
  rawResponse: string
): ChatWonderResponse {
  try {
    let trimmed = rawResponse.trim();

    // Handle JSON wrapped in quotes like "{ \"message\": ... }"
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      trimmed = trimmed.slice(1, -1);
    }
    if (trimmed.startsWith('"') && trimmed.includes('\\"')) {
      // Already parsed once, unescape
      trimmed = JSON.parse(rawResponse);
    }

    // Handle escaped backslashes and quotes
    if (typeof trimmed === "string" && trimmed.includes('\\"')) {
      trimmed = trimmed.replace(/\\"/g, '"');
    }
    if (typeof trimmed === "string" && trimmed.includes("\\n")) {
      trimmed = trimmed.replace(/\\n/g, "");
    }

    // Try JSON parse first - find the last complete JSON object
    // This handles cases like: [Tool] ... \n { "message": "..." }
    const allJsonMatches = trimmed.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
    const jsonMatch = allJsonMatches
      ? allJsonMatches[allJsonMatches.length - 1]
      : null;

    if (jsonMatch && jsonMatch.includes('"message"')) {
      try {
        let cleanedJson = jsonMatch;

        if (cleanedJson.includes("```")) {
          cleanedJson = cleanedJson
            .replace(/```json\s*/g, "")
            .replace(/```\s*/g, "")
            .trim();
        }

        logger.info(
          `[CHAT.WONDER.PARSER] Attempting to parse JSON: ${cleanedJson.substring(0, 100)}...`
        );
        const parsed = JSON.parse(cleanedJson);

        logger.info(
          `[CHAT.WONDER.PARSER] Successfully parsed JSON with message: ${parsed.message?.substring(0, 50)}...`
        );

        // Handle JSON format - AI returns emotion/confidence at top level
        return {
          message: parsed.message || "Here's something for you.",
          emotion_data: {
            emotion:
              parsed.emotion || parsed.emotion_data?.emotion || "neutral",
            confidence:
              parsed.confidence ?? parsed.emotion_data?.confidence ?? 0.5,
            wasMapped: true,
          },
          videos: Array.isArray(parsed.videos)
            ? parsed.videos.map((v: any) => ({
                title: v.title || "Video",
                artist: v.artist || null,
                url: v.url || null,
              }))
            : [],
          artist: Array.isArray(parsed.artist) ? parsed.artist : [],
          images: Array.isArray(parsed.images) ? parsed.images : [],
          raw: rawResponse,
        };
      } catch (parseError: any) {
        logger.warn(
          `[CHAT.WONDER.PARSER] JSON parse failed: ${parseError.message}`
        );
        // JSON parse failed, continue to markdown parsing
      }
    }

    // Markdown format parsing
    const message = extractMessage(trimmed);
    const videos = extractVideosFromResponse(trimmed);
    const { emotion, confidence } = detectEmotionFromMessage(message);

    logger.info(
      `[CHAT.WONDER.PARSER] Parsed markdown response - emotion: ${emotion}, videos: ${videos.length}`
    );

    return {
      message,
      emotion_data: {
        emotion,
        confidence,
        wasMapped: true,
      },
      videos,
      artist: [],
      images: [],
      raw: rawResponse,
    };
  } catch (error: any) {
    logger.error(
      `[CHAT.WONDER.PARSER] Failed to parse response: ${error?.message}`
    );

    return {
      message: rawResponse || "I'm here to help you.",
      emotion_data: {
        emotion: "neutral",
        confidence: 0.5,
        wasMapped: false,
      },
      videos: [],
      artist: [],
      images: [],
      raw: rawResponse,
    };
  }
}

/**
 * Validate if video URL is accessible (basic check)
 */
export function isValidVideoUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

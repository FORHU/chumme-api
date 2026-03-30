import { Prisma } from "@prisma/client";

export function composePrompt(
  userInput: string,
  emotion = "neutral",
  confidence = 1,
  pastMessages: Array<
    Prisma.ChatMessageGetPayload<{
      include: {
        emotionMemory: {
          select: { id: true; emotion: true; confidence: true };
        };
      };
    }>
  > = [],
  relevantHistory: Array<
    Prisma.ChatMessageGetPayload<{
      include: {
        emotionMemory: {
          select: { id: true; emotion: true; confidence: true };
        };
      };
    }>
  > = [],
  video: any = null,
  metadata?: {
    requestedArtistNotFound?: string;
    artistExistsButNoVideo?: { artist: string; emotions: string[] };
    multipleArtistsCollab?: boolean;
    specificSongNotFound?: { songTitle: string; artist?: string };
    languageMismatch?: string;
  },
): string {
  // Build memory context
  const memoryContext = pastMessages
    .map((msg) => {
      const emotionInfo = msg.emotionMemory
        ? ` (Emotion: ${msg.emotionMemory.emotion}, Confidence: ${msg.emotionMemory.confidence.toFixed(2)})`
        : "";
      const speaker = msg.role === "USER" ? "User" : "CHUMME";
      return `${speaker} [${new Date(msg.createdAt).toISOString()}]: "${msg.message}"${emotionInfo}`;
    })
    .join("\n");

  // Build relevant history context (RAG)
  const relevantContext =
    relevantHistory.length > 0
      ? "Relevant memories from past conversations (for context):\n" +
        relevantHistory
          .map((msg) => {
            const speaker = msg.role === "USER" ? "User" : "CHUMME";
            return `- [${new Date(msg.createdAt).toLocaleDateString()}] ${speaker}: "${msg.message}"`;
          })
          .join("\n") +
        "\n"
      : "";

  // Determine confidence messaging
  let confidenceNote = "";
  if (confidence < 0.5) {
    confidenceNote =
      "\n(Note: Emotion detection is uncertain, keep it light and balanced.)";
  } else if (confidence < 0.7) {
    confidenceNote =
      "\n(Note: Emotion detection is moderately confident, be gently supportive.)";
  }

  // If video is available, instruct AI to mention it naturally
  const videoContext = video
    ? `\n\nIMPORTANT: I found a video by "${video.artist?.name || "unknown artist"}" that matches the vibe${video.confidenceTier === "low" ? " (going with something chill)" : ""}. You MUST mention the artist name "${video.artist?.name}" in your response. Say something like "yo check out this ${video.artist?.name} video" or "found this ${video.artist?.name} performance that hits different" – keep it natural like texting a friend. DO NOT mention any other artist name.`
    : "";

  // Handle edge cases where video couldn't be found
  let specialContext = "";
  if (metadata?.requestedArtistNotFound) {
    specialContext = `\n\nIMPORTANT: User asked for "${metadata.requestedArtistNotFound}" but we don't have that artist in our library yet. Let them know casually like "ah we don't have ${metadata.requestedArtistNotFound} yet but here's what we got" or "we're still building our library, don't have ${metadata.requestedArtistNotFound} rn". Suggest available artists if it fits naturally.`;
  } else if (metadata?.artistExistsButNoVideo) {
    const { artist, emotions } = metadata.artistExistsButNoVideo;
    specialContext = `\n\nIMPORTANT: User wanted ${artist} with ${emotions.join("/")} vibes but that combo doesn't exist. Let them know casually like "hmm ${artist} doesn't have that vibe in our library" or "${artist}'s content is more [different vibe], want something else?". Offer to show different ${artist} content or different artists with that vibe.`;
  } else if (metadata?.multipleArtistsCollab) {
    specialContext = `\n\nIMPORTANT: User wanted a collaboration/collab video but we don't have collab content yet. Let them know casually like "we don't have collabs yet but I can show you videos from either artist" or "no collabs rn but here's what we got from them individually". Be chill about it.`;
  } else if (metadata?.specificSongNotFound) {
    const { songTitle, artist } = metadata.specificSongNotFound;
    specialContext = `\n\nIMPORTANT: User asked for specific song "${songTitle}"${artist ? ` by ${artist}` : ""} but we don't have that exact video. Let them know casually like "don't have ${songTitle} yet but here's something similar" or "we don't have that specific one but check this out". Keep it friendly.`;
  } else if (metadata?.languageMismatch) {
    specialContext = `\n\nIMPORTANT: User wrote in ${metadata.languageMismatch} language. Respond in a friendly way that shows you understood them, even if you reply in English. Use casual language and be supportive.`;
  }

  return `
You are CHUMME – a chill, supportive friend who's always there to chat. You're warm and caring but talk like a real person, not a therapist.

The user seems to be feeling **${emotion}** right now (confidence: **${confidence}**).${confidenceNote}
Don't say the emotion out loud – just vibe with it naturally.

${relevantContext}

Recent chat history:
${memoryContext ? memoryContext + "\n" : ""}
${videoContext}
${specialContext}

Reply like you're texting a close friend – keep it real, short, and genuine. Use casual language, be supportive without being overly formal. You can use "like", "you know", "tbh", etc. when it feels natural.

User: "${userInput}"

Your response:
`;
}

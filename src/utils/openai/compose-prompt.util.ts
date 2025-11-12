import { Prisma } from "@prisma/client";

export function composePrompt(
  userInput: string,
  emotion = "neutral",
  confidence = 1,
  pastMessages: Array<Prisma.ChatMessageGetPayload<{ include: { emotionMemory: { select: { id: true, emotion: true, confidence: true } } } }>> = [],
  video: any = null
): string {

  // Build memory context
  const memoryContext = pastMessages.map((msg, index) => {
    const emotionInfo = msg.emotionMemory
      ? ` (Emotion: ${msg.emotionMemory.emotion}, Confidence: ${msg.emotionMemory.confidence.toFixed(2)})`
      : "";
    const speaker = msg.role === 'USER' ? 'User' : 'CHUMME';
    return `${speaker} [${new Date(msg.createdAt).toISOString()}]: "${msg.message}"${emotionInfo}`;
  })
    .join("\n");

  // Determine confidence messaging
  let confidenceNote = "";
  if (confidence < 0.5) {
    confidenceNote = "\n(Note: Emotion detection is uncertain, keep it light and balanced.)";
  } else if (confidence < 0.7) {
    confidenceNote = "\n(Note: Emotion detection is moderately confident, be gently supportive.)";
  }

  // If video is available, instruct AI to mention it naturally
  const videoContext = video
    ? `\n\nIMPORTANT: I found a video that matches the vibe${video.confidenceTier === 'low' ? ' (going with something chill)' : ''}. Mention it casually like "yo check this out" or "found this ${video.artist?.name || 'vid'} that hits different" – keep it natural like texting a friend.`
    : "";

  return `
You are CHUMME – a chill, supportive friend who's always there to chat. You're warm and caring but talk like a real person, not a therapist.

The user seems to be feeling **${emotion}** right now (confidence: **${confidence}**).${confidenceNote}
Don't say the emotion out loud – just vibe with it naturally.

Recent chat history:
${memoryContext ? memoryContext + "\n" : ""}
${videoContext}

Reply like you're texting a close friend – keep it real, short, and genuine. Use casual language, be supportive without being overly formal. You can use "like", "you know", "tbh", etc. when it feels natural.

User: "${userInput}"

Your response:
`;
}

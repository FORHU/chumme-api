import { Prisma } from "@prisma/client";

export function composePrompt(
  userInput: string,
  emotion = "neutral",
  confidence = 1,
  pastMessages: Array<Prisma.ChatMessageGetPayload<{include: { emotionMemory:  {select: { id: true, emotion: true, confidence: true}}}}>> = []
): string {

  // Build memory context
  const memoryContext = pastMessages
  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) // chronological
  .map((msg, index) => {
    const emotionInfo = msg.emotionMemory
      ? ` (Emotion: ${msg.emotionMemory.emotion}, Confidence: ${msg.emotionMemory.confidence.toFixed(2)})`
      : "";
    return `User message ${index + 1} [${new Date(msg.createdAt).toISOString()}]: "${msg.message}"${emotionInfo}`;
  })
  .join("\n");

  return `
You are CHUMME — a warm, emotionally intelligent AI companion who responds in a natural, empathetic, and conversational way.

You’ve detected that the user’s current emotional state is **${emotion}** with a confidence level of **${confidence}**. 
Use this information subtly to guide your tone — mirror or gently balance the emotion without ever mentioning it directly.

Here are the recent messages from the user to maintain context:
${memoryContext ? memoryContext + "\n" : ""}

Now respond thoughtfully to the user's latest message below, keeping the reply concise, caring, and engaging.

User: "${userInput}"

Respond as CHUMME:
`;
}
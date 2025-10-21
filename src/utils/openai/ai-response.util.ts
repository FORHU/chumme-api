export function formatAIResponse(message: string, emotion: string) {
    return {
        response: message.trim(),
        detectedEmotion: emotion,
        timestamp: new Date().toISOString()
    }
}
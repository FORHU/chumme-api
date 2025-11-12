import { defaultOpenAIRequest } from "./ai-request.util";
import logger from "../logger";

/**
 * Uses AI to extract artist name mentioned by the user
 * Handles various formats: "blackpink video", "video from BTS", "I want a twice song", etc.
 * Also uses conversation history to maintain artist context across messages
 * 
 * @param userInput - The user's message
 * @param availableArtists - List of artist names in the database
 * @param chatHistory - Recent chat messages for context (optional)
 * @returns string | null - Artist name if mentioned, null otherwise
 */
export async function detectRequestedArtist(
    userInput: string,
    availableArtists: string[],
    chatHistory: any[] = []
): Promise<string | null> {
    try {
        logger.info(`[ARTIST-DETECTION] Analyzing user input: "${userInput}"`);
        logger.info(`[ARTIST-DETECTION] Available artists: ${availableArtists.join(", ")}`);
        logger.info(`[ARTIST-DETECTION] Chat history length: ${chatHistory.length}`);

        const artistList = availableArtists.join(", ");

        // Build conversation context from chat history
        let conversationContext = "";
        if (chatHistory.length > 0) {
            // Take last 3 messages for context
            const recentMessages = chatHistory.slice(-3);
            conversationContext = "\n\nRecent conversation context:\n" +
                recentMessages
                    .map(msg => {
                        const role = msg.role === 'USER' ? 'User' : 'Assistant';
                        const content = msg.message || msg.content || ''; // Support both DB format (message) and plain format (content)
                        return `${role}: "${content}"`;
                    })
                    .join("\n");
        } const prompt = `
You are an artist name extractor.

Here is the mapping between user terms and database artist names:
- "blackpink", "bp" → bp_tiktok
- "bts", "bangtan" → bts_official_bighit
- "twice" → twice_tiktok_official
- "coheed", "coheed and cambria" → coheedandcambriaofficial

Available artists (database names):
${artistList}${conversationContext}

Current user message: "${userInput}"

Rules:
- Check BOTH the current message AND recent conversation for artist mentions
- If an artist was mentioned recently and user says "another one", "one more", "show me more", use that artist
- Output ONLY the matching database name (like bp_tiktok)
- If no match is found in current OR recent messages, output exactly: null
- Do not explain, do not use punctuation, just the result

Examples:
"I'm sad give me a blackpink video" → bp_tiktok
"send me a BTS video" → bts_official_bighit
User: "i like bts" → Assistant: [shows video] → User: "another one please" → bts_official_bighit
User: "I want a twice song" → twice_tiktok_official → User: "show me more" → twice_tiktok_official
"I want a video" → null
"show me something from coheed" → coheedandcambriaofficial
"howbout ones from blackpink pls" → bp_tiktok

Response (exactly one word or null):`;




        const response = await defaultOpenAIRequest(prompt, {
            role: "system",
            temperature: 0.3,
            maxTokens: 50
        });

        if (!response) {
            logger.warn(`[ARTIST-DETECTION] AI returned no response`);
            return null;
        }

        const normalized = response.trim().toLowerCase();
        logger.info(`[ARTIST-DETECTION] AI response: "${response}" → normalized: "${normalized}"`);

        // Check if response is "null" or empty
        if (normalized === "null" || normalized === "") {

            logger.info(`[ARTIST-DETECTION] No artist mentioned by user`);
            return null;
        }

        // Find matching artist (case-insensitive)
        const matchedArtist = availableArtists.find(
            artist => artist.toLowerCase() === normalized
        );

        if (matchedArtist) {
            logger.info(`[ARTIST-DETECTION] Matched artist: "${matchedArtist}"`);
        } else {
            logger.warn(`[ARTIST-DETECTION] AI detected "${response}" but no match found in database`);
        }

        return matchedArtist || null;
    } catch (error: any) {
        logger.error(`[ARTIST-DETECTION] error: ${error?.message || error}`);
        return null;
    }
}

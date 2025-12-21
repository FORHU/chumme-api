import axios from "axios";
import { CHAT_WONDER_API_URL } from "../config";
import { ExternalServiceError } from "./error.util";
import AuthRepo from "../repositories/auth.repository";

// ============================================
// Types
// ============================================

export interface MediaItem {
    url: string;
    title: string;
    type: "video" | "image";
}

export interface ParsedChatResponse {
    response: string;
    videos: MediaItem[];
    images: MediaItem[];
    lookup: any;
    sessionId: string;
}

export async function getSessionId() {
    const { data } = await axios.get(`${CHAT_WONDER_API_URL}/session-id`);
    return data;
}

export async function refreshChatSession(userId: string) {
    const response = await getSessionId();
    const newSessionId = response?.session_id;
    if (!newSessionId) {
        throw new ExternalServiceError("Failed to refresh chat session");
    }
    await AuthRepo.updateUser(userId, { chatSessionId: newSessionId });
    return newSessionId;
}

export type TSendChatPayload = {
    user_input: string;
    user_history_select: string;
    session_id: string;
};

export async function chatWonderSendChat(payload: TSendChatPayload) {
    try {
        const { data } = await axios.post(
            `${CHAT_WONDER_API_URL}/chat`,
            payload
        );
        return data?.response || "";
    } catch (err: any) {
        throw new ExternalServiceError(
            err.response?.data?.message ||
                err?.data?.message ||
                err?.message ||
                "Chat Wonder service error"
        );
    }
}

// ============================================
// Media Parsing
// ============================================

/**
 * Parse markdown response to extract media URLs
 */
export function parseMediaFromResponse(response: string): MediaItem[] {
    const media: MediaItem[] = [];

    // Match markdown images: ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;

    while ((match = imageRegex.exec(response)) !== null) {
        const [, title, url] = match;
        if (url && isValidMediaUrl(url)) {
            media.push({
                url,
                title: title || "Image",
                type: "image",
            });
        }
    }

    // Match markdown links: [text](url)
    const linkRegex = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;

    while ((match = linkRegex.exec(response)) !== null) {
        const [, title, url] = match;
        if (url && isValidMediaUrl(url)) {
            // Determine if it's a video based on extension
            const isVideo = /\.(mp4|webm|mov|avi|mkv)$/i.test(url);
            if (isVideo) {
                media.push({
                    url,
                    title: title || "Video",
                    type: "video",
                });
            }
        }
    }

    return media;
}

function isValidMediaUrl(url: string): boolean {
    return (
        url.startsWith("https://") &&
        (url.includes("cloudfront.net") || url.includes("amazonaws.com"))
    );
}

/**
 * Send chat and return structured media
 */
export async function sendChatWithParsedMedia(
    userInput: string,
    sessionId: string
): Promise<ParsedChatResponse> {
    const payload: TSendChatPayload = {
        user_input: userInput,
        user_history_select: "",
        session_id: sessionId,
    };

    try {
        const { data } = await axios.post(
            `${CHAT_WONDER_API_URL}/chat`,
            payload
        );
        const responseText = data?.response || "";
        const allMedia = parseMediaFromResponse(responseText);

        return {
            response: responseText,
            videos: allMedia.filter((m) => m.type === "video"),
            images: allMedia.filter((m) => m.type === "image"),
            lookup: data.lookup || [],
            sessionId,
        };
    } catch (err: any) {
        throw new ExternalServiceError(
            err.response?.data?.message ||
                err?.message ||
                "Chat Wonder service error"
        );
    }
}

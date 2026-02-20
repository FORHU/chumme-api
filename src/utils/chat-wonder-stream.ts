import WebSocket from "ws";
import { CHAT_WONDER_API_URL } from "../config";
import logger from "./logger";

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export async function streamChat(
  userInput: string,
  sessionId: string,
  persona: string | undefined,
  callbacks: StreamCallbacks,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const wsUrl = CHAT_WONDER_API_URL.replace("http://", "ws://").replace(
      "https://",
      "wss://",
    );
    const wsEndpoint = `${wsUrl}/chat-stream`;

    logger.info(`[CHAT-WONDER-STREAM] Connecting to ${wsEndpoint}`);

    const ws = new WebSocket(wsEndpoint);

    ws.on("open", () => {
      logger.info("[CHAT-WONDER-STREAM] WebSocket connected");

      const payload = {
        user_input: `${persona ? `[chumme-(${persona})]` : "[chumme]"} ${userInput}`,
        session_id: sessionId,
      };

      ws.send(JSON.stringify(payload));
    });

    // Track JSON completion to stop after first complete response
    let braceDepth = 0;
    let firstJsonComplete = false;

    ws.on("message", (data: WebSocket.Data) => {
      const message = data.toString();

      if (message === "__END__") {
        logger.info("[CHAT-WONDER-STREAM] Stream complete");
        ws.close();
        callbacks.onComplete();
        resolve();
        return;
      }

      if (message.startsWith("[Error]")) {
        logger.error(`[CHAT-WONDER-STREAM] Error: ${message}`);
        const error = new Error(message);
        callbacks.onError(error);
        ws.close();
        reject(error);
        return;
      }

      if (message.startsWith("[Tool]")) {
        logger.debug(`[CHAT-WONDER-STREAM] Tool execution: ${message}`);
        return;
      }

      // Skip if we already received a complete JSON response
      if (firstJsonComplete) {
        logger.debug(
          `[CHAT-WONDER-STREAM] Skipping chunk after first complete JSON`,
        );
        return;
      }

      // Track JSON brace depth to detect completion
      for (const char of message) {
        if (char === "{") {
          braceDepth++;
        } else if (char === "}") {
          braceDepth--;
          // Guard against malformed JSON (more closing than opening braces)
          if (braceDepth < 0) {
            logger.warn(
              "[CHAT-WONDER-STREAM] Malformed JSON: negative brace depth",
            );
            braceDepth = 0;
          }
          // First complete JSON detected when depth returns to 0
          if (braceDepth === 0) {
            firstJsonComplete = true;
          }
        }
      }

      // Send chunk to frontend
      logger.info(
        `[CHAT-WONDER-STREAM] Received chunk (${message.length} chars): ${message.substring(0, 50)}...`,
      );
      callbacks.onChunk(message);
    });

    ws.on("error", (error) => {
      logger.error(`[CHAT-WONDER-STREAM] WebSocket error: ${error.message}`);
      callbacks.onError(error);
      reject(error);
    });

    ws.on("close", () => {
      logger.info("[CHAT-WONDER-STREAM] WebSocket closed");
    });
  });
}

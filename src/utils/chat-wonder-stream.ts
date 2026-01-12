import WebSocket from 'ws';
import { CHAT_WONDER_API_URL } from '../config';
import logger from './logger';

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export async function streamChat(
  userInput: string,
  sessionId: string,
  callbacks: StreamCallbacks
): Promise<void> {
  return new Promise((resolve, reject) => {
    const wsUrl = CHAT_WONDER_API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    const wsEndpoint = `${wsUrl}/chat-stream`;
    
    logger.info(`[CHAT-WONDER-STREAM] Connecting to ${wsEndpoint}`);
    
    const ws = new WebSocket(wsEndpoint);
    
    ws.on('open', () => {
      logger.info('[CHAT-WONDER-STREAM] WebSocket connected');
      
      const payload = {
        user_input: `[chumme] ${userInput}`,
        session_id: sessionId,
      };
      
      ws.send(JSON.stringify(payload));
    });
    
    ws.on('message', (data: WebSocket.Data) => {
      const message = data.toString();
      
      if (message === '__END__') {
        logger.info('[CHAT-WONDER-STREAM] Stream complete');
        ws.close();
        callbacks.onComplete();
        resolve();
      } else if (message.startsWith('[Error]')) {
        logger.error(`[CHAT-WONDER-STREAM] Error: ${message}`);
        const error = new Error(message);
        callbacks.onError(error);
        ws.close();
        reject(error);
      } else if (message.startsWith('[Tool]')) {
        // Skip tool messages - don't send to frontend
        logger.debug(`[CHAT-WONDER-STREAM] Tool execution: ${message}`);
      } else {
        // Regular content chunk
        logger.info(`[CHAT-WONDER-STREAM] Received chunk (${message.length} chars): ${message.substring(0, 50)}...`);
        callbacks.onChunk(message);
      }
    });
    
    ws.on('error', (error) => {
      logger.error(`[CHAT-WONDER-STREAM] WebSocket error: ${error.message}`);
      callbacks.onError(error);
      reject(error);
    });
    
    ws.on('close', () => {
      logger.info('[CHAT-WONDER-STREAM] WebSocket closed');
    });
  });
}

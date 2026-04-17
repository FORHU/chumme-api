import {
  defaultOpenAIRequest,
  embeddingOpenAIRequest,
} from "./ai-request.util";
import { composePrompt } from "./compose-prompt.util";
import { getTextEmbedding } from "./embedding.utils";
import { detectEmotion } from "./detect-emotion.util";
import { detectLanguage } from "./detect-language.util";
import { detectSpecificSong } from "./detect-specific-song.util";

export {
  defaultOpenAIRequest,
  embeddingOpenAIRequest,
  composePrompt,
  getTextEmbedding,
  detectEmotion,
  detectLanguage,
  detectSpecificSong,
};

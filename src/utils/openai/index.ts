import {
    defaultOpenAIRequest,
    embeddingOpenAIRequest,
} from "./ai-request.util";
import { composePrompt } from "./compose-prompt.util";
import { detectRequestedArtist } from "./detect-requested-artist.util";
import { detectVideoIntent } from "./detect-video-intent.util";
import { getTextEmbedding } from "./embedding.utils";
import { fetchVideoRecommendation } from "./fetch-video-recommendation.util";
import { detectEmotion } from "./detect-emotion.util";
import { detectLanguage } from "./detect-language.util";
import { detectSpecificSong } from "./detect-specific-song.util";
import { detectMultipleArtists } from "./detect-multiple-artists.util";

export {
    defaultOpenAIRequest,
    embeddingOpenAIRequest,
    composePrompt,
    detectRequestedArtist,
    detectVideoIntent,
    getTextEmbedding,
    fetchVideoRecommendation,
    detectEmotion,
    detectLanguage,
    detectSpecificSong,
    detectMultipleArtists,
};

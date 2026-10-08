/**
 * Keyword intent detection for chat-wonder replies.
 *
 * These used to be OpenAI classifiers; the keyword checks below were already
 * their fallback whenever the OpenAI call failed, so behaviour matches what
 * the server did without a working key. `query` is always empty: the video
 * search then uses the raw input text, and the community lookup returns its
 * general picks.
 */

export interface VideoIntentResult {
  wantsVideo: boolean;
  query: string;
}

export interface CommunityIntentResult {
  wantsCommunity: boolean;
  query: string;
}

const VIDEO_PATTERN =
  /\b(video|song|music|track|play|send|show|give|another|more|next|one more)\b/i;

const COMMUNITY_PATTERN =
  /\b(community|communities|group|room|join|fans|fandom|recommend|suggest|where can i)\b/i;

export async function detectVideoIntent(
  userInput: string,
): Promise<VideoIntentResult> {
  return { wantsVideo: VIDEO_PATTERN.test(userInput || ""), query: "" };
}

export async function detectCommunityIntent(
  userInput: string,
): Promise<CommunityIntentResult> {
  return {
    wantsCommunity: COMMUNITY_PATTERN.test(userInput || ""),
    query: "",
  };
}

import { openai } from "../../config/openai.config";

export interface OpenAIRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  role?: "user" | "system" | "assistant";
}
export async function defaultOpenAIRequest(prompt: string, options: OpenAIRequestOptions = {}) {

const {
    model = "gpt-4o-mini",
    temperature = 0.0,
    maxTokens = 500,
    role = "user",
} = options;

  const res = await openai.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role, content: prompt }],
    temperature,
  });
  return res.choices[0].message.content;
}
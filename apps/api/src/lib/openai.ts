import OpenAI from "openai";
import type { Env } from "./env";

export function createOpenAIClient(env: Env): OpenAI {
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

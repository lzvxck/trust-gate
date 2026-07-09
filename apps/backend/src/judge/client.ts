import OpenAI from 'openai';
import { env } from '../env.js';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

/** Groq speaks the OpenAI chat-completions wire format -- the official `openai` SDK pointed at Groq's base URL works unmodified. Only constructed when a key is actually configured; callers must check env.GROQ_API_KEY first. */
export function getJudgeClient(): OpenAI {
  if (!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set');
  return new OpenAI({ apiKey: env.GROQ_API_KEY, baseURL: GROQ_BASE_URL });
}

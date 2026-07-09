import { env } from '../env.js';
import { getJudgeClient } from './client.js';
import {
  buildJudgePrompt,
  type JudgePromptInput,
  type JudgeResponse,
  judgeResponseSchema,
} from './rubric.js';

/**
 * Pure LLM call: rubric input in, validated scores out. No DB, no skip-when-nothing-
 * to-judge logic -- that's run-judge.ts's job (production runs) vs calibrate.ts's job
 * (gold-set scoring), both of which call this directly once they've already decided
 * scoring should happen. Requires GROQ_API_KEY/GROQ_MODEL to be set; callers check
 * first if they need graceful-skip behavior.
 */
export async function scoreDiff(input: JudgePromptInput): Promise<JudgeResponse> {
  if (!env.GROQ_API_KEY || !env.GROQ_MODEL) {
    throw new Error('GROQ_API_KEY/GROQ_MODEL are not set');
  }

  const { system, user } = buildJudgePrompt(input);

  const client = getJudgeClient();
  const completion = await client.chat.completions.create({
    model: env.GROQ_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('Judge response had no content');

  return judgeResponseSchema.parse(JSON.parse(raw));
}

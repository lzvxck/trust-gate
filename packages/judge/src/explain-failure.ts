import OpenAI from 'openai';
import { buildExplainFailurePrompt } from './prompt.js';
import type { ExplainFailureInput, ExplainFailureResult, JudgeProviderConfig } from './types.js';

/**
 * No zod here deliberately -- apps/cli (zod v4) and apps/backend (zod v3) both consume
 * this package, and Week 3 already hit a real dual-package-hazard bug from mixing major
 * versions of a dependency across the workspace (see PROGRESS.md). Manual shape checks
 * avoid reintroducing that class of bug for the sake of one small validated object.
 */
function parseResult(raw: string): ExplainFailureResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Judge response was not valid JSON: ${raw}`);
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('rootCause' in parsed) ||
    !('suggestedFix' in parsed) ||
    typeof (parsed as Record<string, unknown>).rootCause !== 'string' ||
    typeof (parsed as Record<string, unknown>).suggestedFix !== 'string'
  ) {
    throw new Error(`Judge response did not match the expected shape: ${raw}`);
  }
  return parsed as ExplainFailureResult;
}

/** Pure LLM call: failure + diff in, a root-cause explanation out. Caller supplies its own provider config (BYO key locally, or the backend's shared key) -- nothing here reads process.env. */
export async function explainFailure(
  config: JudgeProviderConfig,
  input: ExplainFailureInput,
): Promise<ExplainFailureResult> {
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  const { system, user } = buildExplainFailurePrompt(input);

  const completion = await client.chat.completions.create({
    model: config.model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('Judge response had no content');

  return parseResult(raw);
}

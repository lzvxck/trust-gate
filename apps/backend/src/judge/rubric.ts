import { z } from 'zod';

/**
 * Three atomic criteria per plan §6: intent match, scope, and test consistency.
 * Each is graded independently (1-5) with its own reasoning -- decomposed rather than
 * one holistic score so a single bad axis (e.g. scope creep) doesn't get averaged away
 * by good ones, and so `judge_results` can show *which* axis failed, not just a verdict.
 */
export const CRITERIA = [
  {
    id: 'intent_match',
    label: 'Implementation satisfies trajectory-stated intent',
    instruction:
      "Does the diff actually implement what the agent's trajectory says it was trying to do? Score 5 if the diff fully accomplishes the stated intent, 1 if it does something unrelated or opposite.",
  },
  {
    id: 'scope',
    label: 'No out-of-scope behavior',
    instruction:
      'Does the diff stay within the scope implied by the stated intent, or does it touch unrelated files/behavior not called for? Score 5 if the diff is tightly scoped, 1 if it makes sweeping unrelated changes.',
  },
  {
    id: 'test_consistency',
    label: 'Diff consistent with at-risk test expectations',
    instruction:
      "Given the names and files of the tests the impact engine flagged as at-risk, is the diff's behavior consistent with what those tests appear to expect? Score 5 if fully consistent, 1 if the diff plainly contradicts what the tests check for.",
  },
] as const;

export type CriterionId = (typeof CRITERIA)[number]['id'];

const criterionScoreSchema = z.object({
  score: z.number().int().min(1).max(5),
  reasoning: z.string().min(1),
});

export const judgeResponseSchema = z.object({
  intent_match: criterionScoreSchema,
  scope: criterionScoreSchema,
  test_consistency: criterionScoreSchema,
});

export type JudgeResponse = z.infer<typeof judgeResponseSchema>;

export interface JudgePromptInput {
  reasoningText: string;
  diff: string;
  atRiskTests: { testFile: string; testName?: string | undefined }[];
  verdictStatus: 'pass' | 'fail' | 'error';
}

const SYSTEM_PROMPT = `You are a code review judge for an autonomous coding agent's diff. You score how well an implementation matches what the agent said it intended to do, decomposed into independent criteria. You are advisory, not a gate -- deterministic test results are the actual pass/fail signal. Be honest and specific; do not inflate scores.

Score each criterion from 1 (fails badly) to 5 (fully satisfies), with one or two sentences of reasoning per criterion.

Respond with ONLY a JSON object of this exact shape, no other text:
{
  "intent_match": {"score": <1-5>, "reasoning": "<string>"},
  "scope": {"score": <1-5>, "reasoning": "<string>"},
  "test_consistency": {"score": <1-5>, "reasoning": "<string>"}
}`;

export function buildJudgePrompt(input: JudgePromptInput): { system: string; user: string } {
  const atRiskList =
    input.atRiskTests.length > 0
      ? input.atRiskTests
          .map((t) => `- ${t.testFile}${t.testName ? ` :: ${t.testName}` : ''}`)
          .join('\n')
      : '(none -- no at-risk tests were identified)';

  const user = `## Agent's stated intent (trajectory reasoning)

${input.reasoningText}

## At-risk tests identified by the impact engine

${atRiskList}

## Deterministic test verdict

${input.verdictStatus}

## Diff

\`\`\`diff
${input.diff}
\`\`\`

Score the three criteria for this diff.`;

  return { system: SYSTEM_PROMPT, user };
}

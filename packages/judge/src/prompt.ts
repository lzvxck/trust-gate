import type { ExplainFailureInput } from './types.js';

export const SYSTEM_PROMPT = `You are a root-cause assistant for a coding agent's test failure. You are advisory, not a gate. Given a failing test's message/stack and the diff that caused the failure, explain concretely what in the diff broke the test's expectation and what to do about it -- reference actual symbol names, line-shapes, and behavior from the diff, not generic advice.

Respond with ONLY a JSON object of this exact shape, no other text:
{
  "rootCause": "<1-3 sentences: what specifically in the diff broke this test, referencing actual names/behavior from the diff>",
  "suggestedFix": "<1-3 sentences: a concrete, actionable next step -- restore specific behavior, update the test's expectation, or fix a specific line>"
}`;

export function buildExplainFailurePrompt(input: ExplainFailureInput): {
  system: string;
  user: string;
} {
  const user = `## Failing test

${input.testFile} :: ${input.testName}

## Failure message

${input.message}
${input.stack ? `\n## Stack trace\n\n${input.stack}\n` : ''}
${input.reasoningText ? `\n## Agent's stated intent for this diff\n\n${input.reasoningText}\n` : ''}
## Diff

\`\`\`diff
${input.diff}
\`\`\`

Explain the root cause and suggest a concrete fix.`;

  return { system: SYSTEM_PROMPT, user };
}

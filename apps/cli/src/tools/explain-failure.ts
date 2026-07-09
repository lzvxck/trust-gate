import { explainFailure, GROQ_BASE_URL } from '@trust-gate/judge';
import type { InferSchema } from 'xmcp';
import { z } from 'zod';

export const schema = {
  testFile: z.string().describe('Path to the failing test file, as returned by check_regression.'),
  testName: z.string().describe('Name of the failing test, as returned by check_regression.'),
  message: z.string().describe('The failure message, as returned by check_regression.'),
  stack: z.string().optional().describe('The failure stack trace, if available.'),
  diff: z
    .string()
    .describe("The unified diff the test failed against (from check_regression's response)."),
  reasoningText: z
    .string()
    .optional()
    .describe("The agent's own stated intent for this diff, if it has one to share."),
};

export const metadata = {
  name: 'explain_failure',
  description:
    'Given a specific test failure from check_regression (testFile/testName/message/diff), returns an LLM root-cause explanation and a concrete suggested fix. Advisory only. BYO key: requires GROQ_API_KEY and GROQ_MODEL set in the environment running this MCP server.',
  annotations: {
    title: 'Explain a test failure',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
  },
};

export default async function explainFailureTool(args: InferSchema<typeof schema>) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL;

  if (!apiKey || !model) {
    return {
      structuredContent: { error: 'not_configured' },
      content: [
        {
          type: 'text' as const,
          text: 'explain_failure needs GROQ_API_KEY and GROQ_MODEL set in the environment running the trust-gate MCP server (BYO key -- see https://console.groq.com/keys). Neither is set.',
        },
      ],
    };
  }

  try {
    const result = await explainFailure(
      { apiKey, model, baseURL: GROQ_BASE_URL },
      {
        testFile: args.testFile,
        testName: args.testName,
        message: args.message,
        stack: args.stack,
        diff: args.diff,
        reasoningText: args.reasoningText,
      },
    );
    return {
      structuredContent: result,
      content: [
        {
          type: 'text' as const,
          text: `Root cause: ${result.rootCause}\n\nSuggested fix: ${result.suggestedFix}`,
        },
      ],
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      structuredContent: { error: errorMessage },
      content: [{ type: 'text' as const, text: `explain_failure failed: ${errorMessage}` }],
    };
  }
}

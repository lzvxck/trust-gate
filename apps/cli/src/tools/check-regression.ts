import { checkRegression } from '@trust-gate/orchestrator';
import type { InferSchema } from 'xmcp';
import { z } from 'zod';
import { summarizeVerdict } from '../format';

export const schema = {
  repoPath: z
    .string()
    .optional()
    .describe(
      'Absolute path to the repo root. Defaults to CLAUDE_PROJECT_DIR or the current directory.',
    ),
  baseRef: z.string().optional().describe("Git ref to compare against. Defaults to 'HEAD'."),
  maxTests: z
    .number()
    .optional()
    .describe(
      'Cap on at-risk tests actually executed (ignored on full-suite fallback). Default 20.',
    ),
};

export const metadata = {
  name: 'check_regression',
  description:
    'Runs graph+coverage impact analysis and executes the at-risk tests, distinguishing regressions this diff introduced from pre-existing failures. Temporarily stashes uncommitted changes to compare against the base ref, then restores them.',
  annotations: {
    title: 'Check for regressions',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function checkRegressionTool(args: InferSchema<typeof schema>) {
  const repoRoot = args.repoPath ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

  try {
    const verdict = await checkRegression({
      repoRoot,
      baseRef: args.baseRef ?? 'HEAD',
      maxTests: args.maxTests ?? 20,
    });
    return {
      structuredContent: verdict,
      content: [{ type: 'text' as const, text: summarizeVerdict(verdict) }],
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      structuredContent: { status: 'error' as const, errorMessage },
      content: [{ type: 'text' as const, text: `check_regression failed: ${errorMessage}` }],
    };
  }
}

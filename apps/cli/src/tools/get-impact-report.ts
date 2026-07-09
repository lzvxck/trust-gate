import { getImpactReport } from '@trust-gate/orchestrator';
import type { InferSchema } from 'xmcp';
import { z } from 'zod';
import { summarizeBlast } from '../format';

export const schema = {
  repoPath: z
    .string()
    .optional()
    .describe(
      'Absolute path to the repo root. Defaults to CLAUDE_PROJECT_DIR or the current directory.',
    ),
  baseRef: z.string().optional().describe("Git ref to compare against. Defaults to 'HEAD'."),
};

export const metadata = {
  name: 'get_impact_report',
  description:
    'Dry-run blast radius from static graph analysis only -- no test execution. Fast, for planning. Use check_regression to actually run the at-risk tests.',
  annotations: {
    title: 'Get impact report',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function getImpactReportTool(args: InferSchema<typeof schema>) {
  const repoRoot = args.repoPath ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

  try {
    const blast = await getImpactReport({ repoRoot, baseRef: args.baseRef ?? 'HEAD' });
    return {
      structuredContent: blast,
      content: [{ type: 'text' as const, text: summarizeBlast(blast) }],
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      structuredContent: { error: errorMessage },
      content: [{ type: 'text' as const, text: `get_impact_report failed: ${errorMessage}` }],
    };
  }
}

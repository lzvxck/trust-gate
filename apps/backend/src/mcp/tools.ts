import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { checkRegression, getImpactReport } from '@trust-gate/orchestrator';
import { z } from 'zod';
import { summarizeBlast, summarizeVerdict } from './format.js';

/**
 * Hand-rolled against @modelcontextprotocol/sdk directly -- xmcp's experimental
 * Fastify adapter (0.6.13) produces a build where xmcpHandler never survives to
 * the final module.exports (a real bug in how it re-bundles its own prebuilt
 * adapter-fastify.js runtime; confirmed via Object.defineProperty tracing).
 * Same tool logic as apps/cli's stdio tools, over @trust-gate/orchestrator --
 * only the registration API differs between the two transports.
 */
export function registerTools(server: McpServer): void {
  server.registerTool(
    'check_regression',
    {
      description:
        'Runs graph+coverage impact analysis and executes the at-risk tests, distinguishing regressions this diff introduced from pre-existing failures. Temporarily stashes uncommitted changes to compare against the base ref, then restores them.',
      inputSchema: {
        repoPath: z.string().describe('Absolute path to the repo root on the server running this.'),
        baseRef: z.string().optional().describe("Git ref to compare against. Defaults to 'HEAD'."),
        maxTests: z
          .number()
          .optional()
          .describe(
            'Cap on at-risk tests actually executed (ignored on full-suite fallback). Default 20.',
          ),
      },
      annotations: {
        title: 'Check for regressions',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ repoPath, baseRef, maxTests }) => {
      try {
        const verdict = await checkRegression({
          repoRoot: repoPath,
          baseRef: baseRef ?? 'HEAD',
          maxTests: maxTests ?? 20,
        });
        return {
          structuredContent: verdict as unknown as Record<string, unknown>,
          content: [{ type: 'text', text: summarizeVerdict(verdict) }],
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return {
          structuredContent: { status: 'error', errorMessage },
          content: [{ type: 'text', text: `check_regression failed: ${errorMessage}` }],
        };
      }
    },
  );

  server.registerTool(
    'get_impact_report',
    {
      description:
        'Dry-run blast radius from static graph analysis only -- no test execution. Fast, for planning. Use check_regression to actually run the at-risk tests.',
      inputSchema: {
        repoPath: z.string().describe('Absolute path to the repo root on the server running this.'),
        baseRef: z.string().optional().describe("Git ref to compare against. Defaults to 'HEAD'."),
      },
      annotations: {
        title: 'Get impact report',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ repoPath, baseRef }) => {
      try {
        const blast = await getImpactReport({ repoRoot: repoPath, baseRef: baseRef ?? 'HEAD' });
        return {
          structuredContent: blast as unknown as Record<string, unknown>,
          content: [{ type: 'text', text: summarizeBlast(blast) }],
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return {
          structuredContent: { error: errorMessage },
          content: [{ type: 'text', text: `get_impact_report failed: ${errorMessage}` }],
        };
      }
    },
  );
}

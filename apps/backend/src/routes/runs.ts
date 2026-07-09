import type { RegressionVerdict } from '@trust-gate/orchestrator';
import type { FastifyInstance } from 'fastify';
import { requireBearerToken } from '../auth.js';
import { ingestRun } from '../db/ingest-run.js';
import { enqueueAnalyze } from '../queue/queues.js';

interface RunRequestBody {
  repoFullName: string;
  headSha: string;
  baseSha: string;
  verdict: RegressionVerdict;
  trajectory?: {
    agent: string;
    toolCalls?: unknown[];
    reasoningText?: string;
    filesTouched?: unknown[];
  };
}

const runBodySchema = {
  type: 'object',
  required: ['repoFullName', 'headSha', 'baseSha', 'verdict'],
  properties: {
    repoFullName: { type: 'string', minLength: 1 },
    headSha: { type: 'string', minLength: 1 },
    baseSha: { type: 'string', minLength: 1 },
    verdict: {
      type: 'object',
      required: [
        'status',
        'passToPassFailures',
        'newFailures',
        'preExistingFailures',
        'testResults',
        'blast',
        'testsRun',
      ],
      properties: {
        status: { type: 'string', enum: ['pass', 'fail', 'error'] },
        passToPassFailures: { type: 'array' },
        newFailures: { type: 'array' },
        preExistingFailures: { type: 'array' },
        testResults: { type: 'array' },
        blast: {
          type: 'object',
          required: ['affected', 'edges', 'atRiskTests', 'fullSuiteFallback'],
          properties: {
            affected: { type: 'array' },
            edges: { type: 'array' },
            atRiskTests: { type: 'array' },
            fullSuiteFallback: { type: 'boolean' },
          },
        },
        testsRun: { type: 'number' },
        errorMessage: { type: 'string' },
      },
    },
    trajectory: {
      type: 'object',
      required: ['agent'],
      properties: {
        agent: { type: 'string' },
        toolCalls: { type: 'array' },
        reasoningText: { type: 'string' },
        filesTouched: { type: 'array' },
      },
    },
  },
} as const;

export function registerRunsRoute(app: FastifyInstance): void {
  app.post<{ Body: RunRequestBody }>(
    '/runs',
    { preHandler: requireBearerToken, schema: { body: runBodySchema } },
    async (request, reply) => {
      const { repoFullName, headSha, baseSha, verdict, trajectory } = request.body;

      const { runId } = await ingestRun({
        repoFullName,
        headSha,
        baseSha,
        verdict,
        ...(trajectory ? { trajectory } : {}),
      });
      await enqueueAnalyze(runId);

      return reply.code(201).send({ runId });
    },
  );
}

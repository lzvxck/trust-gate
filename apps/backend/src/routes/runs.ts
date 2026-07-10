import type { RegressionVerdict } from '@trust-gate/orchestrator';
import { desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { requireBearerToken } from '../auth.js';
import { db } from '../db/client.js';
import { ingestRun } from '../db/ingest-run.js';
import { repos, runs } from '../db/schema.js';
import { enqueueAnalyze } from '../queue/queues.js';

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

interface ListRunsQuery {
  repoId?: string;
  limit?: string;
  offset?: string;
}

interface RunRequestBody {
  repoFullName: string;
  headSha: string;
  baseSha: string;
  verdict: RegressionVerdict;
  /** 'agent' = local CLI/MCP path, 'pr' = CI/Actions path. Defaults to 'agent'. */
  source?: 'agent' | 'pr';
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
        diff: { type: 'string' },
        errorMessage: { type: 'string' },
      },
    },
    source: { type: 'string', enum: ['agent', 'pr'] },
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
      const { repoFullName, headSha, baseSha, verdict, source, trajectory } = request.body;

      const { runId } = await ingestRun({
        repoFullName,
        headSha,
        baseSha,
        verdict,
        ...(source ? { source } : {}),
        ...(trajectory ? { trajectory } : {}),
      });
      await enqueueAnalyze(runId);

      return reply.code(201).send({ runId });
    },
  );

  app.get<{ Querystring: ListRunsQuery }>(
    '/runs',
    { preHandler: requireBearerToken },
    async (request, reply) => {
      const { repoId, limit: limitParam, offset: offsetParam } = request.query;
      const limit = Math.min(Number(limitParam) || DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT);
      const offset = Number(offsetParam) || 0;

      const rows = await db
        .select({
          id: runs.id,
          repoId: runs.repoId,
          repoFullName: repos.fullName,
          headSha: runs.headSha,
          baseSha: runs.baseSha,
          source: runs.source,
          status: runs.status,
          verdict: runs.verdict,
          createdAt: runs.createdAt,
        })
        .from(runs)
        .innerJoin(repos, eq(runs.repoId, repos.id))
        .where(repoId ? eq(runs.repoId, repoId) : undefined)
        .orderBy(desc(runs.createdAt))
        .limit(limit)
        .offset(offset);

      const items = rows.map(({ verdict, ...rest }) => {
        const v = verdict as RegressionVerdict | null;
        return {
          ...rest,
          passToPassFailures: v?.passToPassFailures.length ?? 0,
          newFailures: v?.newFailures.length ?? 0,
        };
      });

      return reply.send({ runs: items, limit, offset });
    },
  );

  app.get<{ Params: { id: string } }>(
    '/runs/:id',
    { preHandler: requireBearerToken },
    async (request, reply) => {
      const run = await db.query.runs.findFirst({
        where: eq(runs.id, request.params.id),
        with: {
          repo: true,
          trajectories: true,
          impactEdges: true,
          atRiskTests: true,
          testResults: true,
          judgeResults: true,
          regressionEvents: true,
        },
      });

      if (!run) return reply.code(404).send({ error: 'Run not found' });

      return reply.send({ run });
    },
  );

  const TERMINAL_STATUSES = new Set(['pass', 'fail', 'error']);
  const POLL_INTERVAL_MS = 2000;

  app.get<{ Params: { id: string } }>(
    '/runs/:id/stream',
    { preHandler: requireBearerToken },
    async (request, reply) => {
      const run = await db.query.runs.findFirst({ where: eq(runs.id, request.params.id) });
      if (!run) return reply.code(404).send({ error: 'Run not found' });

      reply.hijack();
      reply.raw.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      });

      let lastStatus: string | null = null;
      const send = (status: string) => {
        reply.raw.write(`data: ${JSON.stringify({ status })}\n\n`);
      };

      const tick = async () => {
        const current = await db.query.runs.findFirst({
          where: eq(runs.id, request.params.id),
          columns: { status: true },
        });
        if (!current) return;
        if (current.status !== lastStatus) {
          lastStatus = current.status;
          send(current.status);
        }
        if (TERMINAL_STATUSES.has(current.status)) {
          clearInterval(interval);
          reply.raw.end();
        }
      };

      send(run.status);
      lastStatus = run.status;
      if (TERMINAL_STATUSES.has(run.status)) {
        reply.raw.end();
        return;
      }

      const interval = setInterval(tick, POLL_INTERVAL_MS);
      request.raw.on('close', () => clearInterval(interval));
    },
  );
}

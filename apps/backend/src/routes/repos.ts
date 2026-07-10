import { desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { requireBearerToken } from '../auth.js';
import { db } from '../db/client.js';
import { regressionEvents, repos, runs } from '../db/schema.js';

interface RegressionDayBucket {
  date: string;
  passToPass: number;
  newFail: number;
}

interface RepoSettings {
  /** testFile -> flag it as flaky. Feeds packages/impact's `flakiness` scoring option
   * once a caller actually fetches and passes it through -- not wired in yet, this is
   * just where a self-hoster can record the list. */
  flakyTests?: string[];
}

interface UpdateRepoBody {
  defaultBranch?: string;
  settings?: RepoSettings;
}

const updateRepoBodySchema = {
  type: 'object',
  properties: {
    defaultBranch: { type: 'string', minLength: 1 },
    settings: {
      type: 'object',
      properties: {
        flakyTests: { type: 'array', items: { type: 'string' } },
      },
    },
  },
} as const;

export function registerReposRoute(app: FastifyInstance): void {
  app.get('/repos', { preHandler: requireBearerToken }, async () => {
    const rows = await db
      .select({
        id: repos.id,
        fullName: repos.fullName,
        defaultBranch: repos.defaultBranch,
        createdAt: repos.createdAt,
      })
      .from(repos)
      .orderBy(desc(repos.createdAt));

    return { repos: rows };
  });

  app.get<{ Params: { id: string } }>(
    '/repos/:id',
    { preHandler: requireBearerToken },
    async (request, reply) => {
      const repo = await db.query.repos.findFirst({ where: eq(repos.id, request.params.id) });
      if (!repo) return reply.code(404).send({ error: 'Repo not found' });
      return reply.send({ repo });
    },
  );

  app.patch<{ Params: { id: string }; Body: UpdateRepoBody }>(
    '/repos/:id',
    { preHandler: requireBearerToken, schema: { body: updateRepoBodySchema } },
    async (request, reply) => {
      const { defaultBranch, settings } = request.body;

      const [updated] = await db
        .update(repos)
        .set({
          ...(defaultBranch ? { defaultBranch } : {}),
          ...(settings ? { settings } : {}),
        })
        .where(eq(repos.id, request.params.id))
        .returning();

      if (!updated) return reply.code(404).send({ error: 'Repo not found' });
      return reply.send({ repo: updated });
    },
  );

  app.get<{ Params: { id: string } }>(
    '/repos/:id/regressions',
    { preHandler: requireBearerToken },
    async (request, reply) => {
      const rows = await db
        .select({ kind: regressionEvents.kind, createdAt: runs.createdAt })
        .from(regressionEvents)
        .innerJoin(runs, eq(regressionEvents.runId, runs.id))
        .where(eq(runs.repoId, request.params.id))
        .orderBy(runs.createdAt);

      const byDay = new Map<string, RegressionDayBucket>();
      for (const row of rows) {
        const date = row.createdAt.toISOString().slice(0, 10);
        const bucket = byDay.get(date) ?? { date, passToPass: 0, newFail: 0 };
        if (row.kind === 'pass_to_pass') bucket.passToPass += 1;
        else bucket.newFail += 1;
        byDay.set(date, bucket);
      }

      const series = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
      return reply.send({ series });
    },
  );
}

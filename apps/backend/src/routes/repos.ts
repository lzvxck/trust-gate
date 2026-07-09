import { desc } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { requireBearerToken } from '../auth.js';
import { db } from '../db/client.js';
import { repos } from '../db/schema.js';

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
}

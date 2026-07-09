import Fastify from 'fastify';
import { requireBearerToken } from './auth.js';
import { env } from './env.js';
import { mcpHandler } from './mcp/route.js';
import { mountBullBoard } from './queue/board.js';
import { registerReposRoute } from './routes/repos.js';
import { registerRunsRoute } from './routes/runs.js';
import { registerGithubWebhookRoute } from './webhooks/route.js';

export async function buildServer() {
  const app = Fastify({ logger: true });

  app.get('/healthz', async () => ({ status: 'ok' }));

  registerRunsRoute(app);
  registerReposRoute(app);
  registerGithubWebhookRoute(app);
  app.post('/mcp', { preHandler: requireBearerToken }, mcpHandler);

  if (env.NODE_ENV !== 'production') {
    await mountBullBoard(app, '/admin/queues');
  }

  return app;
}

if (import.meta.main) {
  const { startAnalyzeWorker } = await import('./queue/analyze-worker.js');
  startAnalyzeWorker();

  const { startJudgeWorker } = await import('./queue/judge-worker.js');
  startJudgeWorker();

  const app = await buildServer();
  app.listen({ port: env.PORT, host: env.HOST }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}

import Fastify from 'fastify';
import { env } from './env.js';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.get('/healthz', async () => ({ status: 'ok' }));

  return app;
}

if (import.meta.main) {
  const app = buildServer();
  app.listen({ port: env.PORT, host: env.HOST }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}

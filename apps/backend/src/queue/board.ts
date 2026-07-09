import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import type { FastifyInstance } from 'fastify';
import { analyzeQueue, executeQueue, judgeQueue } from './queues.js';

/** Dev-only visibility into queue activity (plan doc §6: "BullBoard mounted in dev"). */
export async function mountBullBoard(app: FastifyInstance, basePath: string): Promise<void> {
  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath(basePath);

  createBullBoard({
    queues: [analyzeQueue, executeQueue, judgeQueue].map((q) => new BullMQAdapter(q)),
    serverAdapter,
  });

  await app.register(serverAdapter.registerPlugin(), { prefix: basePath });
}

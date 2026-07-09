import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from './env.js';

/** Shared-secret bearer auth. Not full OAuth (that's dashboard/better-auth scope) -- self-hosters set one token, agents/CI send it back. */
export async function requireBearerToken(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  if (!token || token !== env.RUNS_API_TOKEN) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}

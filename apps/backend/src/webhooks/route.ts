import type { FastifyInstance } from 'fastify';
import { webhooks } from './handlers.js';

/**
 * Signature verification is HMAC over the *raw* request bytes, so this route needs a
 * custom content-type parser that skips Fastify's default JSON parsing and hands back
 * the raw string instead. Registered inside `app.register(...)` (not directly on the
 * top-level `app`) so the override is encapsulated to this route only -- Fastify scopes
 * content-type parsers to their registration context, so /runs and /mcp keep the normal
 * JSON parser.
 */
export function registerGithubWebhookRoute(app: FastifyInstance): void {
  app.register(async (instance) => {
    instance.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
      done(null, body);
    });

    instance.post('/webhooks/github', async (request, reply) => {
      const signature = request.headers['x-hub-signature-256'];
      const eventName = request.headers['x-github-event'];
      const deliveryId = request.headers['x-github-delivery'];
      const rawBody = request.body as string;

      if (
        typeof signature !== 'string' ||
        typeof eventName !== 'string' ||
        typeof deliveryId !== 'string'
      ) {
        return reply.code(400).send({ error: 'Missing required GitHub webhook headers' });
      }

      const valid = await webhooks.verify(rawBody, signature);
      if (!valid) {
        return reply.code(401).send({ error: 'Invalid signature' });
      }

      await webhooks.receive({
        id: deliveryId,
        // biome-ignore lint/suspicious/noExplicitAny: eventName is an arbitrary header value; webhooks.verify() above already confirmed the payload's HMAC, and unrecognized event names are simply ignored (no handler registered for them)
        name: eventName as any,
        payload: JSON.parse(rawBody),
      });

      return reply.code(200).send({ ok: true });
    });
  });
}

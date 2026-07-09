import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { registerTools } from './tools.js';

/** Stateless: fresh server + transport per request, matching the MCP Streamable HTTP spec for a server with no session affinity. */
export async function mcpHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  reply.hijack();

  try {
    const server = new McpServer({ name: 'trust-gate', version: '0.1.0' });
    registerTools(server);

    // Omitting sessionIdGenerator (rather than setting it to undefined) is stateless mode --
    // exactOptionalPropertyTypes treats "key present with undefined" differently from "key absent".
    const transport = new StreamableHTTPServerTransport({});

    reply.raw.on('close', () => {
      transport.close();
      server.close();
    });

    // The SDK's own Transport type isn't exactOptionalPropertyTypes-clean (onclose's
    // getter type doesn't structurally match its own interface under this flag) --
    // a real type-only friction in the library, not a runtime concern.
    await server.connect(transport as Parameters<typeof server.connect>[0]);
    await transport.handleRequest(request.raw, reply.raw, request.body);
  } catch (err) {
    request.log.error(err, 'Error handling MCP request');
    if (!reply.raw.headersSent) {
      reply.raw.writeHead(500, { 'content-type': 'application/json' });
      reply.raw.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        }),
      );
    }
  }
}

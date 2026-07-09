import type { XmcpConfig } from 'xmcp';

// Local/CI-first (plan §3): the CLI ships only the stdio build for now.
// The HTTP/Fastify adapter for the backend's /mcp endpoint is Week 4 scope.
const config: XmcpConfig = {
  stdio: {
    silent: true,
  },
  paths: {
    prompts: false,
    resources: false,
  },
};

export default config;

import type { XmcpConfig } from 'xmcp';

// Local/CI-first (plan §3): this project is the stdio build for the local CLI/agent path.
// xmcp only supports one transport target per project (stdio vs. the Fastify adapter
// can't coexist in one build -- confirmed empirically and in xmcp's own docs), so the
// Fastify adapter mounted at the backend's /mcp lives in its own xmcp project inside
// apps/backend, with its own thin tool-wrapper files delegating to the same
// @trust-gate/orchestrator.
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

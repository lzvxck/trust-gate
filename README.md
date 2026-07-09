# Trust Gate

Trajectory-aware regression gate for autonomous coding agents.

Agents touch code all over a codebase, and "run the tests near the changed files" tooling
misses regressions with indirect blast radius (a shared util breaks something three layers
away through a DI container, and nothing flags it). Trust Gate unions static graph analysis
(diff -> affected symbols -> import/call graph) with runtime test coverage to rank the tests
actually at risk, runs them, and distinguishes a **pass-to-pass regression** (passing before,
broken by this diff) from a pre-existing failure or a merely-new test — cheaper than a full
suite run, and catches more than changed-file-only heuristics.

Two entry points onto the same engine: an MCP server an agent calls inline during its own
task (`apps/cli`, stdio, or the backend's `/mcp` over HTTP), and a GitHub Check on the PR as
an independent safety net (in progress).

## Requirements

- [Bun](https://bun.sh) >= 1.3
- [Docker](https://docs.docker.com/get-docker/) (for Postgres + Redis)

## Getting started

```sh
bun install
cp apps/backend/.env.example apps/backend/.env
# set RUNS_API_TOKEN in apps/backend/.env -- guards /runs and /mcp

docker compose -f deploy/docker-compose.yml up -d
bun run db:migrate

bun run --cwd apps/backend dev
```

Health check: `curl http://localhost:3001/healthz`

### Local MCP server (agent path)

```sh
bun run --cwd apps/cli build
node apps/cli/dist/stdio.js   # stdio MCP server: check_regression, get_impact_report
```

## Monorepo layout

```
packages/
  core-graph/     diff -> affected symbols -> import/call graph (ts-morph)
  coverage-map/   per-test V8 coverage -> test<->source map
  impact/         union static+coverage -> ranked at-risk tests
  test-runner/    vitest adapter
  orchestrator/   glue: git diff/stash, ts-morph project loading, ties the above together
apps/
  cli/            trust-gate CLI + stdio MCP server (local/agent path)
  backend/        Fastify API -- /runs ingestion, BullMQ queues + worker, /mcp over HTTP
                  (GitHub webhooks + Checks API integration in progress)
  dashboard/      Next.js dashboard (not started)
deploy/
  docker-compose.yml
```

## Scripts

- `bun run lint` / `bun run lint:fix` — Biome
- `bun run typecheck` — TypeScript across all workspaces
- `bun run test` — Bun test across all workspaces
- `bun run build` — build all workspaces

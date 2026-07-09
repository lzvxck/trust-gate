# Trust Gate

Trajectory-aware regression gate for autonomous coding agents. See
[`trust-gate-mvp-plan-v2.md`](./trust-gate-mvp-plan-v2.md) for the full design.

## Requirements

- [Bun](https://bun.sh) >= 1.3
- [Docker](https://docs.docker.com/get-docker/) (for Postgres + Redis)

## Getting started

```sh
bun install
cp apps/backend/.env.example apps/backend/.env

docker compose -f deploy/docker-compose.yml up -d
bun run db:migrate

bun run --cwd apps/backend dev
```

Health check: `curl http://localhost:3001/healthz`

## Monorepo layout

```
packages/
  core-graph/     diff -> affected symbols -> import/call graph (ts-morph)
  coverage-map/   per-test V8 coverage -> test<->source map
  impact/         union static+coverage -> ranked at-risk tests
  test-runner/    vitest adapter
apps/
  cli/            trust-gate CLI + MCP server
  backend/        Fastify API, webhooks, BullMQ workers, judge
  dashboard/      Next.js dashboard
deploy/
  docker-compose.yml
```

## Scripts

- `bun run lint` / `bun run lint:fix` — Biome
- `bun run typecheck` — TypeScript across all workspaces
- `bun run test` — Bun test across all workspaces
- `bun run build` — build all workspaces

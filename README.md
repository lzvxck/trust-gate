# Trust Gate

[![CI](https://github.com/lzvxck/trust-gate/actions/workflows/ci.yml/badge.svg)](https://github.com/lzvxck/trust-gate/actions/workflows/ci.yml)
[![Publish Docker images](https://github.com/lzvxck/trust-gate/actions/workflows/publish-images.yml/badge.svg)](https://github.com/lzvxck/trust-gate/actions/workflows/publish-images.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)

Trajectory-aware regression gate for autonomous coding agents.

Agents touch code all over a codebase, and "run the tests near the changed files" tooling
misses regressions with indirect blast radius (a shared util breaks something three layers
away through a DI container, and nothing flags it). Trust Gate unions static graph analysis
(diff -> affected symbols -> import/call graph) with runtime test coverage to rank the tests
actually at risk, runs them, and distinguishes a **pass-to-pass regression** (passing before,
broken by this diff) from a pre-existing failure or a merely-new test — cheaper than a full
suite run, and catches more than changed-file-only heuristics. An optional LLM judge
(BYO key) scores the diff against the agent's own stated intent as an advisory signal.

Two entry paths onto the same engine, both landing in one dataset:

- **Agent path** (primary, trajectory-native) — a coding agent calls `check_regression`
  inline over MCP, in its own working tree, before it ever opens a PR. Runs on *your
  machine*, not any server.
- **PR path** (safety net) — a GitHub App webhook fires on PR open/sync, a reusable
  GitHub Actions workflow runs the same engine against the PR, and results post back
  as a real GitHub Check + to a self-hosted dashboard.

## Benchmark

[`BENCHMARK.md`](./BENCHMARK.md) — the union-with-coverage thesis, checked against
`vitest --changed` on purpose-built fixtures modeling the dynamic-import/DI/registry
blind spot: **Trust Gate 3/3, `vitest --changed` 0/3** (plus a static-import control
case both catch, so it isn't just "vitest is broadly worse"). Reproduce it yourself:
`bun run benchmark`.

## Self-hosting

Docker Compose brings up the dashboard, API, Postgres, and Redis. See
**[`docs/`](./docs/README.md)** for the full walkthrough (GitHub App setup, env
vars, access control) — short version:

```sh
bash scripts/setup-env.sh   # scaffolds both .env files
# fill in the GitHub App fields -- see docs/01-github-app.md (or automate it:
# scripts/create-github-app.mjs)
docker compose -f deploy/docker-compose.yml up -d --build
```

Dashboard at `http://localhost:3000`, API at `http://localhost:3001`.

Prefer a released image over building from source? See
[`docs/02-docker-compose.md`](./docs/02-docker-compose.md#using-a-released-image-instead-of-building-from-source)
for `docker-compose.prod.yml`, pulling from GHCR instead.

For a real (non-localhost) deployment, put a reverse proxy in front for TLS — see
[`docs/05-reverse-proxy.md`](./docs/05-reverse-proxy.md).

## Connecting an agent (MCP path)

`@trust-gate/cli` isn't on npm yet (see [`docs/publishing-cli.md`](./docs/publishing-cli.md)),
so build it from this repo for now — see [`docs/03-agent-setup.md`](./docs/03-agent-setup.md).

## Developing on this repo

```sh
bun install
docker compose -f deploy/docker-compose.yml up -d postgres redis
bun run db:migrate
bun run --cwd apps/backend dev
```

```sh
bun run lint       # Biome
bun run typecheck  # TypeScript across all workspaces
bun run test       # Bun test across all workspaces
bun run build      # build all workspaces
```

## Monorepo layout

```
packages/
  core-graph/     diff -> affected symbols -> import/call graph (ts-morph)
  coverage-map/   per-test V8 coverage -> test<->source map
  impact/         union static+coverage -> ranked at-risk tests
  test-runner/    vitest adapter
  orchestrator/   glue: git diff/stash, ts-morph project loading, ties the above together
  judge/          LLM judge (advisory diff-vs-intent scoring, BYO key)
  benchmark/      catch-rate benchmark vs `vitest --changed` -- see BENCHMARK.md
apps/
  cli/            @trust-gate/cli -- CLI + stdio MCP server (agent path)
  backend/        Fastify API, BullMQ workers, GitHub webhooks + Checks API, /mcp over HTTP
  dashboard/      Next.js dashboard -- PR results, judge scores, sign-in via GitHub OAuth
deploy/
  docker-compose.yml
docs/
  self-hosting walkthrough, access control, CLI publishing plan
```

## License

Apache-2.0 — see [`LICENSE`](./LICENSE).

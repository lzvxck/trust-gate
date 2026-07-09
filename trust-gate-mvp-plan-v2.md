# Trust Gate — Verification / Regression Trust Layer for Autonomous Coding Agents
## MVP Implementation Plan v2 — Fully Open-Source, Self-Hostable Edition

**Final stack decisions (locked):** Fully open-source · Self-hostable · Next.js dashboard · Fastify backend · **xmcp** for all MCP surfaces · TypeScript everywhere · Local/CI-first test execution (no hosted sandboxes in MVP).

**Changes from v1:** MCP framework switched from the official `@modelcontextprotocol/sdk` to **xmcp**; the proprietary/FSL split is removed — **everything is open source**; hosting moves from managed-first (Railway/Vercel) to **self-host-first via Docker Compose**, with managed platforms as optional convenience. Fastify, Drizzle/Postgres, BullMQ/Redis, better-auth, and the entire core engine design are unchanged.

---

## 1. Executive Summary and Product Definition

**What the MVP does.** Trust Gate is a tool-agnostic, trajectory-aware regression gate for TypeScript/JavaScript repositories. When a coding agent (Claude Code, Codex, Cursor, Copilot coding agent) produces a diff, Trust Gate:

1. Ingests the diff + agent trajectory via an MCP tool call (local, inline with the agent) or a GitHub PR webhook (safety net).
2. Runs graph-based impact analysis — AST + import/call graph via ts-morph, unioned with a per-test V8 coverage map — to compute the **blast radius**: at-risk tests and call paths, including indirect ones the diff doesn't touch (DI, plugin registries, dynamic imports).
3. Runs the at-risk tests locally or on the customer's GitHub Actions runner.
4. Runs an LLM-as-judge intent-vs-implementation check (advisory, not gating).
5. Returns a structured pass/fail verdict + failure explanations directly to the agent over MCP so it self-corrects **before** human review, and posts a GitHub Check on the PR path.

**What the MVP does NOT do (cut-lines):** no hosted sandbox execution; TS/JS only; single-project graphs (monorepo cross-project deferred); no embedding-based semantic linking at launch; no auto-fix/auto-commit; GitHub only (GitLab/Bitbucket deferred).

**Positioning.** Competitors (CodeRabbit, Greptile, Qodo, Cursor Bugbot) review diffs; Arga Labs runs environment twins. The unoccupied niche is **trajectory-native, graph-based test-impact analysis delivered over MCP, TS/JS-first, and fully open source** — the only player a team can audit, self-host, and extend. Fully-OSS is now itself a differentiator in this category: every direct competitor is closed or open-core.

---

## 2. Architecture Overview

Three deployable pieces, all open source, all in one monorepo:

```
┌────────────────────────────────────────────────────────────────────┐
│  DEVELOPER MACHINE / CI RUNNER                                       │
│  ┌───────────────────────┐        ┌────────────────────────────────┐│
│  │ Coding Agent          │  MCP   │ trust-gate CLI + MCP server    ││
│  │ (Claude Code, Cursor, │◄──────►│ (xmcp, stdio build → npm)      ││
│  │  Codex, Copilot)      │ stdio  │  tools: check_regression,      ││
│  └───────────────────────┘        │  get_impact_report,            ││
│                                    │  explain_failure               ││
│                                    │ Runs impact engine + tests     ││
│                                    │ LOCALLY; optionally posts      ││
│                                    │ results to backend             ││
│                                    └───────────────┬────────────────┘│
└────────────────────────────────────────────────────┼─────────────────┘
                                                      │ HTTPS
              ┌───────────────────────────────────────▼─────────────────┐
              │  BACKEND (Fastify) — self-hosted container               │
              │  - REST API (schema-validated)                            │
              │  - /mcp endpoint (xmcp Fastify adapter, Streamable HTTP)  │
              │  - GitHub App webhooks + Checks API                       │
              │  - BullMQ workers (Redis) → analysis / judge jobs         │
              │  - LLM-judge pipeline (Anthropic/OpenAI, BYO API key)     │
              │  - Drizzle → Postgres: runs, impact, trajectories,        │
              │    regression events                                      │
              └──────────────┬──────────────────────────┬────────────────┘
                             │                           │
              ┌──────────────▼─────────┐    ┌────────────▼───────────────┐
              │ GitHub App             │    │ DASHBOARD (Next.js 15)      │
              │ Checks API, webhooks,  │    │ self-hosted container       │
              │ installation tokens    │    │ PR results · impact graphs  │
              └────────────────────────┘    │ regression analytics ·      │
                                             │ settings · better-auth      │
                                             └─────────────────────────────┘

  Self-host bundle: docker compose up  →  postgres + redis + backend + dashboard
```

**Two entry paths converging on one dataset:**

- **Agent path (primary, trajectory-native).** The agent calls `check_regression` over stdio → the xmcp server runs the impact engine + at-risk tests in the user's environment → returns a structured verdict inline so the agent fixes regressions before opening a PR → optionally posts the run + trajectory to the backend.
- **PR path (safety net).** PR opened → GitHub App webhook → Fastify enqueues a job → a reusable GitHub Actions workflow runs the same engine on the customer's runner → results reported via the Checks API → visible in the dashboard.

Both paths write to the same `runs`, `impact_edges`, `trajectories`, and `regression_events` tables. In a fully-OSS model this dataset belongs to whoever hosts the instance — your moat shifts from proprietary data to **being the reference implementation, the benchmark author, and the hosted-cloud operator** (see §9).

---

## 3. Technology Decisions (final)

| Layer | Choice | Rationale / notes |
|---|---|---|
| Language | TypeScript strict, everywhere | User convention; single-language velocity |
| Backend | **Fastify v5** | Schema-first validation at the boundary (agent inputs are untrusted), ~2–3× Express throughput, coherent plugin model, low ceremony for a solo dev. NestJS's DI payoff arrives at team scale; not needed |
| MCP framework | **xmcp (v0.6.x)** | **User decision — final.** File-based tool routing (`src/tools/`), hot reload, stdio + HTTP transports, and adapters for Next.js/Express/**Fastify**/NestJS — so the hosted MCP endpoint mounts directly into the Fastify backend instead of being a separate service. Risk: v0.6.x, single-studio (basement.studio), ~37 npm dependents. **Mitigation:** all tool logic lives in framework-agnostic packages; xmcp tool files are thin wrappers (~20 lines each). If xmcp stalls, migrating to FastMCP or the official SDK is a day of work, not a rewrite |
| Test execution | **Local + CI-first** | The user's environment already works — sidesteps the hardest infra problem (env reproduction) and the biggest cost center. Hosted sandboxes (Daytona first, since it's open-source/self-hostable and fits the project ethos) are Phase 2 |
| Static analysis | ts-morph (symbol/call graph) + dependency-cruiser (module graph) + V8 coverage map (runtime truth) | Static answers "what could be imported"; coverage answers "what was executed." The union catches the DI/registry/dynamic-import regressions that `vitest --changed` / `jest --findRelatedTests` miss — this is the thesis |
| DB + ORM | **Postgres + Drizzle** | Self-hosted Postgres in Docker Compose by default; Neon/Supabase optional for managed deploys. Drizzle: TS-native schemas, no codegen, SQL-shaped, edge-ready |
| Queue | **BullMQ + Redis** | Self-hostable (Redis container in the compose bundle), MIT, mature. Idempotent handlers keyed on `runId` |
| Auth | **better-auth** | Self-hosted by design — users live in your own Postgres. GitHub OAuth is the only login needed. Do not rely on Next.js middleware alone for session checks (CVE-2025-29927); validate server-side |
| Dashboard | Next.js 15 (App Router), Tailwind v4, shadcn/ui, TanStack Query, Recharts, React Flow | Standard modern stack; SSE for run streaming |
| Deployment | **Docker Compose first** (any VPS, Coolify, self-managed) | One `docker compose up` gives postgres + redis + backend + dashboard. Optionally: backend on Railway/Fly, dashboard on Vercel, DB on Neon — but the repo never depends on any managed primitive |
| LLM judge | Anthropic Claude (Sonnet-class) or OpenAI, **BYO API key** | Self-hosters bring their own key; the judge is optional and advisory. Structured output, rubric-decomposed |

---

## 4. Core Engine Design (unchanged from v1)

pnpm monorepo, TS strict, conventional commits:

```
packages/
  core-graph/        # ts-morph diff → affected symbols → callers (call graph)
  coverage-map/      # per-test V8 coverage → test↔source map (incremental, hashed)
  impact/            # union static+coverage → ranked at-risk tests + blast score
  test-runner/       # vitest adapter (jest deferred); runs selected tests
apps/
  cli/               # trust-gate CLI + xmcp stdio server → published to npm
  backend/           # Fastify: API, webhooks, BullMQ workers, judge, xmcp HTTP adapter
  dashboard/         # Next.js 15
deploy/
  docker-compose.yml # postgres + redis + backend + dashboard
```

**Pipeline stages:**

1. **Diff parsing:** unified diff → `{file, hunks, changedLines[]}`.
2. **Symbol resolution:** ts-morph maps changed lines → enclosing declarations → `AffectedSymbol[]`.
3. **Call-graph construction:** `findReferences` / type-checker computes callers transitively to bounded depth; dependency-cruiser gives the fast file-level pre-filter.
4. **Test mapping (two signals, unioned):** (a) static — test files transitively importing affected files; (b) coverage — tests whose recorded V8 coverage (`NODE_V8_COVERAGE`, built once per test file, incrementally refreshed by content hash, cached in Postgres) touched affected lines. Embedding-based linking is Phase 2.
5. **Ranking / blast-radius scoring:** score = f(edge directness, coverage-hit recency, affected-symbol count on path, historical flakiness penalty). Cap the set by top-N or time budget; unknown/new files always set `fullSuiteFallback = true`. *When in doubt, run more, never less.*
6. **Execution + verdict:** run ranked tests; the key signal is **pass-to-pass failures** — tests that passed on base, fail on head.

**Key interfaces:**

```ts
interface AffectedSymbol { file: string; name: string; kind: 'function'|'class'|'method'|'export'|'variable'; startLine: number; endLine: number; }
interface ImpactEdge { from: string; to: string; kind: 'imports'|'calls'|'covers'; weight: number; }
interface AtRiskTest { testFile: string; testName?: string; score: number; reason: ('static-import'|'coverage')[]; }
interface BlastRadius { affected: AffectedSymbol[]; edges: ImpactEdge[]; atRiskTests: AtRiskTest[]; fullSuiteFallback: boolean; }
interface TestFailure { testFile: string; testName: string; message: string; stack?: string; likelyCause?: string; }
interface RegressionVerdict { status: 'pass'|'fail'|'error'; passToPassFailures: TestFailure[]; newFailures: TestFailure[]; judge?: JudgeResult; blast: BlastRadius; }
```

Coverage-provider note: prefer `@vitest/coverage-v8`, keep `@vitest/coverage-istanbul` as fallback (Vitest v4 V8 remapping has an open line-undercount regression in TSX/JSX returns, issue #9457).

---

## 5. MCP Server Design (xmcp)

**Two builds from one tool directory.** xmcp auto-discovers tools from `src/tools/`; the same tool files compile to (a) a **stdio** build shipped inside the `trust-gate` npm package for local agent use, and (b) an **HTTP (Streamable HTTP)** endpoint mounted into the Fastify backend via xmcp's Fastify adapter at `/mcp` for remote/CI scenarios. One source of truth, two transports.

**Tool files (xmcp convention — schema + metadata + default export):**

```
apps/cli/src/tools/
  check-regression.ts     # core: run impact + at-risk tests, return RegressionVerdict
  get-impact-report.ts    # dry-run blast radius, no test execution (fast, for planning)
  explain-failure.ts      # LLM root-cause for a specific failure (BYO key or backend proxy)
  # phase 2: generate-regression-tests.ts
```

Each file exports a Zod `schema`, a `metadata` object, and a default async function that delegates immediately to `@trust-gate/impact` / `@trust-gate/test-runner` — keeping xmcp a thin, swappable shell.

**Design conventions (MCP best practices):**

- **Naming:** consistent action-oriented names; the server is small enough that a `trust_gate_` prefix is unnecessary, but tool descriptions state scope explicitly.
- **Structured output:** return a human-readable text block **and** the typed verdict. Define output schemas where xmcp supports them; if a given xmcp version lacks `outputSchema`/`structuredContent` passthrough, embed the JSON verdict as a fenced block in the text response and track the feature upstream — do not fork.
- **Annotations:** `get_impact_report` → `readOnlyHint: true`; `check_regression` → `readOnlyHint: false` (executes tests), `destructiveHint: false`, `idempotentHint: true`.
- **Actionable errors:** failure messages tell the agent *what to do next* ("Test X asserts behavior Y at src/foo.ts:42; your change to `parseConfig` altered its return shape — restore the `null` fallback or update the contract and its 3 dependent tests: …").
- **Context economy:** cap verdicts to the top-N failures with a `totalFailures` count and a `runId` for `explain_failure` follow-ups — don't dump 200 stack traces into the agent's context.
- **Testing:** validate both builds with MCP Inspector (`npx @modelcontextprotocol/inspector`) in CI; add a 10-question eval set exercising the tools end-to-end on a seeded repo (independent, read-only where possible, verifiable answers).

**Install (one command):**

- Claude Code: `claude mcp add --transport stdio trust-gate -- npx -y trust-gate mcp` (server resolves project root from `CLAUDE_PROJECT_DIR`, falling back to cwd).
- Cursor / VS Code / Claude Desktop: shipped `.mcp.json` / `.cursor/mcp.json` snippet (`npx -y trust-gate mcp`) + a Cursor deeplink in the README; `.mcpb` bundle for one-click Claude Desktop install.
- Remote: point any Streamable-HTTP client at `https://<your-backend>/mcp`, auth via bearer token (xmcp `withAuth` on the adapter).

---

## 6. Backend Design (Fastify)

**API surface (schema-validated via Fastify JSON schemas, which double as OpenAPI):**

- `POST /webhooks/github` — GitHub App webhooks (`@octokit/webhooks`, signature-verified; ACK fast, enqueue, return 200).
- `POST /runs` — ingest a run + trajectory from the local CLI/MCP path (token-authed).
- `GET /runs/:id`, `GET /runs/:id/stream` (SSE) — results + live status.
- `GET /repos/:id/analytics` — regression trends.
- `ALL /mcp` — xmcp Fastify adapter (Streamable HTTP).

**GitHub App:** permissions Checks RW, Pull requests R, Contents R, Metadata R; events `pull_request`, `check_suite`. JWT app auth (`@octokit/auth-app`) → per-installation tokens (1h TTL). On PR open/sync: `checks.create` (in_progress) → enqueue → worker dispatches the customer's reusable Actions workflow (`workflow_dispatch`) or maps already-posted local results → `checks.update` with `success|failure|neutral` + line annotations on failing tests.

**Queue (BullMQ):** queues `analyze`, `execute`, `judge`. Idempotent on `runId`, exponential backoff, BullBoard mounted in dev.

**LLM-judge pipeline (advisory only):** rubric decomposed into atomic criteria — (a) implementation satisfies trajectory-stated intent, (b) no out-of-scope behavior, (c) diff consistent with at-risk test expectations. Categorical integer scores + reasoning, schema-constrained output, 3× retry with backoff. **Calibrate against a hand-labeled gold set (≥80% agreement) before surfacing scores.** The deterministic pass-to-pass signal is the gate; the judge annotates. BYO API key for self-hosters; judge disabled gracefully if no key is set.

**Data model (Drizzle/Postgres):**

```
repos(id, github_installation_id, full_name, default_branch, settings_jsonb)
runs(id, repo_id, head_sha, base_sha, source['agent'|'pr'], status, verdict_jsonb, created_at)
trajectories(id, run_id, agent, tool_calls_jsonb, reasoning_text, files_touched_jsonb)
impact_edges(id, run_id, from_symbol, to_symbol, kind, weight)
at_risk_tests(id, run_id, test_file, test_name, score, reasons_jsonb)
test_results(id, run_id, test_file, test_name, status, was_passing_before, message, stack)
regression_events(id, run_id, test_file, test_name, kind['pass_to_pass'|'new_fail'], detected_at)
judge_results(id, run_id, criterion, score_int, reasoning, model)
users / sessions / accounts        (better-auth)
coverage_cache(repo_id, test_file_hash, coverage_jsonb, built_at)
```

---

## 7. Dashboard Design (Next.js 15)

- **PR gate results:** per-run verdict, pass-to-pass failures with explanations, the at-risk set with *why each test was selected* (static/coverage), judge scores.
- **Impact graph:** interactive blast-radius view (React Flow over `impact_edges`): diff symbols → callers → tests.
- **Regression analytics:** pass-to-pass failures per PR over time, catch rate, top regression-prone files, per-agent regression rates.
- **Repo settings:** GitHub App install, execution mode (local vs CI), test time budget, full-suite-fallback policy, judge on/off + model.
- Auth: GitHub OAuth via better-auth, sessions in Postgres, server-side validation. Real-time: SSE from `GET /runs/:id/stream`.

---

## 8. Self-Hosting & Deployment

- `deploy/docker-compose.yml`: `postgres:17`, `redis:7`, `backend` (Fastify + workers in one image, `WORKER_MODE` env to split later), `dashboard` (Next.js standalone output). Single `.env` (`DATABASE_URL`, `REDIS_URL`, `GITHUB_APP_*`, `ANTHROPIC_API_KEY?`, `AUTH_SECRET`).
- Drizzle migrations run on container start (`drizzle-kit migrate`).
- Health endpoints (`/healthz`) on both apps; example Caddy/Traefik reverse-proxy config in `deploy/`.
- GitHub App setup is the only manual step — document it with a click-by-click guide + a `manifest.json` app-manifest flow to automate creation.
- Optional managed path documented but never required: Railway/Fly (backend), Vercel (dashboard), Neon (DB), Upstash (Redis).

---

## 9. Open-Source & Sustainability Strategy (fully OSS)

**Everything is open source — one public monorepo.** No FSL, no proprietary split.

**License recommendation:**

- **Packages + CLI/MCP server: Apache-2.0.** Maximum adoption for the wedge, explicit patent grant, zero friction for companies embedding the engine.
- **Backend + dashboard: your call between Apache-2.0 and AGPL-3.0.** Apache everywhere is the simplest story ("100% Apache-2.0") and maximizes career/adoption signal. AGPL on the server apps keeps everything genuinely open source while deterring a cloud vendor from selling your hosted product without contributing back — the Grafana/Cal.com pattern. If a future hosted cloud is the business model, AGPL-3.0 on `apps/` + Apache-2.0 on `packages/` is the recommended split; if the goal is pure adoption and portfolio signal, go all-Apache.

**Sustainability without proprietary code (the Langfuse/Cal.com playbook):** monetize *operation*, not code — (1) a hosted cloud you run (same OSS code, zero-ops convenience, ~$20–30/dev/mo vs CodeRabbit $24–30 and Bugbot $40); (2) GitHub Sponsors early; (3) paid support/onboarding for self-hosting teams; (4) later, an enterprise support tier (SSO config help, SLAs — services, not gated features). The moat shifts to: reference-implementation status, the public benchmark you author, install-base network effects, and operating the cloud.

**Launch plan:** (1) ship the standalone-useful CLI + MCP server to npm; (2) publish a reproducible benchmark — pass-to-pass regression catch rate vs `vitest --changed` / `jest --findRelatedTests` on ≥3 real OSS TS repos, targeting the DI/registry blind-spot cases explicitly; (3) "Show HN" anchored on the benchmark + a demo video of Claude Code catching and fixing its own regression before opening a PR; (4) `docker compose up` self-host guide front and center in the README — in this category, "fully open source and self-hostable" *is* the headline differentiator.

---

## 10. Week-by-Week Roadmap (8 weeks)

| Week | Ship | Milestone / cut-line |
|---|---|---|
| 1 | Monorepo, CI, `core-graph` (diff→symbols→callers), Fastify skeleton, Drizzle schema, compose file with postgres+redis | Given a diff: affected symbols + file-level import graph |
| 2 | `coverage-map` + `impact` (union, blast scoring), `test-runner` vitest adapter | Ranked at-risk tests run locally; pass-to-pass failures detected. **Cut: jest adapter, embeddings** |
| 3 | `apps/cli`: xmcp stdio server + CLI, tools `check_regression` + `get_impact_report`, npm publish, one-command installs, MCP Inspector in CI | Claude Code calls `check_regression`, gets structured verdict inline. **The demoable core.** Fallback: if xmcp blocks structured output or stdio packaging, wrap the same tool functions in FastMCP — thin-wrapper design makes this hours |
| 4 | GitHub App + webhooks + Checks API, `/runs` ingestion, BullMQ, reusable Actions workflow, xmcp Fastify adapter at `/mcp` | Open a PR → check turns red on a real pass-to-pass regression; <2 min p50 mid-size diff |
| 5 | LLM-judge pipeline + `explain_failure` tool, gold-set calibration | Failures return root-cause explanations; judge ≥80% gold-set agreement, FP rate on clean PRs <10% — else ship deterministic-only |
| 6 | Dashboard: auth, PR results, impact graph, settings, SSE. Harden compose bundle (migrations-on-start, healthz, reverse-proxy example) | End-to-end visible in browser; `docker compose up` works on a clean VPS |
| 7 | Regression analytics, trajectory ingestion/storage, flaky-test handling, FP tuning, idempotency, self-host docs + app-manifest flow | Analytics live; a stranger can self-host from the README |
| 8 | Benchmark on ≥3 OSS TS repos, 10-question MCP eval set, README/docs polish, `.mcpb` bundle, Show HN + npm + benchmark writeup | **Launch.** Cut: `generate_regression_tests`, hosted sandboxes, monorepo support |

---

## 11. Cost Model

- **Self-hoster:** one small VPS (~$5–20/mo) runs the whole compose stack; test execution is on their machines/CI; LLM-judge is BYO key (~$0.02–0.10 per PR, optional).
- **You (pre-cloud):** ~$0 fixed — dogfood on your own VPS; npm/GitHub are free. The only spend is judge tokens during development and the benchmark run.
- **Future hosted cloud:** same compose stack on Fly/Railway (~$40–80/mo at MVP scale) + metered judge tokens; ~$20–30/dev/mo pricing leaves healthy margin against CodeRabbit ($24–30), Greptile ($30/seat + overage), Bugbot ($40).

---

## 12. Risks & Mitigations

- **xmcp maturity (the accepted risk):** v0.6.x, single studio, small dependent base; possible gaps in structured output or spec-lag. *Mitigation:* thin-wrapper tool files over framework-agnostic packages; FastMCP/official-SDK escape hatch measured in hours; pin the version; MCP Inspector conformance check in CI catches breakage on upgrade.
- **Call-graph false negatives:** dynamic dispatch/DI evade static graphs. *Mitigation:* the coverage-map union is the thesis; full-suite fallback for unknown files.
- **False positives / flaky tests** (the trust-killer): flakiness penalty in scoring, auto re-run suspected flakes, historical flakiness tracked in `test_results`, confidence surfaced in verdicts.
- **Coverage-map build cost:** O(suite) initial build. *Mitigation:* incremental by test-file hash, cached in Postgres; validate on a real large suite before promising numbers.
- **Fully-OSS free-riding:** a vendor could host your code as a service. *Mitigation:* AGPL option on `apps/` (§9); regardless of license, benchmark authorship + reference-implementation status + cloud operations are yours.
- **Incumbent encroachment** (GitHub, Cursor, Greptile add test execution): move fast on the trajectory-native + MCP + OSS niche; the open community is a defense closed competitors can't replicate.
- **Judge unreliability:** advisory-only, rubric-decomposed, calibrated; the deterministic signal gates.

---

## 13. Success Metrics & Gates

- **Week 3:** `check_regression` from Claude Code catches ≥90% of injected pass-to-pass regressions on a seeded repo that `vitest --changed` misses. **If not, stop feature work and fix the graph/coverage union — it's the whole thesis.**
- **Week 4:** GitHub Check correctly red on a real regression PR end-to-end, <2 min p50.
- **Week 5:** judge ≥80% gold-set agreement, <10% FP on clean PRs — else deterministic-only launch.
- **Week 6:** `docker compose up` → working instance on a clean VPS in <15 minutes.
- **Week 8:** published benchmark shows materially higher catch rate than `vitest --changed` on ≥3 real repos.
- **Post-launch (30/60/90d):** GitHub stars + npm weekly installs (wedge adoption); self-host instances (opt-in telemetry ping, off by default and clearly disclosed); repos gated; north star: **reduction in agent-caused pass-to-pass regressions per merged PR** on gated repos. Cloud waitlist signups decide when to stand up the hosted tier.

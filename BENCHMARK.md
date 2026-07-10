# Trust Gate catch-rate benchmark

Generated 2026-07-10T00:01:54.504Z.

Trust Gate's `check_regression` unions a static import-graph analysis with runtime test coverage; `vitest --changed` is purely static-import-graph-based. The gap between them is regressions reached only through dynamic imports, DI containers, or string-keyed plugin registries -- no static import edge exists for either tool to follow, but Trust Gate still knows (from coverage data) which tests actually exercise that code at runtime. These are purpose-built fixtures (`src/fixtures/`) modeling that specific pattern in three realistic contexts, plus one plain static-import control case to confirm the benchmark isn't rigged -- not a random sample of real-world OSS regressions.

## Summary

| | Trust Gate | `vitest --changed` |
|---|---|---|
| Dynamic-import/DI/registry blind spot (3 scenarios) | 3/3 (100%) | 0/3 (0%) |
| Static-import control (1 scenario) | 1/1 (100%) | 1/1 (100%) |

## Per-scenario detail

| Scenario | Pattern | Trust Gate | `vitest --changed` |
|---|---|---|---|
| `plugin-registry` | CLI-style plugin dispatch: registry[key]() loaded via a runtime-computed import path | ✅ caught | ❌ missed |
| `di-container` | Dependency-injection container resolving services by string token | ✅ caught | ❌ missed |
| `dynamic-routes` | File-based route handler resolved from a request path at runtime | ✅ caught | ❌ missed |
| `static-control` | Plain, directly-imported source file -- both tools are expected to catch this | ✅ caught | ✅ caught |

## Raw detail

### plugin-registry

Expected failure: `src/dispatch.test.ts :: upper`

- Trust Gate: ✅ caught (3767ms) -- passToPassFailures: src/dispatch.test.ts :: upper
- `vitest --changed`: ❌ missed (551ms) -- not selected -- 0 test(s) ran: none

### di-container

Expected failure: `src/container.test.ts :: greeter`

- Trust Gate: ✅ caught (3876ms) -- passToPassFailures: src/container.test.ts :: greeter
- `vitest --changed`: ❌ missed (542ms) -- not selected -- 0 test(s) ran: none

### dynamic-routes

Expected failure: `src/router.test.ts :: about`

- Trust Gate: ✅ caught (3771ms) -- passToPassFailures: src/router.test.ts :: about
- `vitest --changed`: ❌ missed (536ms) -- not selected -- 0 test(s) ran: none

### static-control

Expected failure: `src/math.test.ts :: add`

- Trust Gate: ✅ caught (3614ms) -- passToPassFailures: src/math.test.ts :: add
- `vitest --changed`: ✅ caught (846ms) -- selected, status=fail

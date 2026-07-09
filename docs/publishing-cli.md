# Publishing @trust-gate/cli to npm

Not yet published. Publishing itself needs an npm account with access to the
`@trust-gate` org, which isn't something that can be done from here — this is
the runbook for when that happens. Both real blockers found while preparing this
are now resolved and verified:

## Blocker 1 (fixed): the name `trust-gate` is squatted

An unrelated package already owns the unscoped name on the npm registry. Renamed
to **`@trust-gate/cli`**, matching the existing internal workspace scope
(`@trust-gate/orchestrator`, `@trust-gate/judge`, etc.). The `bin` command stays
`trust-gate` regardless of package name (`package.json`'s `bin` field is
independent of the package name), so usage (`trust-gate report`) and docs don't
change once installed.

**Still needs verifying before publishing** (can't be checked from here — no way
to confirm npm org availability without an authenticated npm session): confirm
the `@trust-gate` org itself is claimable via `npm org create trust-gate` or
`https://www.npmjs.com/org/create`. If it's taken, the rename needs to go one
level further (e.g. `@trustgate-run/cli`, `trustgate-cli` unscoped).

## Blocker 2 (fixed): `report` wasn't actually self-contained

`apps/cli/dist-cli/` used to be built with plain `tsc`, which deliberately
resolved `@trust-gate/orchestrator` via normal `node_modules` lookup (the
monorepo's workspace symlink) rather than inlining it — invisible inside this
repo, but `npm install @trust-gate/cli` from outside would have 404'd on that
import, since `@trust-gate/orchestrator` has never itself been published.

Fixed: `apps/cli/package.json`'s `build:cli` script now bundles `src/cli.ts` with
esbuild (`--bundle --platform=node --format=esm`), inlining everything except
`ts-morph` (a real published package, kept `--external` and declared as a normal
`dependency` — it's the one thing genuinely needed at install time; `zod`,
`openai`, and `xmcp` all turned out to be fully inlined by both build outputs
already, so they moved to `devDependencies`). `@trust-gate/orchestrator` and
`@trust-gate/judge` are `devDependencies` now (`workspace:*`) — needed to bundle
*from* at build time, not needed by anyone who installs the published package.

**Verified, not just built cleanly**: copied the built `dist-cli/cli.js` to a
directory completely outside this repo, `bun add ts-morph` there (nothing else),
and ran `report` against a real scratch git repo with an actual regression. It
correctly ran the diff/coverage/test pipeline and caught the regression — proves
the bundle has zero dependency on this repo's workspace symlinks, not just that
`grep` found no `@trust-gate/` imports left in it.

(The `mcp` command was already fine before this fix — `xmcp build` bundles
`dist/stdio.js` fully self-contained on its own.)

Deferred, not required to unblock the CLI: publishing `packages/*` as their own
public `@trust-gate/*` packages too, which would also match the original
Apache-2.0 "embed the engine directly" adoption goal from the plan.

## Checklist, once the org is confirmed

1. `apps/cli/package.json`: remove `"private": true`, add `"publishConfig": { "access": "public" }`
   (scoped packages default to requiring a paid private registry unless this is set),
   add `description`, `repository`, `homepage`, `keywords` (`license` is already set).
2. Add a `"files"` field (or `.npmignore`) so only `dist-cli/` and `dist/` ship —
   not `src/`.
3. `bun run --cwd apps/cli build`, then `cd apps/cli && npm pack --dry-run` —
   inspect the tarball contents before publishing anything.
4. `npm login`, then `npm publish --access public` from `apps/cli/`.
5. Verify from *outside* this repo: `npx -y @trust-gate/cli mcp` in a scratch
   directory with no local clone.
6. Drop the "not published yet" caveats in this repo: `docs/03-agent-setup.md`,
   root `README.md`, `.github/workflows/regression-check.yml`'s comment.
7. Optional follow-up: a release GitHub Actions workflow (`npm publish` on a git
   tag push, `NPM_TOKEN` as a repo secret) so this doesn't stay a manual step
   forever.

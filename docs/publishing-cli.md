# Publishing @trust-gate/cli to npm

Published: [`@trust-gate/cli`](https://www.npmjs.com/package/@trust-gate/cli), currently
`0.1.0`. This doc is kept as the runbook for future releases. Both real blockers found
while preparing the first publish are resolved and verified:

## Blocker 1 (fixed): the name `trust-gate` is squatted

An unrelated package already owns the unscoped name on the npm registry. Renamed
to **`@trust-gate/cli`**, matching the existing internal workspace scope
(`@trust-gate/orchestrator`, `@trust-gate/judge`, etc.). The `bin` command stays
`trust-gate` regardless of package name (`package.json`'s `bin` field is
independent of the package name), so usage (`trust-gate report`) and docs don't
change once installed.

**Verified**: the `@trust-gate` org was unclaimed and is now created. Note the npm
CLI has no `org create` subcommand (`npm org set/ls/rm` only manage an *existing*
org) — creation is web-UI only, at `https://www.npmjs.com/org/create`.

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

## Checklist (done for `0.1.0`)

1. ✅ `apps/cli/package.json`: removed `"private": true`, added `"publishConfig": { "access": "public" }`
   (scoped packages default to requiring a paid private registry unless this is set),
   `description`, `repository`, `homepage`, `keywords` (`license` was already set).
2. ✅ Added a `"files"` field (`["dist-cli", "dist"]`) so only the build output ships —
   not `src/`.
3. ✅ `bun run --cwd apps/cli build`, then `cd apps/cli && npm pack --dry-run` —
   inspected the tarball (7 files, ~2.9MB packed) before publishing anything.
4. ✅ `npm publish --access public` from `apps/cli/`.
   **Gotcha**: a plain `npm login`-issued token couldn't complete the account's 2FA
   challenge for publish (hard `403`, no OTP prompt ever appeared, even with a fresh
   `--otp=...`) — this looked like the standard "enter your OTP" flow but wasn't.
   Fixed by generating a **granular access token** on npmjs.com (Read and write,
   scoped to the `@trust-gate` packages) and pointing npm at it for just this one
   publish via `--userconfig=<path-to-a-throwaway-.npmrc>` (a project-local `.npmrc`
   inside a bun/npm workspace member gets silently ignored — `npm warn config
   ignoring workspace config` — so it has to live outside the workspace tree).
   The throwaway config file was deleted immediately after.
5. ✅ Verified from *outside* this repo: `npx -y @trust-gate/cli --help` in a scratch
   directory with no local clone — resolved and ran correctly.
6. ✅ Dropped the "not published yet" caveats in this repo: `docs/03-agent-setup.md`,
   root `README.md`, `.github/workflows/regression-check.yml`'s comment.
7. Optional follow-up, still open: a release GitHub Actions workflow (`npm publish`
   on a git tag push, `NPM_TOKEN` as a repo secret — would need to be a granular
   token per the gotcha above) so future releases don't stay a manual step.

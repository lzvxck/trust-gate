# 3. Connect a coding agent (MCP path)

This is the primary, trajectory-native path: your agent calls `check_regression`
inline, against your actual working tree, before it ever opens a PR. It runs on
**your machine**, not the server stack from step 2.

`@trust-gate/cli` isn't published to npm yet (see [publishing-cli.md](./publishing-cli.md)),
so for now you build it from source:

```sh
git clone https://github.com/lzvxck/trust-gate
cd trust-gate && bun install
bun run --cwd apps/cli build
```

Then point your agent's MCP config at the built stdio server. For Claude Code
(`.mcp.json`):

```json
{
  "mcpServers": {
    "trust-gate": {
      "command": "node",
      "args": ["/absolute/path/to/trust-gate/apps/cli/dist-cli/cli.js", "mcp"]
    }
  }
}
```

Once `@trust-gate/cli` is on npm, this collapses to `"command": "npx", "args": ["-y", "@trust-gate/cli", "mcp"]` —
no local clone needed.

Two tools are exposed: `check_regression` (runs the gate against your uncommitted
diff) and `get_impact_report` (blast-radius only, no test execution). Both return
the verdict straight back into the agent's conversation — nothing is posted to a
backend from the `mcp` command itself, so agent-path runs won't show up in the
dashboard unless you also wire up reporting yourself (the `report` subcommand,
used by the PR/CI path, is what actually POSTs to `/runs` — see
`apps/cli/src/report.ts`).

# Self-hosting Trust Gate

Trust Gate has two independent parts. Know which one you're setting up:

1. **The server stack** (dashboard + backend API + Postgres + Redis) — self-hosted via
   Docker Compose. Receives PR webhooks, runs the LLM judge, serves the dashboard.
   Read [01-github-app.md](./01-github-app.md), then [02-docker-compose.md](./02-docker-compose.md).
2. **The agent/MCP path** — runs on *your own machine* (or a CI runner), not the
   server. It's how a coding agent calls `check_regression` inline against your
   actual working tree. Read [03-agent-setup.md](./03-agent-setup.md).

Also see [04-access-control.md](./04-access-control.md) — self-hosted instances are
single-tenant (no per-user data scoping), so gating *who can sign in* matters — and
[05-reverse-proxy.md](./05-reverse-proxy.md) if you're deploying somewhere real
rather than trying it out on `localhost`.

If you're publishing a new version of the CLI rather than self-hosting the server,
see [publishing-cli.md](./publishing-cli.md) instead — different audience, not part
of the self-host flow.

## Order of operations

```
1. Create a GitHub App             -> 01-github-app.md
2. docker compose up               -> 02-docker-compose.md
3. Set ALLOWED_EMAILS              -> 04-access-control.md
4. (production) reverse proxy/TLS  -> 05-reverse-proxy.md
5. (optional) connect your agent   -> 03-agent-setup.md
```

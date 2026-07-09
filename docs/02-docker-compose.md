# 2. Bring up the server stack

```sh
bash scripts/setup-env.sh   # scaffolds both .env files, generates BETTER_AUTH_SECRET
# fill in the GitHub App fields from step 1, plus:
#   RUNS_API_TOKEN / BACKEND_API_TOKEN -- any shared secret, must match across both files
#   ALLOWED_EMAILS -- see 04-access-control.md

docker compose -f deploy/docker-compose.yml up -d --build
```

That's it — `postgres`, `redis`, `backend`, and `dashboard` all start, and each app
runs its own Drizzle migrations on boot (idempotent, safe to re-run). No manual
`db:migrate` step needed.

- Dashboard: `http://localhost:3000`
- Backend health check: `curl http://localhost:3001/healthz`
- Logs: `docker compose -f deploy/docker-compose.yml logs -f backend dashboard`

`DATABASE_URL`/`REDIS_URL`/`BACKEND_URL` in the `.env` files can stay pointed at
`localhost` — the compose file overrides them to the in-network service names
(`postgres`, `redis`, `backend`) automatically, so the same `.env` files also work
for running either app directly on your host during development.

To reset to a clean database: `docker compose -f deploy/docker-compose.yml down -v`.

## Using a released image instead of building from source

`deploy/docker-compose.yml` always builds from source (`--build`). Once
`.github/workflows/publish-images.yml` has pushed at least one image (any push to
`main`), `deploy/docker-compose.prod.yml` pulls those instead — same env/volume
layout, just `image:` instead of `build:`:

```sh
docker compose -f deploy/docker-compose.prod.yml up -d
```

Pin a specific released version rather than `latest`:

```sh
TRUST_GATE_IMAGE_TAG=v0.1.0 docker compose -f deploy/docker-compose.prod.yml up -d
```

First time only: GHCR packages default to **private** even on a public repo — after
the first push, go to the package's page on GitHub (from the repo sidebar, or
`github.com/lzvxck/trust-gate/pkgs/container/trust-gate-backend`) and set visibility
to Public, or `docker pull` will fail with an auth error for anyone who isn't you.

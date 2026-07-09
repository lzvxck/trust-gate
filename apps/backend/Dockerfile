# Built from the monorepo root (`docker build -f apps/backend/Dockerfile .`) --
# the backend depends on workspace packages (@trust-gate/orchestrator, @trust-gate/judge)
# resolved via Bun's workspace symlinks, so the whole repo is the build context.
FROM oven/bun:1

WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile

EXPOSE 3001

# Migrations run on container start (plan §8): idempotent, safe to re-run every boot.
CMD ["sh", "-c", "bun run --cwd apps/backend db:migrate && bun apps/backend/src/server.ts"]

# Built from the monorepo root (`docker build -f apps/dashboard/Dockerfile .`) --
# Bun workspaces need the whole repo present to resolve the lockfile/install graph.
#
# Uses a full `next build` + `next start` rather than the standalone output: the
# standalone bundle only traces files reachable from Next's route graph, which
# excludes the db:migrate script (a plain CLI entrypoint, not a route) and its
# deps -- not worth the path juggling for a self-host-first MVP image.
FROM oven/bun:1

WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile
RUN bun run --cwd apps/dashboard build

EXPOSE 3000

# Migrations (better-auth's own user/session/account/verification tables) run on
# container start, same as the backend -- idempotent, safe to re-run every boot.
CMD ["sh", "-c", "bun run --cwd apps/dashboard db:migrate && bun run --cwd apps/dashboard start"]

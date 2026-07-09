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

# `next build` statically analyzes route modules (e.g. /api/auth/[...all]) to
# collect page data, which imports src/lib/env.ts -- its required() checks then
# throw if these aren't set, even though nothing is actually served yet. Real
# values are injected by docker-compose's env_file/environment at container
# *start*, which always overrides an image's baked-in ENV default -- these are
# build-time-only placeholders, never read by real request handling.
ENV DATABASE_URL="postgres://build:build@localhost:5432/build" \
    BETTER_AUTH_SECRET="build-time-placeholder-not-a-real-secret" \
    GITHUB_APP_CLIENT_ID="build-time-placeholder" \
    GITHUB_APP_CLIENT_SECRET="build-time-placeholder" \
    BACKEND_API_TOKEN="build-time-placeholder"

RUN bun run --cwd apps/dashboard build

EXPOSE 3000

# Migrations (better-auth's own user/session/account/verification tables) run on
# container start, same as the backend -- idempotent, safe to re-run every boot.
CMD ["sh", "-c", "bun run --cwd apps/dashboard db:migrate && bun run --cwd apps/dashboard start"]

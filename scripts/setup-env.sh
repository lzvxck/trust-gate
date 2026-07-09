#!/usr/bin/env bash
# Scaffolds apps/backend/.env and apps/dashboard/.env from their .env.example
# templates. Never overwrites an existing .env -- safe to re-run. Fills in what
# can be generated locally (BETTER_AUTH_SECRET); everything GitHub-App-specific
# still needs docs/01-github-app.md (or scripts/create-github-app.mjs).
set -euo pipefail
cd "$(dirname "$0")/.."

setup_one() {
  local dir="$1"
  local env_file="$dir/.env"
  local example_file="$dir/.env.example"

  if [ -f "$env_file" ]; then
    echo "skip: $env_file already exists"
    return
  fi

  cp "$example_file" "$env_file"
  echo "created: $env_file (from $example_file)"
}

setup_one apps/backend
setup_one apps/dashboard

if grep -q '^BETTER_AUTH_SECRET=xxx' apps/dashboard/.env 2>/dev/null; then
  secret=$(openssl rand -hex 32)
  sed -i.bak "s/^BETTER_AUTH_SECRET=.*/BETTER_AUTH_SECRET=$secret/" apps/dashboard/.env
  rm -f apps/dashboard/.env.bak
  echo "generated: BETTER_AUTH_SECRET in apps/dashboard/.env"
fi

echo ""
echo "Next: fill in the GitHub App fields in both .env files."
echo "  Manual: docs/01-github-app.md"
echo "  Automated (needs a browser): TRUST_GATE_WEBHOOK_URL=<smee.io channel> node scripts/create-github-app.mjs"

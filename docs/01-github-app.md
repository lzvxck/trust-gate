# 1. Create a GitHub App

## Automated (recommended)

```sh
# create a webhook tunnel first (local dev only -- skip for a real deploy,
# use https://<your-backend-domain>/webhooks/github instead)
open https://smee.io/new   # copy the channel URL it redirects to

TRUST_GATE_WEBHOOK_URL=<that channel URL> node scripts/create-github-app.mjs
# opens http://localhost:4200 -- click through GitHub's one confirmation
# screen (can't be automated, GitHub requires consent), then the script
# prints every value below and writes the private key file for you.
```

Skip to step 2 once that's done. What follows is the manual equivalent, for
when you'd rather see every field or the script doesn't fit your setup.

## Manual (~10 minutes)

Go to `https://github.com/settings/apps` -> **New GitHub App**.

| Field | Value |
|---|---|
| GitHub App name | anything unique, e.g. `your-org-trust-gate` |
| Homepage URL | your repo or company URL (not validated) |
| Callback URL | `http://localhost:3000/api/auth/callback/github` (dashboard sign-in) |
| Webhook URL | see below |
| Webhook secret | generate one, save it |
| Permissions | **Checks**: Read & write · **Pull requests**: Read-only |
| Subscribe to events | **Pull request** |

**Webhook URL**, pick one:
- Local dev: a tunnel, e.g. `npx smee-client --url <channel> --target http://localhost:3001/webhooks/github` (create a channel at smee.io first, use that URL as the App's webhook URL)
- Real deploy: `https://<your-backend-domain>/webhooks/github`

After creating the App, generate a **private key** (downloads a `.pem`) and a **client secret**. Save the `.pem` to `apps/backend/secrets/github-app-private-key.pem`. Install the App on whichever repos you want gated (Settings -> Install App).

You now have everything `apps/backend/.env.example` and `apps/dashboard/.env.example` ask for: App ID, Client ID, Client Secret, Webhook Secret, and the private key path.

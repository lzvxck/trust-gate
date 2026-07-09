# 5. Reverse proxy + TLS (production deployments)

`localhost` is fine for trying it out, but GitHub requires real HTTPS URLs for a
GitHub App's Callback URL and Webhook URL in actual use — you can't point a
production App at `http://localhost`. Put a reverse proxy in front of the two
public services once you're deploying somewhere real. Two subdomains, one per
service, keeps the proxy config trivial (no path-rewriting):

- `app.yourdomain.com` -> dashboard (`:3000`)
- `api.yourdomain.com` -> backend (`:3001`)

## Caddy (simplest — automatic Let's Encrypt, zero extra config)

```
# /etc/caddy/Caddyfile
app.yourdomain.com {
    reverse_proxy localhost:3000
}

api.yourdomain.com {
    reverse_proxy localhost:3001
}
```

`caddy run` (or the Caddy Docker image with this file mounted at
`/etc/caddy/Caddyfile`). That's the whole config — Caddy provisions and renews
certificates automatically as long as both DNS records point at this host.

## Traefik (alternative — label-based, integrates directly with Compose)

Add `traefik.enable=true` + a `traefik.http.routers.*.rule=Host(...)` label to
the `backend` and `dashboard` services in whichever compose file you're running,
pointed at the same two subdomains. Skipped here for brevity — Traefik's own
[Docker Compose quickstart](https://doc.traefik.io/traefik/getting-started/quick-start-with-docker/)
covers the `docker-compose.yml` wiring; the App-side changes below are identical
either way.

## Once you have real domains, update:

- The GitHub App's **Callback URL**: `https://app.yourdomain.com/api/auth/callback/github`
- The GitHub App's **Webhook URL**: `https://api.yourdomain.com/webhooks/github` (drop the smee.io tunnel)
- `apps/dashboard/.env`: `BETTER_AUTH_URL=https://app.yourdomain.com`
- `apps/dashboard/.env`: `BACKEND_URL` — this one can *stay* `http://backend:3001`
  (the in-network service name from the compose file's `environment:` override);
  it's server-to-server traffic that never leaves the Docker network, no TLS needed
  internally.

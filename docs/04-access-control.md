# 4. Access control

Self-hosted instances are **single-tenant**: there's no per-user data ownership,
so every signed-in user sees every repo/run in the instance — the same model as
self-hosted Sentry, Grafana, or Plausible. The access boundary is *who can sign in
at all*, not *whose data they see once in*.

By default, sign-in is **unrestricted** — any GitHub account that completes OAuth
against your App gets a session. Fine for a quick local trial; not recommended for
anything reachable beyond `localhost`.

To restrict it, set in `apps/dashboard/.env`:

```sh
ALLOWED_EMAILS=you@example.com,teammate@example.com
```

Comma-separated, checked on every sign-in (not just first-time signup), so
removing an email revokes access for existing users too. Matched against the
email GitHub returns for the account (needs the `user:email` scope, already
requested by default).

If you need to isolate multiple separate teams/orgs on one instance rather than
just gating a single trusted team, that's a bigger change (scoping repos to GitHub
installation access per-user) and isn't built — see the architecture note in the
project's progress log.

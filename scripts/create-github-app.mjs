#!/usr/bin/env node

// Automates GitHub's App Manifest flow (docs.github.com/apps/creating-github-apps/
// setting-up-a-github-app/creating-a-github-app-using-url-parameters) so creating
// the GitHub App (docs/01-github-app.md) doesn't have to be ~10 minutes of manual
// form-filling. Still needs a human click -- GitHub requires consent in-browser,
// that part can't be automated -- but everything else (permissions, events,
// exchanging the manifest code for real credentials, writing the private key file)
// is handled here.
//
// Usage:
//   TRUST_GATE_WEBHOOK_URL=https://smee.io/xxxxx node scripts/create-github-app.mjs
//
// TRUST_GATE_WEBHOOK_URL is required -- create a channel first by visiting
// https://smee.io/new in a browser (local dev) or use your real backend's
// https://<domain>/webhooks/github (production).

import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';

const PORT = 4200;
const webhookUrl = process.env.TRUST_GATE_WEBHOOK_URL;

if (!webhookUrl) {
  console.error(
    'TRUST_GATE_WEBHOOK_URL is required -- create a channel at https://smee.io/new ' +
      '(local dev) or use your real backend URL, then:\n' +
      '  TRUST_GATE_WEBHOOK_URL=https://smee.io/xxxxx node scripts/create-github-app.mjs',
  );
  process.exit(1);
}

const appName = process.env.TRUST_GATE_APP_NAME ?? `trust-gate-${randomBytes(4).toString('hex')}`;
const homepageUrl = process.env.TRUST_GATE_HOMEPAGE_URL ?? 'https://github.com/lzvxck/trust-gate';

const manifest = {
  name: appName,
  url: homepageUrl,
  hook_attributes: { url: webhookUrl },
  redirect_url: `http://localhost:${PORT}/callback`,
  // The dashboard's better-auth sign-in flow, not the manifest flow's own callback.
  callback_urls: ['http://localhost:3000/api/auth/callback/github'],
  public: false,
  // Matches what apps/backend/src actually calls (checks.create/update, reads
  // pull_request webhook payloads) -- not the plan doc's broader aspirational list.
  default_permissions: { checks: 'write', pull_requests: 'read' },
  default_events: ['pull_request'],
};

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/') {
    const manifestJson = escapeHtml(JSON.stringify(manifest));
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!doctype html>
<body>
  <p>Redirecting to GitHub to create "${escapeHtml(appName)}"...</p>
  <form id="f" action="https://github.com/settings/apps/new" method="post">
    <input type="hidden" name="manifest" value='${manifestJson}'>
  </form>
  <script>document.getElementById('f').submit()</script>
</body>`);
    return;
  }

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('No ?code from GitHub -- app creation was likely cancelled.');
      server.close();
      return;
    }

    const conversion = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
      method: 'POST',
      headers: { Accept: 'application/vnd.github+json' },
    }).then((r) => r.json());

    if (!conversion.pem) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Conversion failed: ${JSON.stringify(conversion)}`);
      console.error('Conversion failed:', conversion);
      server.close();
      return;
    }

    mkdirSync('apps/backend/secrets', { recursive: true });
    writeFileSync('apps/backend/secrets/github-app-private-key.pem', conversion.pem);

    console.log(
      '\nGitHub App created. Private key written to apps/backend/secrets/github-app-private-key.pem\n',
    );
    console.log('apps/backend/.env:');
    console.log(`  GITHUB_APP_ID=${conversion.id}`);
    console.log(`  GITHUB_APP_PRIVATE_KEY_PATH=apps/backend/secrets/github-app-private-key.pem`);
    console.log(`  GITHUB_WEBHOOK_SECRET=${conversion.webhook_secret}`);
    console.log('\napps/dashboard/.env:');
    console.log(`  GITHUB_APP_CLIENT_ID=${conversion.client_id}`);
    console.log(`  GITHUB_APP_CLIENT_SECRET=${conversion.client_secret}`);
    console.log(
      `\nInstall the app on your repos: https://github.com/settings/apps/${appName}/installations\n`,
    );

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Done -- check your terminal for credentials. You can close this tab.');
    server.close();
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`Open http://localhost:${PORT} in a browser to create the GitHub App.`);
});

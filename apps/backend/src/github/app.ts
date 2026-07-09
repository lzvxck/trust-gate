import { readFileSync } from 'node:fs';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { env } from '../env.js';

const privateKey = readFileSync(env.GITHUB_APP_PRIVATE_KEY_PATH, 'utf8');

/** Octokit authed as a specific installation (JWT app-auth -> installation token, cached/refreshed internally by @octokit/auth-app). */
export function getInstallationOctokit(installationId: number): Octokit {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.GITHUB_APP_ID,
      privateKey,
      installationId,
    },
  });
}

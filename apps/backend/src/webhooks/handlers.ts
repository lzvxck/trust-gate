import { Webhooks } from '@octokit/webhooks';
import { db } from '../db/client.js';
import { githubChecks, repos } from '../db/schema.js';
import { env } from '../env.js';
import { getInstallationOctokit } from '../github/app.js';

export const webhooks = new Webhooks({ secret: env.GITHUB_WEBHOOK_SECRET });

const CHECK_NAME = 'Trust Gate Regression Check';

webhooks.on(
  ['pull_request.opened', 'pull_request.synchronize', 'pull_request.reopened'],
  async ({ payload }) => {
    const installationId = payload.installation?.id;
    if (!installationId) return;

    const headSha = payload.pull_request.head.sha;
    const [owner, repoName] = payload.repository.full_name.split('/');
    if (!owner || !repoName) return;

    const [repo] = await db
      .insert(repos)
      .values({
        fullName: payload.repository.full_name,
        githubInstallationId: String(installationId),
      })
      .onConflictDoUpdate({
        target: repos.fullName,
        set: { githubInstallationId: String(installationId) },
      })
      .returning({ id: repos.id });
    if (!repo) return;

    const octokit = getInstallationOctokit(installationId);
    const { data: checkRun } = await octokit.checks.create({
      owner,
      repo: repoName,
      name: CHECK_NAME,
      head_sha: headSha,
      status: 'in_progress',
    });

    await db.insert(githubChecks).values({
      repoId: repo.id,
      headSha,
      checkRunId: String(checkRun.id),
    });
  },
);

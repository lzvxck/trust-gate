import type { RegressionVerdict, TestFailure } from '@trust-gate/orchestrator';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { githubChecks, repos } from '../db/schema.js';
import { getInstallationOctokit } from './app.js';

const MAX_ANNOTATIONS = 50;

interface CheckAnnotation {
  path: string;
  start_line: number;
  end_line: number;
  annotation_level: 'failure';
  title: string;
  message: string;
}

/** GitHub Check annotations require line numbers; failures only carry testFile/message, not a precise assertion line, so annotations point at line 1 of the test file rather than the exact failing assertion. */
function toAnnotation(f: TestFailure): CheckAnnotation {
  return {
    path: f.testFile,
    start_line: 1,
    end_line: 1,
    annotation_level: 'failure',
    title: f.testName,
    message: f.message || 'Test failed',
  };
}

function buildOutput(verdict: RegressionVerdict): {
  title: string;
  summary: string;
  annotations: CheckAnnotation[];
} {
  const regressions = [...verdict.passToPassFailures, ...verdict.newFailures];
  const title =
    verdict.status === 'error'
      ? 'check_regression errored'
      : regressions.length > 0
        ? `${regressions.length} regression(s) found`
        : 'No regressions found';

  const summaryLines = [
    `Verdict: ${verdict.status.toUpperCase()}`,
    `Tests run: ${verdict.testsRun}`,
  ];
  if (verdict.passToPassFailures.length > 0) {
    summaryLines.push(
      '',
      `Regressions this diff introduced (${verdict.passToPassFailures.length}):`,
      ...verdict.passToPassFailures.map((f) => `- ${f.testFile} :: ${f.testName}`),
    );
  }
  if (verdict.newFailures.length > 0) {
    summaryLines.push(
      '',
      `New failing tests (${verdict.newFailures.length}):`,
      ...verdict.newFailures.map((f) => `- ${f.testFile} :: ${f.testName}`),
    );
  }
  if (verdict.errorMessage) {
    summaryLines.push('', verdict.errorMessage);
  }

  return {
    title,
    summary: summaryLines.join('\n'),
    annotations: regressions.slice(0, MAX_ANNOTATIONS).map(toAnnotation),
  };
}

/**
 * Completes the pending GitHub check run for this (repo, headSha) -- created by the
 * webhook handler at PR open/sync -- with the final verdict. No-op if there's no
 * pending check: agent-path runs never had one, and PR-path runs where the webhook
 * never fired (e.g. webhook URL not configured) just fall back to the Actions job's
 * own exit code as the gate.
 */
export async function updateCheckForRun(
  repoId: string,
  headSha: string,
  status: 'pass' | 'fail' | 'error',
  verdict: RegressionVerdict,
): Promise<void> {
  const [pending] = await db
    .select()
    .from(githubChecks)
    .where(and(eq(githubChecks.repoId, repoId), eq(githubChecks.headSha, headSha)));
  if (!pending) return;

  const [repo] = await db.select().from(repos).where(eq(repos.id, repoId));
  if (!repo?.githubInstallationId) return;
  const [owner, repoName] = repo.fullName.split('/');
  if (!owner || !repoName) return;

  const octokit = getInstallationOctokit(Number(repo.githubInstallationId));
  const conclusion = status === 'pass' ? 'success' : status === 'error' ? 'neutral' : 'failure';

  await octokit.checks.update({
    owner,
    repo: repoName,
    check_run_id: Number(pending.checkRunId),
    status: 'completed',
    conclusion,
    output: buildOutput(verdict),
  });
}

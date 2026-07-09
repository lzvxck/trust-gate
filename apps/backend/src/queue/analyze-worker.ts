import type { RegressionVerdict } from '@trust-gate/orchestrator';
import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { regressionEvents, runs } from '../db/schema.js';
import { updateCheckForRun } from '../github/checks.js';
import { connection } from './connection.js';

interface AnalyzeJobData {
  runId: string;
}

/**
 * Derives regression_events from the stored verdict and finalizes the run's status.
 * Proves the queue -> worker -> DB pattern the (deferred) GitHub-webhook path reuses
 * for its own analyze/execute/judge stages.
 */
export function startAnalyzeWorker(): Worker<AnalyzeJobData> {
  return new Worker<AnalyzeJobData>(
    'analyze',
    async (job) => {
      const { runId } = job.data;

      const [run] = await db.select().from(runs).where(eq(runs.id, runId));
      if (!run) throw new Error(`Run ${runId} not found`);

      const verdict = run.verdict as RegressionVerdict;

      const events = [
        ...verdict.passToPassFailures.map((f) => ({
          runId,
          testFile: f.testFile,
          testName: f.testName,
          kind: 'pass_to_pass' as const,
        })),
        ...verdict.newFailures.map((f) => ({
          runId,
          testFile: f.testFile,
          testName: f.testName,
          kind: 'new_fail' as const,
        })),
      ];
      if (events.length > 0) await db.insert(regressionEvents).values(events);

      const status =
        verdict.status === 'error'
          ? 'error'
          : verdict.passToPassFailures.length > 0 || verdict.newFailures.length > 0
            ? 'fail'
            : 'pass';
      await db.update(runs).set({ status }).where(eq(runs.id, runId));
      await updateCheckForRun(run.repoId, run.headSha, status, verdict);
    },
    { connection },
  );
}

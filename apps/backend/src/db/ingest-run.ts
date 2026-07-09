import type { RegressionVerdict, TestCaseResult } from '@trust-gate/orchestrator';
import { db } from './client.js';
import { atRiskTests, impactEdges, repos, runs, testResults, trajectories } from './schema.js';

export interface TrajectoryInput {
  agent: string;
  toolCalls?: unknown[];
  reasoningText?: string;
  filesTouched?: unknown[];
}

export interface IngestRunInput {
  repoFullName: string;
  headSha: string;
  baseSha: string;
  verdict: RegressionVerdict;
  trajectory?: TrajectoryInput;
}

function testResultStatus(status: TestCaseResult['status']): 'pass' | 'fail' | 'skipped' {
  return status === 'skip' ? 'skipped' : status;
}

/** Whether the test was passing on baseRef, per the bucket checkRegression sorted it into. null = no comparable baseline data. */
function wasPassingBefore(
  testFile: string,
  testName: string,
  verdict: RegressionVerdict,
): boolean | null {
  const key = (f: string, n: string) => `${f}::${n}`;
  const target = key(testFile, testName);
  if (verdict.passToPassFailures.some((f) => key(f.testFile, f.testName) === target)) return true;
  if (verdict.preExistingFailures.some((f) => key(f.testFile, f.testName) === target)) {
    return false;
  }
  return null;
}

/** Transactional multi-table insert for a single run. Normalized tables are the source of truth; verdict_jsonb is kept as a debug/backup blob. */
export async function ingestRun(input: IngestRunInput): Promise<{ runId: string }> {
  const { repoFullName, headSha, baseSha, verdict, trajectory } = input;

  return db.transaction(async (tx) => {
    const [repo] = await tx
      .insert(repos)
      .values({ fullName: repoFullName })
      .onConflictDoUpdate({ target: repos.fullName, set: { fullName: repoFullName } })
      .returning({ id: repos.id });
    if (!repo) throw new Error('Failed to upsert repo row');

    const [run] = await tx
      .insert(runs)
      .values({
        repoId: repo.id,
        headSha,
        baseSha,
        source: 'agent',
        status: 'queued',
        verdict,
      })
      .returning({ id: runs.id });
    if (!run) throw new Error('Failed to insert run row');

    if (trajectory) {
      await tx.insert(trajectories).values({
        runId: run.id,
        agent: trajectory.agent,
        toolCalls: trajectory.toolCalls ?? [],
        reasoningText: trajectory.reasoningText,
        filesTouched: trajectory.filesTouched ?? [],
      });
    }

    if (verdict.blast.edges.length > 0) {
      await tx.insert(impactEdges).values(
        verdict.blast.edges.map((edge) => ({
          runId: run.id,
          fromSymbol: edge.from,
          toSymbol: edge.to,
          kind: edge.kind,
          weight: edge.weight,
        })),
      );
    }

    if (verdict.blast.atRiskTests.length > 0) {
      await tx.insert(atRiskTests).values(
        verdict.blast.atRiskTests.map((t) => ({
          runId: run.id,
          testFile: t.testFile,
          testName: t.testName,
          score: t.score,
          reasons: t.reason,
        })),
      );
    }

    if (verdict.testResults.length > 0) {
      await tx.insert(testResults).values(
        verdict.testResults.map((r) => ({
          runId: run.id,
          testFile: r.testFile,
          testName: r.testName,
          status: testResultStatus(r.status),
          wasPassingBefore: wasPassingBefore(r.testFile, r.testName, verdict),
          message: r.message,
          stack: r.stack,
        })),
      );
    }

    return { runId: run.id };
  });
}

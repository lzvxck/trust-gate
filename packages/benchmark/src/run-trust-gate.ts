import { checkRegression } from '@trust-gate/orchestrator';
import type { ArmResult } from './types.js';

export async function runTrustGate(repoRoot: string, expectedFailure: string): Promise<ArmResult> {
  const start = performance.now();
  const verdict = await checkRegression({ repoRoot, baseRef: 'HEAD' });
  const durationMs = performance.now() - start;

  const caught = verdict.passToPassFailures.some(
    (f) => `${f.testFile} :: ${f.testName}` === expectedFailure,
  );

  const detail = caught
    ? `passToPassFailures: ${verdict.passToPassFailures.map((f) => `${f.testFile} :: ${f.testName}`).join(', ')}`
    : `status=${verdict.status}, testsRun=${verdict.testsRun}, atRiskTests=${verdict.blast.atRiskTests.map((t) => t.testFile).join(', ') || 'none'}`;

  return { caught, detail, durationMs };
}

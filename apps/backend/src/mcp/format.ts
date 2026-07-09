import type { BlastRadius, RegressionVerdict, TestFailure } from '@trust-gate/orchestrator';

const MAX_FAILURES_SHOWN = 10;

function formatFailure(f: TestFailure): string {
  return `  - ${f.testFile} :: ${f.testName}\n    ${f.message}`;
}

function formatBucket(label: string, failures: TestFailure[]): string[] {
  if (failures.length === 0) return [];
  const shown = failures.slice(0, MAX_FAILURES_SHOWN);
  const lines = [`${label} (${failures.length}):`, ...shown.map(formatFailure)];
  const remaining = failures.length - shown.length;
  if (remaining > 0) lines.push(`  ...${remaining} more not shown`);
  return lines;
}

export function summarizeVerdict(verdict: RegressionVerdict): string {
  if (verdict.status === 'error') return `check_regression errored: ${verdict.errorMessage}`;
  if (verdict.testsRun === 0 && verdict.status === 'pass')
    return 'No changes detected -- nothing to check.';

  const lines = [
    `Verdict: ${verdict.status.toUpperCase()} (${verdict.testsRun} test file(s) run)`,
    ...formatBucket(
      'Regressions this diff introduced (passed before, fail now)',
      verdict.passToPassFailures,
    ),
    ...formatBucket('New failing tests (no baseline counterpart)', verdict.newFailures),
    ...formatBucket('Pre-existing failures (unrelated to this diff)', verdict.preExistingFailures),
  ];
  return lines.join('\n');
}

export function summarizeBlast(blast: BlastRadius): string {
  if (blast.atRiskTests.length === 0 && !blast.fullSuiteFallback) {
    return 'No changes detected, or no at-risk tests found via static analysis.';
  }
  const lines = [
    blast.fullSuiteFallback
      ? 'Full-suite fallback triggered -- changed files include a blind spot with no static or coverage signal.'
      : `${blast.atRiskTests.length} at-risk test file(s) found (static analysis only -- no tests executed):`,
    ...blast.atRiskTests
      .slice(0, MAX_FAILURES_SHOWN)
      .map((t) => `  - ${t.testFile} (score ${t.score}, via ${t.reason.join(', ')})`),
  ];
  return lines.join('\n');
}

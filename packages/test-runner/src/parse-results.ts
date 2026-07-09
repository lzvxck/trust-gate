import { relative, sep } from 'node:path';
import type { TestCaseResult, TestCaseStatus, TestFailure } from './types.js';

interface JestAssertionResult {
  title: string;
  fullName: string;
  status: 'passed' | 'failed' | 'pending' | 'skipped' | 'todo';
  failureMessages: string[];
}

interface JestTestFileResult {
  name: string;
  assertionResults: JestAssertionResult[];
}

export interface JestJsonReport {
  testResults: JestTestFileResult[];
}

const STATUS_MAP: Record<JestAssertionResult['status'], TestCaseStatus> = {
  passed: 'pass',
  failed: 'fail',
  pending: 'skip',
  skipped: 'skip',
  todo: 'skip',
};

/** Vitest's `json` reporter follows Jest's JSON reporter schema. */
export function parseTestResults(report: JestJsonReport, cwd: string): TestCaseResult[] {
  const results: TestCaseResult[] = [];

  for (const fileResult of report.testResults) {
    const testFile = relative(cwd, fileResult.name).split(sep).join('/');

    for (const assertion of fileResult.assertionResults) {
      const status = STATUS_MAP[assertion.status];
      const message = assertion.failureMessages.at(0);

      results.push({
        testFile,
        testName: assertion.fullName || assertion.title,
        status,
        ...(message !== undefined && { message, stack: message }),
      });
    }
  }

  return results;
}

export function toFailures(results: TestCaseResult[]): TestFailure[] {
  return results
    .filter(
      (r): r is TestCaseResult & { message: string } =>
        r.status === 'fail' && r.message !== undefined,
    )
    .map((r) => ({
      testFile: r.testFile,
      testName: r.testName,
      message: r.message,
      ...(r.stack !== undefined && { stack: r.stack }),
    }));
}

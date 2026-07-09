export type TestCaseStatus = 'pass' | 'fail' | 'skip';

export interface TestCaseResult {
  testFile: string;
  testName: string;
  status: TestCaseStatus;
  message?: string;
  stack?: string;
}

export interface TestFailure {
  testFile: string;
  testName: string;
  message: string;
  stack?: string;
}

export interface TestRunResult {
  results: TestCaseResult[];
  failures: TestFailure[];
}

export interface RunTestsOptions {
  /** Repo root the test files are run from; also where vitest is resolved from. */
  cwd: string;
  timeoutMs?: number;
}

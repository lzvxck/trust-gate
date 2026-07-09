import type { BlastRadius } from '@trust-gate/impact';
import type { TestCaseResult, TestFailure } from '@trust-gate/test-runner';

export type { BlastRadius } from '@trust-gate/impact';
export type { TestCaseResult, TestFailure } from '@trust-gate/test-runner';

export type RegressionStatus = 'pass' | 'fail' | 'error';

export interface RegressionVerdict {
  status: RegressionStatus;
  /** Passed against baseRef, fail on the current working tree -- the gate signal. */
  passToPassFailures: TestFailure[];
  /** No counterpart on baseRef (new test file), fails on the current working tree. */
  newFailures: TestFailure[];
  /** Failed on both baseRef and the current working tree -- informational, not gating. */
  preExistingFailures: TestFailure[];
  /** Full per-test result set from the head run (pass and fail), not just the failure buckets above. */
  testResults: TestCaseResult[];
  blast: BlastRadius;
  testsRun: number;
  /** Raw unified diff (`git diff <baseRef>`) this verdict was computed from. Empty string when there were no changes. Consumed by the LLM judge, which needs the actual diff content to compare against trajectory-stated intent -- everything else on this type is derived/summarized. */
  diff: string;
  /** Set when status === 'error'. */
  errorMessage?: string;
}

export interface OrchestratorInput {
  repoRoot: string;
  baseRef?: string;
}

export interface CheckRegressionInput extends OrchestratorInput {
  /** Cap on at-risk tests actually executed. Ignored when the blast radius sets fullSuiteFallback. */
  maxTests?: number;
}

/** Thrown by stashAndRun when `git stash pop` fails; the caller's changes remain safely on the stash list. */
export class StashRestoreError extends Error {
  constructor(popErrorMessage: string, options?: ErrorOptions) {
    super(
      `Failed to restore stashed changes automatically: ${popErrorMessage}\n` +
        'Your uncommitted changes are safely on the git stash list -- run `git stash pop` manually to restore them.',
      options,
    );
    this.name = 'StashRestoreError';
  }
}

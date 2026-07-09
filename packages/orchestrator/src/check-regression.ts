import { buildImpactGraph, parseDiff } from '@trust-gate/core-graph';
import { buildCoverageMap } from '@trust-gate/coverage-map';
import { buildBlastRadius } from '@trust-gate/impact';
import type { TestCaseResult } from '@trust-gate/test-runner';
import { runTests } from '@trust-gate/test-runner';
import { discoverTestFiles } from './discover-tests.js';
import { getDiff, stashAndRun } from './git.js';
import { loadProject } from './project.js';
import type { CheckRegressionInput, RegressionVerdict, TestFailure } from './types.js';

const DEFAULT_MAX_TESTS = 20;

function key(r: { testFile: string; testName: string }): string {
  return `${r.testFile}::${r.testName}`;
}

function toFailure(r: TestCaseResult): TestFailure {
  return {
    testFile: r.testFile,
    testName: r.testName,
    message: r.message ?? '',
    ...(r.stack !== undefined ? { stack: r.stack } : {}),
  };
}

export async function checkRegression(input: CheckRegressionInput): Promise<RegressionVerdict> {
  const { repoRoot, baseRef = 'HEAD', maxTests = DEFAULT_MAX_TESTS } = input;

  const diffText = await getDiff(repoRoot, baseRef);
  if (diffText.trim() === '') {
    return {
      status: 'pass',
      passToPassFailures: [],
      newFailures: [],
      preExistingFailures: [],
      testResults: [],
      blast: { affected: [], edges: [], atRiskTests: [], fullSuiteFallback: false },
      testsRun: 0,
    };
  }

  const project = loadProject(repoRoot);
  const { affected, edges } = buildImpactGraph(project, diffText, repoRoot);
  const changedFiles = parseDiff(diffText).map((d) => d.file);

  const allTestFiles = await discoverTestFiles(repoRoot);
  const coverageMap = await buildCoverageMap(allTestFiles, { cwd: repoRoot });
  const blast = buildBlastRadius({ changedFiles, affected, edges, coverageMap });

  const testsToRun = blast.fullSuiteFallback
    ? allTestFiles
    : blast.atRiskTests.slice(0, maxTests).map((t) => t.testFile);

  const headRun = await runTests(testsToRun, { cwd: repoRoot });
  const baseRun = await stashAndRun(repoRoot, () => runTests(testsToRun, { cwd: repoRoot }));

  const baseByKey = new Map<string, TestCaseResult>(baseRun.results.map((r) => [key(r), r]));

  const passToPassFailures: TestFailure[] = [];
  const newFailures: TestFailure[] = [];
  const preExistingFailures: TestFailure[] = [];

  for (const headResult of headRun.results) {
    if (headResult.status !== 'fail') continue;
    const baseResult = baseByKey.get(key(headResult));
    if (!baseResult) {
      newFailures.push(toFailure(headResult));
    } else if (baseResult.status === 'fail') {
      preExistingFailures.push(toFailure(headResult));
    } else {
      passToPassFailures.push(toFailure(headResult));
    }
  }

  return {
    status: passToPassFailures.length > 0 || newFailures.length > 0 ? 'fail' : 'pass',
    passToPassFailures,
    newFailures,
    preExistingFailures,
    testResults: headRun.results,
    blast,
    testsRun: testsToRun.length,
  };
}

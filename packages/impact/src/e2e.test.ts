import { describe, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { buildImpactGraph } from '@trust-gate/core-graph';
import { buildCoverageMap } from '@trust-gate/coverage-map';
import { runTests } from '@trust-gate/test-runner';
import { Project } from 'ts-morph';
import { buildBlastRadius } from './rank.js';

const fixtureDir = fileURLToPath(new URL('./__fixtures__/regression-project', import.meta.url));

// The fixture's math.ts already has the regression baked in (add() does a - b
// instead of a + b); this diff is what an agent's actual edit would have
// looked like producing that change, and is all core-graph needs to resolve
// the affected symbol.
const REGRESSION_DIFF = [
  'diff --git a/src/math.ts b/src/math.ts',
  '--- a/src/math.ts',
  '+++ b/src/math.ts',
  '@@ -1,3 +1,3 @@',
  ' export function add(a: number, b: number): number {',
  '-  return a + b;',
  '+  return a - b;',
  ' }',
  '',
].join('\n');

describe('week 2 pipeline: core-graph -> coverage-map -> impact -> test-runner', () => {
  test('ranks the test that actually exercises the change highest, and running it catches the regression', async () => {
    const project = new Project();
    project.addSourceFilesAtPaths(`${fixtureDir}/src/**/*.ts`);

    const { affected, edges } = buildImpactGraph(project, REGRESSION_DIFF, fixtureDir);
    expect(affected).toContainEqual(
      expect.objectContaining({ file: 'src/math.ts', name: 'add', kind: 'function' }),
    );

    const coverageMap = await buildCoverageMap(['src/math.add.test.ts', 'src/math.sub.test.ts'], {
      cwd: fixtureDir,
    });

    const blast = buildBlastRadius({
      changedFiles: ['src/math.ts'],
      affected,
      edges,
      coverageMap,
    });

    expect(blast.fullSuiteFallback).toBe(false);
    expect(blast.atRiskTests[0]).toMatchObject({ testFile: 'src/math.add.test.ts' });

    const addTestScore = blast.atRiskTests.find(
      (t) => t.testFile === 'src/math.add.test.ts',
    )?.score;
    const subTestScore = blast.atRiskTests.find(
      (t) => t.testFile === 'src/math.sub.test.ts',
    )?.score;
    expect(addTestScore).toBeGreaterThan(subTestScore ?? 0);

    const topRisk = blast.atRiskTests[0];
    if (!topRisk) throw new Error('expected at least one at-risk test');

    const { failures } = await runTests([topRisk.testFile], { cwd: fixtureDir });
    expect(failures).toHaveLength(1);
    expect(failures[0]?.testFile).toBe('src/math.add.test.ts');
    expect(failures[0]?.message).toContain('3');
  }, 30_000);
});

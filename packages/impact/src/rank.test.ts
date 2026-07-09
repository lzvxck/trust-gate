import { describe, expect, test } from 'bun:test';
import type { AffectedSymbol, ImpactEdge } from '@trust-gate/core-graph';
import type { CoverageMap } from '@trust-gate/coverage-map';
import { buildBlastRadius } from './rank.js';

const affected: AffectedSymbol[] = [
  { file: 'src/math.ts', name: 'add', kind: 'function', startLine: 1, endLine: 3 },
];

const edges: ImpactEdge[] = [
  { from: 'src/calc.ts', to: 'src/math.ts', kind: 'imports', weight: 1 },
  { from: 'src/app.ts', to: 'src/calc.ts', kind: 'imports', weight: 0.5 },
  { from: 'src/calc.test.ts', to: 'src/calc.ts', kind: 'imports', weight: 1 },
];

// math.test.ts covers add() directly but never shows up in the static graph at
// all -- the DI/dynamic-dispatch case the coverage union exists to catch.
const coverageMap: CoverageMap = {
  'src/math.ts': { 'src/math.test.ts': [1, 2, 3] },
};

describe('buildBlastRadius', () => {
  test('finds a statically-reachable test file', () => {
    const blast = buildBlastRadius({
      changedFiles: ['src/math.ts'],
      affected,
      edges,
      coverageMap: {},
    });
    const calcTest = blast.atRiskTests.find((t) => t.testFile === 'src/calc.test.ts');
    expect(calcTest).toMatchObject({ score: 1, reason: ['static-import'] });
  });

  test('finds a test file only the coverage map knows about', () => {
    const blast = buildBlastRadius({
      changedFiles: ['src/math.ts'],
      affected,
      edges: [],
      coverageMap,
    });
    const mathTest = blast.atRiskTests.find((t) => t.testFile === 'src/math.test.ts');
    expect(mathTest).toMatchObject({ score: 1, reason: ['coverage'] });
  });

  test('a test file found by both signals gets both reasons and a combined score', () => {
    const bothEdges: ImpactEdge[] = [
      { from: 'src/math.test.ts', to: 'src/math.ts', kind: 'imports', weight: 1 },
    ];
    const blast = buildBlastRadius({
      changedFiles: ['src/math.ts'],
      affected,
      edges: bothEdges,
      coverageMap,
    });
    const mathTest = blast.atRiskTests.find((t) => t.testFile === 'src/math.test.ts');
    expect(mathTest?.reason.sort()).toEqual(['coverage', 'static-import']);
    expect(mathTest?.score).toBe(2);
  });

  test('ignores coverage of unrelated lines in the same affected file', () => {
    const missCoverage: CoverageMap = {
      'src/math.ts': { 'src/unrelated.test.ts': [50, 51] },
    };
    const blast = buildBlastRadius({
      changedFiles: ['src/math.ts'],
      affected,
      edges: [],
      coverageMap: missCoverage,
    });
    expect(blast.atRiskTests).toHaveLength(0);
  });

  test('applies a flakiness penalty', () => {
    const blast = buildBlastRadius(
      { changedFiles: ['src/math.ts'], affected, edges: [], coverageMap },
      { flakiness: { 'src/math.test.ts': 0.4 } },
    );
    const mathTest = blast.atRiskTests.find((t) => t.testFile === 'src/math.test.ts');
    expect(mathTest?.score).toBeCloseTo(0.6);
  });

  test('sets fullSuiteFallback when a changed file is a total blind spot', () => {
    const blast = buildBlastRadius({
      changedFiles: ['src/math.ts', 'src/mystery.ts'],
      affected,
      edges,
      coverageMap: {},
    });
    expect(blast.fullSuiteFallback).toBe(true);
  });

  test('does not set fullSuiteFallback when every changed file is accounted for', () => {
    const blast = buildBlastRadius({
      changedFiles: ['src/math.ts'],
      affected,
      edges,
      coverageMap: {},
    });
    expect(blast.fullSuiteFallback).toBe(false);
  });

  test('adds covers edges for coverage-only hits', () => {
    const blast = buildBlastRadius({
      changedFiles: ['src/math.ts'],
      affected,
      edges: [],
      coverageMap,
    });
    expect(blast.edges).toContainEqual({
      from: 'src/math.test.ts',
      to: 'src/math.ts',
      kind: 'covers',
      weight: 1,
    });
  });
});

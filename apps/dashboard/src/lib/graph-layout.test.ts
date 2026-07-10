import { describe, expect, test } from 'bun:test';
import { layoutImpactGraph, parseChangedFiles } from './graph-layout';

const DIFF = `diff --git a/src/math.ts b/src/math.ts
index abc123..def456 100644
--- a/src/math.ts
+++ b/src/math.ts
@@ -1,3 +1,3 @@
-export function add(a: number, b: number) { return a + b; }
+export function add(a: number, b: number) { return a + b + 1; }
`;

describe('parseChangedFiles', () => {
  test('extracts the changed path from unified diff headers', () => {
    expect(parseChangedFiles(DIFF)).toEqual(new Set(['src/math.ts']));
  });

  test('returns an empty set for a diff with no headers', () => {
    expect(parseChangedFiles('')).toEqual(new Set());
  });
});

describe('layoutImpactGraph', () => {
  test('layers changed file at 0, direct importer at 1, test at 2', () => {
    const edges = [
      { fromSymbol: 'src/calc.ts', toSymbol: 'src/math.ts', kind: 'imports' as const },
      { fromSymbol: 'src/calc.test.ts', toSymbol: 'src/calc.ts', kind: 'imports' as const },
    ];
    const atRiskTests = [{ testFile: 'src/calc.test.ts', score: 1.5 }];

    const { nodes, edges: graphEdges } = layoutImpactGraph(edges, atRiskTests, DIFF);

    const byId = new Map(nodes.map((n) => [n.id, n]));
    expect(byId.get('src/math.ts')).toMatchObject({ layer: 0, kind: 'changed' });
    expect(byId.get('src/calc.ts')).toMatchObject({ layer: 1, kind: 'file' });
    expect(byId.get('src/calc.test.ts')).toMatchObject({
      layer: 2,
      kind: 'test',
      atRiskScore: 1.5,
    });
    expect(graphEdges).toHaveLength(2);
  });

  test('falls back to no-outgoing-edge nodes as roots when the diff matches nothing', () => {
    const edges = [{ fromSymbol: 'src/a.ts', toSymbol: 'src/b.ts', kind: 'imports' as const }];

    const { nodes } = layoutImpactGraph(edges, [], 'diff --git a/unrelated.ts b/unrelated.ts');

    const byId = new Map(nodes.map((n) => [n.id, n]));
    expect(byId.get('src/b.ts')?.layer).toBe(0);
    expect(byId.get('src/a.ts')?.layer).toBe(1);
  });

  test('includes a covers edge and marks the covering test node', () => {
    const edges = [
      { fromSymbol: 'src/math.test.ts', toSymbol: 'src/math.ts', kind: 'covers' as const },
    ];
    const atRiskTests = [{ testFile: 'src/math.test.ts', score: 1 }];

    const { nodes, edges: graphEdges } = layoutImpactGraph(edges, atRiskTests, DIFF);

    expect(graphEdges[0]).toMatchObject({
      source: 'src/math.test.ts',
      target: 'src/math.ts',
      kind: 'covers',
    });
    expect(nodes.find((n) => n.id === 'src/math.test.ts')).toMatchObject({ kind: 'test' });
  });

  test('returns empty layout when there is nothing to graph', () => {
    expect(layoutImpactGraph([], [], DIFF)).toEqual({ nodes: [], edges: [] });
  });
});

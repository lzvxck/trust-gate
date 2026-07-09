import { describe, expect, test } from 'bun:test';
import { Project } from 'ts-morph';
import { buildImpactGraph } from './index.js';

function makeProject(): Project {
  const project = new Project({ useInMemoryFileSystem: true });

  project.createSourceFile(
    '/src/math.ts',
    ['export function add(a: number, b: number): number {', '  return a + b;', '}', ''].join('\n'),
  );

  project.createSourceFile(
    '/src/calc.ts',
    [
      "import { add } from './math';",
      '',
      'export function sum3(a: number, b: number, c: number): number {',
      '  return add(add(a, b), c);',
      '}',
      '',
    ].join('\n'),
  );

  project.createSourceFile(
    '/src/app.ts',
    [
      "import { sum3 } from './calc';",
      '',
      'export function run(): number {',
      '  return sum3(1, 2, 3);',
      '}',
      '',
    ].join('\n'),
  );

  return project;
}

const MATH_DIFF = [
  'diff --git a/src/math.ts b/src/math.ts',
  '--- a/src/math.ts',
  '+++ b/src/math.ts',
  '@@ -1,3 +1,3 @@',
  ' export function add(a: number, b: number): number {',
  '-  return a + b;',
  '+  return a + b + 0;',
  ' }',
  '',
].join('\n');

describe('buildImpactGraph', () => {
  test('resolves the affected symbol from the diff', () => {
    const project = makeProject();
    const graph = buildImpactGraph(project, MATH_DIFF, '/');

    expect(graph.affected).toHaveLength(1);
    expect(graph.affected[0]).toMatchObject({ file: 'src/math.ts', name: 'add', kind: 'function' });
  });

  test('walks the file-level import graph two hops out (calc.ts, app.ts)', () => {
    const project = makeProject();
    const graph = buildImpactGraph(project, MATH_DIFF, '/');

    const importEdges = graph.edges.filter((e) => e.kind === 'imports');
    expect(importEdges).toContainEqual({
      from: 'src/calc.ts',
      to: 'src/math.ts',
      kind: 'imports',
      weight: 1,
    });
    expect(importEdges).toContainEqual({
      from: 'src/app.ts',
      to: 'src/calc.ts',
      kind: 'imports',
      weight: 0.5,
    });
  });

  test('walks the call graph through callers of the affected function', () => {
    const project = makeProject();
    const graph = buildImpactGraph(project, MATH_DIFF, '/');

    const callEdges = graph.edges.filter((e) => e.kind === 'calls');
    expect(callEdges).toContainEqual({
      from: 'src/calc.ts',
      to: 'src/math.ts',
      kind: 'calls',
      weight: 1,
    });
    expect(callEdges).toContainEqual({
      from: 'src/app.ts',
      to: 'src/calc.ts',
      kind: 'calls',
      weight: 0.5,
    });
  });
});

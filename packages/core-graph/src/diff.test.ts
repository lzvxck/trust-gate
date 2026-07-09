import { describe, expect, test } from 'bun:test';
import { parseDiff } from './diff.js';

describe('parseDiff', () => {
  test('extracts changed line numbers for a single-hunk file', () => {
    const diff = [
      'diff --git a/src/math.ts b/src/math.ts',
      'index 111..222 100644',
      '--- a/src/math.ts',
      '+++ b/src/math.ts',
      '@@ -1,3 +1,3 @@',
      ' export function add(a: number, b: number): number {',
      '-  return a + b;',
      '+  return a + b + 0;',
      ' }',
      '',
    ].join('\n');

    const result = parseDiff(diff);
    expect(result).toHaveLength(1);
    expect(result[0]?.file).toBe('src/math.ts');
    expect(result[0]?.changedLines).toEqual([2]);
  });

  test('handles multiple files and multiple hunks', () => {
    const diff = [
      'diff --git a/src/a.ts b/src/a.ts',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -1,2 +1,3 @@',
      ' const x = 1;',
      '+const y = 2;',
      ' const z = 3;',
      'diff --git a/src/b.ts b/src/b.ts',
      '--- a/src/b.ts',
      '+++ b/src/b.ts',
      '@@ -5,2 +5,2 @@',
      '-old();',
      '+new_();',
      '',
    ].join('\n');

    const result = parseDiff(diff);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ file: 'src/a.ts', changedLines: [2] });
    expect(result[1]).toEqual({ file: 'src/b.ts', changedLines: [5] });
  });

  test('ignores deleted files (/dev/null target)', () => {
    const diff = [
      'diff --git a/src/gone.ts b/src/gone.ts',
      '--- a/src/gone.ts',
      '+++ /dev/null',
      '@@ -1,2 +0,0 @@',
      '-const a = 1;',
      '-const b = 2;',
      '',
    ].join('\n');

    expect(parseDiff(diff)).toEqual([]);
  });
});

import { describe, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { runTests } from './run-tests.js';

const fixtureDir = fileURLToPath(new URL('./__fixtures__/sample-project', import.meta.url));

describe('runTests', () => {
  test('reports a passing test and a failing test correctly', async () => {
    const { results, failures } = await runTests(
      ['src/math.add.test.ts', 'src/math.broken.test.ts'],
      { cwd: fixtureDir },
    );

    expect(results).toHaveLength(2);

    const passing = results.find((r) => r.testName === 'add adds two numbers');
    expect(passing?.status).toBe('pass');

    const broken = results.find((r) => r.testName === 'sub subtracts two numbers');
    expect(broken?.status).toBe('fail');
    expect(broken?.message).toContain('999');

    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      testFile: 'src/math.broken.test.ts',
      testName: 'sub subtracts two numbers',
    });
  }, 30_000);

  test('returns nothing for an empty test file list', async () => {
    const result = await runTests([], { cwd: fixtureDir });
    expect(result).toEqual({ results: [], failures: [] });
  });
});

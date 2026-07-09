import { describe, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { buildCoverageMap } from './build-coverage-map.js';
import { InMemoryCacheStore } from './cache.js';

const fixtureDir = fileURLToPath(new URL('./__fixtures__/sample-project', import.meta.url));

describe('buildCoverageMap', () => {
  test('attributes covered lines to the test file that actually exercised them', async () => {
    const map = await buildCoverageMap(['src/math.add.test.ts', 'src/math.sub.test.ts'], {
      cwd: fixtureDir,
    });

    const mathCoverage = map['src/math.ts'];
    expect(mathCoverage).toBeDefined();

    // add()'s body (line 2) was only exercised by math.add.test.ts
    expect(mathCoverage?.['src/math.add.test.ts']).toContain(2);
    expect(mathCoverage?.['src/math.sub.test.ts']).not.toContain(2);

    // sub()'s body (line 6) was only exercised by math.sub.test.ts
    expect(mathCoverage?.['src/math.sub.test.ts']).toContain(6);
    expect(mathCoverage?.['src/math.add.test.ts']).not.toContain(6);
  }, 30_000);

  test('reuses cached coverage instead of re-running vitest when the test file is unchanged', async () => {
    const cache = new InMemoryCacheStore();
    let sets = 0;
    const countingCache = {
      get: (key: string) => cache.get(key),
      set: async (key: string, entry: Parameters<typeof cache.set>[1]) => {
        sets++;
        await cache.set(key, entry);
      },
    };

    await buildCoverageMap(['src/math.add.test.ts'], { cwd: fixtureDir, cache: countingCache });
    await buildCoverageMap(['src/math.add.test.ts'], { cwd: fixtureDir, cache: countingCache });

    expect(sets).toBe(1);
  }, 30_000);
});

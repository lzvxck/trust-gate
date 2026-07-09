import { join } from 'node:path';
import { InMemoryCacheStore } from './cache.js';
import { hashFile } from './hash.js';
import { runCoverageForTestFile } from './run-coverage.js';
import type { BuildCoverageMapOptions, CoverageMap } from './types.js';

/**
 * Builds a sourceFile -> testFile -> lines[] map for the given test files,
 * reusing cached coverage when a test file's content hash hasn't changed.
 */
export async function buildCoverageMap(
  testFiles: string[],
  options: BuildCoverageMapOptions,
): Promise<CoverageMap> {
  const { cwd, cache = new InMemoryCacheStore() } = options;
  const map: CoverageMap = {};

  for (const testFile of testFiles) {
    const absPath = join(cwd, testFile);
    const hash = await hashFile(absPath);
    const cacheKey = `${testFile}:${hash}`;

    let covers = (await cache.get(cacheKey))?.covers;
    if (!covers) {
      covers = await runCoverageForTestFile(testFile, cwd);
      await cache.set(cacheKey, { testFile, testFileHash: hash, covers, builtAt: Date.now() });
    }

    for (const [sourceFile, lines] of Object.entries(covers)) {
      map[sourceFile] ??= {};
      map[sourceFile][testFile] = lines;
    }
  }

  return map;
}

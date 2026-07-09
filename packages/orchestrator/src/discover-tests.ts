import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);
const TEST_FILE = /\.(test|spec)\.(ts|tsx|js|jsx)$/;

/**
 * Finds test files under repoRoot, relative to repoRoot -- the same shape
 * `buildCoverageMap`/`runTests` expect. No auto-discovery exists in the
 * underlying packages, so this is the one place that walks the filesystem.
 *
 * Plain node:fs walk, not Bun.Glob -- this code ships inside the xmcp stdio
 * build, which runs under plain `node`, not Bun.
 */
export async function discoverTestFiles(repoRoot: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(join(repoRoot, dir), { withFileTypes: true });
    for (const entry of entries) {
      const relPath = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) await walk(relPath);
      } else if (TEST_FILE.test(entry.name)) {
        files.push(relPath);
      }
    }
  }

  await walk('');
  return files;
}

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

// bun's Windows shims are native .exe files; npm/yarn/pnpm on Windows use .cmd/.ps1 shims instead.
const BIN_NAMES = process.platform === 'win32' ? ['vitest.exe', 'vitest.cmd'] : ['vitest'];

/** Walks up from `cwd` looking for a locally-installed vitest, same resolution order as npm-style tooling. */
export function resolveVitestBin(cwd: string): string {
  let dir = cwd;

  while (true) {
    for (const binName of BIN_NAMES) {
      const candidate = join(dir, 'node_modules', '.bin', binName);
      if (existsSync(candidate)) return candidate;
    }

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return 'vitest';
}

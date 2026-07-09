import { relative, sep } from 'node:path';
import type { CoveredLines } from './types.js';

interface IstanbulRange {
  start: { line: number };
  end: { line: number };
}

interface IstanbulFileCoverage {
  path: string;
  statementMap: Record<string, IstanbulRange>;
  s: Record<string, number>;
  fnMap: Record<string, { decl?: IstanbulRange; loc?: IstanbulRange }>;
  f: Record<string, number>;
}

export type IstanbulCoverage = Record<string, IstanbulFileCoverage>;

/**
 * Reduces istanbul-format coverage (vitest's `json` coverage reporter output,
 * even under the v8 provider) to the line numbers actually hit, keyed by
 * repo-relative source file path.
 */
export function parseIstanbulCoverage(coverage: IstanbulCoverage, rootDir: string): CoveredLines {
  const result: CoveredLines = {};

  for (const [absPath, fileCoverage] of Object.entries(coverage)) {
    const lines = new Set<number>();

    // A function declaration's own hoisting statement always shows as "hit" once its
    // module loads, even if the function itself is never called -- so statement hits
    // inside a function have to be gated on that function's own invocation count,
    // not trusted on their own.
    const uninvokedRanges = Object.entries(fileCoverage.fnMap)
      .filter(([id]) => (fileCoverage.f[id] ?? 0) === 0)
      .map(([, fn]) => fn.decl ?? fn.loc)
      .filter((range): range is IstanbulRange => range !== undefined);
    const isInUninvokedFunction = (line: number) =>
      uninvokedRanges.some((r) => line >= r.start.line && line <= r.end.line);

    for (const [id, range] of Object.entries(fileCoverage.statementMap)) {
      if ((fileCoverage.s[id] ?? 0) > 0 && !isInUninvokedFunction(range.start.line)) {
        lines.add(range.start.line);
      }
    }

    for (const [id, fn] of Object.entries(fileCoverage.fnMap)) {
      const startLine = fn.decl?.start.line ?? fn.loc?.start.line;
      if (startLine !== undefined && (fileCoverage.f[id] ?? 0) > 0) lines.add(startLine);
    }

    if (lines.size === 0) continue;

    const relPath = relative(rootDir, absPath).split(sep).join('/');
    result[relPath] = Array.from(lines).sort((a, b) => a - b);
  }

  return result;
}

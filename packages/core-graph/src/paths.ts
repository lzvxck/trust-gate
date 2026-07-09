import { relative, sep } from 'node:path';

/** ts-morph resolves source files to absolute paths; diffs use repo-relative ones. Normalize to the latter. */
export function toRelativePath(absPath: string, rootDir: string): string {
  return relative(rootDir, absPath).split(sep).join('/');
}

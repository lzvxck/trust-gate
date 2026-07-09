import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Project } from 'ts-morph';

/**
 * Loads a ts-morph Project for the target repo. Prefers the repo's own tsconfig.json
 * (respects its include/exclude), falling back to a manual glob (excluding
 * node_modules/dist) when there isn't one.
 */
export function loadProject(repoRoot: string): Project {
  const tsConfigFilePath = join(repoRoot, 'tsconfig.json');
  if (existsSync(tsConfigFilePath)) {
    return new Project({ tsConfigFilePath });
  }

  const project = new Project();
  project.addSourceFilesAtPaths([
    join(repoRoot, '**/*.{ts,tsx}').split('\\').join('/'),
    '!**/node_modules/**',
    '!**/dist/**',
  ]);
  return project;
}

import type { Project } from 'ts-morph';
import { toRelativePath } from './paths.js';
import { resolveSourceFile } from './resolve-source-file.js';
import type { ImpactEdge } from './types.js';

/**
 * BFS outward from each affected file through `getReferencingSourceFiles()`
 * (files that import it) up to `maxDepth` hops. Direct importers get full
 * weight; weight decays with distance so ranking can prefer closer hits.
 */
export function buildFileImportGraph(
  project: Project,
  affectedFiles: string[],
  rootDir: string,
  maxDepth = 2,
): ImpactEdge[] {
  const edges: ImpactEdge[] = [];
  const edgeKeys = new Set<string>();
  const visited = new Set<string>();
  let frontier = new Set<string>();

  for (const file of affectedFiles) {
    const sf = resolveSourceFile(project, file);
    if (sf) frontier.add(sf.getFilePath());
  }

  for (let depth = 1; depth <= maxDepth && frontier.size > 0; depth++) {
    const nextFrontier = new Set<string>();

    for (const path of frontier) {
      if (visited.has(path)) continue;
      visited.add(path);

      const sf = project.getSourceFile(path);
      if (!sf) continue;

      for (const importer of sf.getReferencingSourceFiles()) {
        const importerPath = importer.getFilePath();
        const from = toRelativePath(importerPath, rootDir);
        const to = toRelativePath(path, rootDir);
        const key = `${from}|${to}|imports`;
        if (!edgeKeys.has(key)) {
          edgeKeys.add(key);
          edges.push({ from, to, kind: 'imports', weight: 1 / depth });
        }
        if (!visited.has(importerPath)) nextFrontier.add(importerPath);
      }
    }

    frontier = nextFrontier;
  }

  return edges;
}

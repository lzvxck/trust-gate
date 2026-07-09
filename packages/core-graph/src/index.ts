import type { Project } from 'ts-morph';
import { buildCallGraph } from './call-graph.js';
import { parseDiff } from './diff.js';
import { buildFileImportGraph } from './import-graph.js';
import { resolveAffectedSymbols } from './symbols.js';
import type { ImpactGraph, ImpactGraphOptions } from './types.js';

export { buildCallGraph } from './call-graph.js';
export { parseDiff } from './diff.js';
export { buildFileImportGraph } from './import-graph.js';
export { resolveAffectedSymbols } from './symbols.js';
export * from './types.js';

/**
 * Full core-graph pipeline: unified diff -> affected symbols -> file-level
 * import graph + bounded-depth call graph. `project` must already have the
 * repo's source files loaded (e.g. via a tsconfig). `rootDir` is used to
 * normalize ts-morph's absolute paths back to diff-relative ones.
 */
export function buildImpactGraph(
  project: Project,
  diffText: string,
  rootDir: string,
  options: ImpactGraphOptions = {},
): ImpactGraph {
  const { maxCallerDepth = 2, maxImportDepth = 2 } = options;

  const diffs = parseDiff(diffText);
  const affected = resolveAffectedSymbols(project, diffs);
  const affectedFiles = Array.from(new Set(diffs.map((d) => d.file)));

  const importEdges = buildFileImportGraph(project, affectedFiles, rootDir, maxImportDepth);
  const callEdges = buildCallGraph(project, affected, rootDir, maxCallerDepth);

  return { affected, edges: [...importEdges, ...callEdges] };
}

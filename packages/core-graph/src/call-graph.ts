import type { Node, Project } from 'ts-morph';
import { toRelativePath } from './paths.js';
import { getDescendantAtLine, resolveSourceFile } from './resolve-source-file.js';
import { findEnclosingDeclaration } from './symbols.js';
import type { AffectedSymbol, ImpactEdge } from './types.js';

interface NameableNode extends Node {
  getNameNode?(): Node | undefined;
}

interface ReferenceFindingNode extends Node {
  findReferencesAsNodes?(): Node[];
}

function symbolKey(s: Pick<AffectedSymbol, 'file' | 'name' | 'kind' | 'startLine'>): string {
  return `${s.file}#${s.name}#${s.kind}#${s.startLine}`;
}

function findCallers(project: Project, symbol: AffectedSymbol, rootDir: string): AffectedSymbol[] {
  const sourceFile = resolveSourceFile(project, symbol.file);
  if (!sourceFile) return [];

  const declNode = getDescendantAtLine(sourceFile, symbol.startLine);
  const found = findEnclosingDeclaration(declNode);
  if (!found) return [];

  const nameNode = (found.node as NameableNode).getNameNode?.() as ReferenceFindingNode | undefined;
  if (!nameNode?.findReferencesAsNodes) return [];

  const callers: AffectedSymbol[] = [];
  for (const ref of nameNode.findReferencesAsNodes()) {
    const refDecl = findEnclosingDeclaration(ref);
    if (!refDecl) continue;
    // skip references inside the declaration's own name/body (e.g. recursion showing up as a self-loop)
    if (refDecl.node === found.node) continue;

    const named = refDecl.node as { getName?(): string | undefined };
    const callerFile = toRelativePath(ref.getSourceFile().getFilePath(), rootDir);
    callers.push({
      file: callerFile,
      name: named.getName?.() ?? '<anonymous>',
      kind: refDecl.kind,
      startLine: refDecl.node.getStartLineNumber(),
      endLine: refDecl.node.getEndLineNumber(),
    });
  }
  return callers;
}

/**
 * BFS outward from each affected symbol through `findReferencesAsNodes()`,
 * recording an edge from each caller's enclosing declaration back to the
 * symbol it calls, up to `maxDepth` hops.
 */
export function buildCallGraph(
  project: Project,
  affected: AffectedSymbol[],
  rootDir: string,
  maxDepth = 2,
): ImpactEdge[] {
  const edges: ImpactEdge[] = [];
  const edgeKeys = new Set<string>();
  const visited = new Set<string>(affected.map(symbolKey));
  let frontier = affected;

  for (let depth = 1; depth <= maxDepth && frontier.length > 0; depth++) {
    const nextFrontier: AffectedSymbol[] = [];

    for (const symbol of frontier) {
      const callers = findCallers(project, symbol, rootDir);

      for (const caller of callers) {
        const key = `${caller.file}|${symbol.file}|calls`;
        if (!edgeKeys.has(key)) {
          edgeKeys.add(key);
          edges.push({ from: caller.file, to: symbol.file, kind: 'calls', weight: 1 / depth });
        }

        const callerKey = symbolKey(caller);
        if (!visited.has(callerKey)) {
          visited.add(callerKey);
          nextFrontier.push(caller);
        }
      }
    }

    frontier = nextFrontier;
  }

  return edges;
}

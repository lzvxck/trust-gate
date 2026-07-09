import { Node, type Project, SyntaxKind } from 'ts-morph';
import { getDescendantAtLine, resolveSourceFile } from './resolve-source-file.js';
import type { AffectedSymbol, ParsedFileDiff, SymbolKind } from './types.js';

export const DECLARATION_KINDS = new Map<SyntaxKind, SymbolKind>([
  [SyntaxKind.MethodDeclaration, 'method'],
  [SyntaxKind.GetAccessor, 'method'],
  [SyntaxKind.SetAccessor, 'method'],
  [SyntaxKind.FunctionDeclaration, 'function'],
  [SyntaxKind.ClassDeclaration, 'class'],
  [SyntaxKind.VariableDeclaration, 'variable'],
  [SyntaxKind.PropertyDeclaration, 'variable'],
  [SyntaxKind.ExportAssignment, 'export'],
]);

export interface NamedNode extends Node {
  getName?(): string | undefined;
}

export function findEnclosingDeclaration(node: Node): { node: Node; kind: SymbolKind } | null {
  let current: Node | undefined = node;
  while (current) {
    const kind = DECLARATION_KINDS.get(current.getKind());
    if (kind) return { node: current, kind };

    // the const/let/var keyword's parent is the declaration *list*, not any one
    // declaration in it — landing there (e.g. cursor on the keyword) would
    // otherwise walk straight past the VariableDeclaration we actually want.
    if (Node.isVariableDeclarationList(current)) {
      const [first] = current.getDeclarations();
      if (first) return { node: first, kind: 'variable' };
    }

    current = current.getParent();
  }
  return null;
}

/**
 * Maps each changed line in a diff to its enclosing declaration in the
 * live ts-morph project, deduplicating declarations hit by multiple lines.
 */
export function resolveAffectedSymbols(
  project: Project,
  diffs: ParsedFileDiff[],
): AffectedSymbol[] {
  const seen = new Map<string, AffectedSymbol>();

  for (const diff of diffs) {
    const sourceFile = resolveSourceFile(project, diff.file);
    if (!sourceFile) continue;

    for (const line of diff.changedLines) {
      const node = getDescendantAtLine(sourceFile, line);
      const found = findEnclosingDeclaration(node);
      if (!found) continue;

      const named = found.node as NamedNode;
      const name = named.getName?.() ?? '<anonymous>';
      const startLine = found.node.getStartLineNumber();
      const endLine = found.node.getEndLineNumber();
      const key = `${diff.file}#${name}#${found.kind}#${startLine}`;

      if (!seen.has(key)) {
        seen.set(key, { file: diff.file, name, kind: found.kind, startLine, endLine });
      }
    }
  }

  return Array.from(seen.values());
}

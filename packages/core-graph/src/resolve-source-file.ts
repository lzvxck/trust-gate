import type { Node, Project, SourceFile } from 'ts-morph';

/** Resolves a diff-relative file path against the files actually loaded in the project. */
export function resolveSourceFile(project: Project, path: string): SourceFile | undefined {
  const direct = project.getSourceFile(path);
  if (direct) return direct;
  const normalized = path.replace(/^\.\//, '');
  return project.getSourceFiles().find((sf) => sf.getFilePath().endsWith(normalized));
}

/** ts-morph has no `getDescendantAtLineAndColumn`; go through the compiler's line/pos mapping instead. */
export function getDescendantAtLine(sourceFile: SourceFile, line: number, column = 0): Node {
  const lastLine = sourceFile.getEndLineNumber();
  const targetLine = Math.min(Math.max(line, 1), lastLine);
  const pos = sourceFile.compilerNode.getPositionOfLineAndCharacter(targetLine - 1, column);
  return sourceFile.getDescendantAtPos(pos) ?? sourceFile;
}

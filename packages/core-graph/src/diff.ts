import type { ParsedFileDiff } from './types.js';

const FILE_HEADER = /^\+\+\+ (?:b\/)?(.+)$/;
const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/**
 * Parses a unified/git diff into per-file changed line numbers in the
 * post-change ("new") version of each file. Deleted-only lines have no new
 * line number, so they're attributed to the line they're adjacent to —
 * good enough to locate the enclosing symbol.
 */
export function parseDiff(diffText: string): ParsedFileDiff[] {
  const files: ParsedFileDiff[] = [];
  let current: ParsedFileDiff | null = null;
  let newLine = 0;

  for (const line of diffText.split('\n')) {
    const fileMatch = FILE_HEADER.exec(line);
    if (fileMatch?.[1]) {
      const path = fileMatch[1];
      if (path === '/dev/null') {
        current = null;
        continue;
      }
      current = { file: path, changedLines: [] };
      files.push(current);
      continue;
    }

    const hunkMatch = HUNK_HEADER.exec(line);
    if (hunkMatch) {
      newLine = Number(hunkMatch[1]);
      continue;
    }

    if (!current) continue;

    if (line.startsWith('+') && !line.startsWith('+++')) {
      current.changedLines.push(newLine);
      newLine++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      current.changedLines.push(Math.max(newLine, 1));
    } else if (line.startsWith(' ') || line === '') {
      newLine++;
    }
    // lines like "\ No newline at end of file" are ignored
  }

  for (const f of files) {
    f.changedLines = Array.from(new Set(f.changedLines)).sort((a, b) => a - b);
  }

  return files;
}

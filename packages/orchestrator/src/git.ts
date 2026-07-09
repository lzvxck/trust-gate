import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { StashRestoreError } from './types.js';

const execFile = promisify(execFileCb);

async function git(repoRoot: string, args: string[]): Promise<string> {
  const { stdout } = await execFile('git', args, { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}

/** `git diff <baseRef>` against the current working tree (includes staged + unstaged changes). */
export async function getDiff(repoRoot: string, baseRef: string): Promise<string> {
  return git(repoRoot, ['diff', baseRef]);
}

const NOTHING_TO_STASH = /no local changes to save/i;

/**
 * Stashes uncommitted changes (including untracked files), runs `fn` against the
 * clean baseRef state, then restores the stash. If nothing was stashed (clean tree),
 * `fn` just runs as-is. If restoring fails, throws StashRestoreError -- the stash
 * entry is left in place rather than risking data loss.
 */
export async function stashAndRun<T>(repoRoot: string, fn: () => Promise<T>): Promise<T> {
  const stashOutput = await git(repoRoot, ['stash', 'push', '--include-untracked']);
  const stashed = !NOTHING_TO_STASH.test(stashOutput);

  let result: T;
  try {
    result = await fn();
  } catch (fnError) {
    if (stashed) {
      try {
        await git(repoRoot, ['stash', 'pop']);
      } catch (popError) {
        // fn's error is real but a failed pop risks losing the user's work -- that takes priority.
        throw new StashRestoreError(
          popError instanceof Error ? popError.message : String(popError),
          {
            cause: fnError,
          },
        );
      }
    }
    throw fnError;
  }

  if (stashed) {
    try {
      await git(repoRoot, ['stash', 'pop']);
    } catch (popError) {
      throw new StashRestoreError(popError instanceof Error ? popError.message : String(popError));
    }
  }
  return result;
}

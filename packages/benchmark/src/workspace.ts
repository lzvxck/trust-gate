import { execFile as execFileCb } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);

// Same reasoning as packages/orchestrator/src/e2e.test.ts: created under this
// package's own __fixtures__ dir (not os.tmpdir()) so resolveVitestBin's
// walk-up-the-tree search finds the monorepo's installed vitest -- an isolated
// OS-tmp repo has no node_modules to find. Not committed (empty dirs aren't
// tracked by git), so the parent must be created before mkdtemp can use it.
const scratchRoot = fileURLToPath(new URL('./__fixtures__', import.meta.url));
await mkdir(scratchRoot, { recursive: true });

const fixturesRoot = fileURLToPath(new URL('./fixtures', import.meta.url));

async function git(cwd: string, args: string[]): Promise<void> {
  await execFile('git', args, { cwd });
}

/**
 * Copies a committed fixture template into a fresh scratch git repo with one
 * baseline commit -- mirrors e2e.test.ts's commitBaseline exactly (including the
 * node_modules-only .gitignore, so `git stash --include-untracked` never sweeps
 * vitest's own cache dir).
 */
export async function setupWorkspace(fixture: string): Promise<string> {
  const dir = await mkdtemp(`${scratchRoot}/tmp-${fixture}-`);
  await cp(`${fixturesRoot}/${fixture}`, dir, { recursive: true });
  await writeFile(`${dir}/.gitignore`, 'node_modules/\n');

  await git(dir, ['init', '-q']);
  await git(dir, ['config', 'user.email', 'benchmark@trust-gate.local']);
  await git(dir, ['config', 'user.name', 'trust-gate-benchmark']);
  await git(dir, ['add', '-A']);
  await git(dir, ['commit', '-q', '-m', 'baseline']);

  return dir;
}

export async function teardownWorkspace(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

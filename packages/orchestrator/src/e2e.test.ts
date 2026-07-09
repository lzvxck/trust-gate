import { afterEach, describe, expect, test } from 'bun:test';
import { execFile as execFileCb } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { checkRegression } from './check-regression.js';
import { getImpactReport } from './get-impact-report.js';

const execFile = promisify(execFileCb);

// Created under this package's own __fixtures__ dir (not os.tmpdir()) so that
// resolveVitestBin's walk-up-the-tree search finds this monorepo's installed
// vitest -- an isolated OS-tmp repo wouldn't have a node_modules to find.
// tmp-* is gitignored; always cleaned up in afterEach regardless of pass/fail.
const fixturesRoot = fileURLToPath(new URL('./__fixtures__', import.meta.url));

let repoRoot: string | undefined;

afterEach(async () => {
  if (repoRoot) await rm(repoRoot, { recursive: true, force: true });
  repoRoot = undefined;
});

async function git(cwd: string, args: string[]): Promise<void> {
  await execFile('git', args, { cwd });
}

/**
 * Any real target repo has node_modules gitignored, so `git stash --include-untracked`
 * (not `--all`) never touches it. Vitest's own cache dir (node_modules/.vite) is exactly
 * the kind of untracked-but-ignored artifact that must NOT get swept into the stash --
 * without this, running vitest again post-stash recreates that path and the later
 * `git stash pop` collides with it. Mirrors real-world repo setup, not a workaround.
 */
async function commitBaseline(dir: string): Promise<void> {
  await writeFile(`${dir}/.gitignore`, 'node_modules/\n');
  await git(dir, ['init', '-q']);
  await git(dir, ['config', 'user.email', 'test@example.com']);
  await git(dir, ['config', 'user.name', 'Test']);
  await git(dir, ['add', '-A']);
  await git(dir, ['commit', '-q', '-m', 'baseline']);
}

const CORRECT_MATH = `export function add(a: number, b: number): number {\n  return a + b;\n}\n\nexport function sub(a: number, b: number): number {\n  return a - b;\n}\n`;
const REGRESSED_MATH = `export function add(a: number, b: number): number {\n  return a - b;\n}\n\nexport function sub(a: number, b: number): number {\n  return a - b;\n}\n`;
const ADD_TEST = `import { expect, test } from 'vitest';\nimport { add } from './math.js';\n\ntest('add adds two numbers', () => {\n  expect(add(1, 2)).toBe(3);\n});\n`;
const SUB_TEST = `import { expect, test } from 'vitest';\nimport { sub } from './math.js';\n\ntest('sub subtracts two numbers', () => {\n  expect(sub(5, 2)).toBe(3);\n});\n`;

/** Real git repo: baseline commit with correct math, then an *uncommitted* regression edit. */
async function makeRegressionRepo(): Promise<string> {
  const dir = await mkdtemp(`${fixturesRoot}/tmp-repo-`);
  await mkdir(`${dir}/src`, { recursive: true });
  await writeFile(`${dir}/src/math.ts`, CORRECT_MATH);
  await writeFile(`${dir}/src/math.add.test.ts`, ADD_TEST);
  await writeFile(`${dir}/src/math.sub.test.ts`, SUB_TEST);

  await commitBaseline(dir);

  // Uncommitted regression -- exactly what an agent's in-progress edit looks like.
  await writeFile(`${dir}/src/math.ts`, REGRESSED_MATH);

  return dir;
}

describe('orchestrator e2e: real git repo, real diff, real stash', () => {
  test('getImpactReport is static-only and never executes tests', async () => {
    repoRoot = await makeRegressionRepo();

    const blast = await getImpactReport({ repoRoot });

    expect(blast.fullSuiteFallback).toBe(false);
    const addEntry = blast.atRiskTests.find((t) => t.testFile === 'src/math.add.test.ts');
    expect(addEntry).toBeDefined();
    expect(addEntry?.reason).toEqual(['static-import']);
    expect(addEntry?.reason).not.toContain('coverage');
  }, 30_000);

  test('checkRegression flags the broken test as pass-to-pass, not pre-existing, and restores the stash', async () => {
    repoRoot = await makeRegressionRepo();

    const verdict = await checkRegression({ repoRoot });

    expect(verdict.status).toBe('fail');
    expect(verdict.newFailures).toHaveLength(0);
    expect(verdict.preExistingFailures).toHaveLength(0);
    expect(verdict.passToPassFailures).toHaveLength(1);
    expect(verdict.passToPassFailures[0]?.testFile).toBe('src/math.add.test.ts');

    expect(verdict.testResults).toHaveLength(2);
    expect(verdict.testResults).toContainEqual(
      expect.objectContaining({ testFile: 'src/math.add.test.ts', status: 'fail' }),
    );
    expect(verdict.testResults).toContainEqual(
      expect.objectContaining({ testFile: 'src/math.sub.test.ts', status: 'pass' }),
    );

    // stash must have been popped -- the regression edit should still be sitting uncommitted.
    const { stdout } = await execFile('git', ['status', '--porcelain'], { cwd: repoRoot });
    expect(stdout).toContain('src/math.ts');
    const { stdout: stashList } = await execFile('git', ['stash', 'list'], { cwd: repoRoot });
    expect(stashList.trim()).toBe('');
  }, 30_000);

  test('checkRegression is a no-op pass when there is nothing uncommitted', async () => {
    repoRoot = await mkdtemp(`${fixturesRoot}/tmp-repo-`);
    await mkdir(`${repoRoot}/src`, { recursive: true });
    await writeFile(`${repoRoot}/src/math.ts`, CORRECT_MATH);
    await commitBaseline(repoRoot);

    const verdict = await checkRegression({ repoRoot });

    expect(verdict).toMatchObject({ status: 'pass', testsRun: 0 });
  }, 30_000);
});

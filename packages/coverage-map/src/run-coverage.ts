import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { type IstanbulCoverage, parseIstanbulCoverage } from './parse-coverage.js';
import { resolveVitestBin } from './resolve-vitest.js';
import type { CoveredLines } from './types.js';

/** Runs a single test file under vitest with v8 coverage, returning source lines it touched. */
export async function runCoverageForTestFile(testFile: string, cwd: string): Promise<CoveredLines> {
  const reportsDir = await mkdtemp(join(tmpdir(), 'trust-gate-coverage-'));

  try {
    await runVitest(testFile, cwd, reportsDir);
    const raw = await readFile(join(reportsDir, 'coverage-final.json'), 'utf8');
    const coverage = JSON.parse(raw) as IstanbulCoverage;
    return parseIstanbulCoverage(coverage, cwd);
  } finally {
    await rm(reportsDir, { recursive: true, force: true });
  }
}

function runVitest(testFile: string, cwd: string, reportsDir: string): Promise<void> {
  const bin = resolveVitestBin(cwd);
  // vitest's CLI arg parser mangles Windows backslash paths passed as `--flag=value`; forward slashes work fine.
  const reportsDirArg = reportsDir.split(sep).join('/');
  const args = [
    'run',
    testFile,
    '--coverage',
    '--coverage.provider=v8',
    '--coverage.reporter=json',
    `--coverage.reportsDirectory=${reportsDirArg}`,
    // coverage answers "what did this test execute", independent of whether its assertions
    // passed -- vitest skips writing the report on a failing run unless told otherwise.
    '--coverage.reportOnFailure',
    '--reporter=dot',
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd, shell: process.platform === 'win32' });

    let stderr = '';
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      // vitest exits non-zero when tests fail, which is expected input for
      // this pipeline (a failing test still produces valid coverage output).
      if (code === 0 || code === 1) {
        resolve();
      } else {
        reject(new Error(`vitest exited with code ${code} running ${testFile}\n${stderr}`));
      }
    });
  });
}

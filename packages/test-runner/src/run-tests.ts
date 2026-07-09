import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import type { JestJsonReport } from './parse-results.js';
import { parseTestResults, toFailures } from './parse-results.js';
import { resolveVitestBin } from './resolve-vitest.js';
import type { RunTestsOptions, TestRunResult } from './types.js';

/** Runs exactly the given test files under vitest and returns structured pass/fail results. */
export async function runTests(
  testFiles: string[],
  options: RunTestsOptions,
): Promise<TestRunResult> {
  if (testFiles.length === 0) return { results: [], failures: [] };

  const { cwd, timeoutMs } = options;
  const outDir = await mkdtemp(join(tmpdir(), 'trust-gate-test-runner-'));
  const outputFile = join(outDir, 'results.json');

  try {
    await runVitest(testFiles, cwd, outputFile, timeoutMs);
    const raw = await readFile(outputFile, 'utf8');
    const report = JSON.parse(raw) as JestJsonReport;
    const results = parseTestResults(report, cwd);
    return { results, failures: toFailures(results) };
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

function runVitest(
  testFiles: string[],
  cwd: string,
  outputFile: string,
  timeoutMs?: number,
): Promise<void> {
  const bin = resolveVitestBin(cwd);
  // vitest's CLI arg parser mangles Windows backslash paths passed as `--flag=value`; forward slashes work fine.
  const outputFileArg = outputFile.split(sep).join('/');
  const args = ['run', ...testFiles, '--reporter=json', `--outputFile=${outputFileArg}`];

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd,
      shell: process.platform === 'win32',
      timeout: timeoutMs,
    });

    let stderr = '';
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      // non-zero just means some test(s) failed -- that's valid input for this pipeline.
      if (code === 0 || code === 1) {
        resolve();
      } else {
        reject(
          new Error(`vitest exited with code ${code} running ${testFiles.join(', ')}\n${stderr}`),
        );
      }
    });
  });
}

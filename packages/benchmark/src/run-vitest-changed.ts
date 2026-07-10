import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { type JestJsonReport, parseTestResults, resolveVitestBin } from '@trust-gate/test-runner';
import type { ArmResult } from './types.js';

/**
 * The naive baseline: `vitest run --changed <ref>` selects test files purely from
 * vitest's own static module graph. Zero matches still produces a valid (empty) JSON
 * report -- confirmed empirically, not assumed -- so "the target test never ran" and
 * "the target test ran and passed" are both real, distinguishable "not caught" cases.
 */
export async function runVitestChanged(
  repoRoot: string,
  expectedFailure: string,
): Promise<ArmResult> {
  const outDir = await mkdtemp(join(tmpdir(), 'trust-gate-benchmark-'));
  const outputFile = join(outDir, 'results.json').split(sep).join('/');
  const bin = resolveVitestBin(repoRoot);

  const start = performance.now();
  try {
    await runVitest(bin, repoRoot, outputFile);
    const durationMs = performance.now() - start;

    const raw = await readFile(outputFile, 'utf8');
    const report = JSON.parse(raw) as JestJsonReport;
    const results = parseTestResults(report, repoRoot);

    const match = results.find((r) => `${r.testFile} :: ${r.testName}` === expectedFailure);
    const caught = match?.status === 'fail';

    const detail = match
      ? `selected, status=${match.status}`
      : `not selected -- ${results.length} test(s) ran: ${results.map((r) => r.testFile).join(', ') || 'none'}`;

    return { caught, detail, durationMs };
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

function runVitest(bin: string, cwd: string, outputFile: string): Promise<void> {
  const args = ['run', '--changed', 'HEAD', '--reporter=json', `--outputFile=${outputFile}`];

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd, shell: process.platform === 'win32' });

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
        reject(new Error(`vitest --changed exited with code ${code}\n${stderr}`));
      }
    });
  });
}

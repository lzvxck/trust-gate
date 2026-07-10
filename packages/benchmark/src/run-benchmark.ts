import { writeFile } from 'node:fs/promises';
import { runTrustGate } from './run-trust-gate.js';
import { runVitestChanged } from './run-vitest-changed.js';
import { scenarios } from './scenarios.js';
import type { BenchmarkReport, ScenarioResult } from './types.js';
import { setupWorkspace, teardownWorkspace } from './workspace.js';

async function runScenario(scenario: (typeof scenarios)[number]): Promise<ScenarioResult> {
  const repoRoot = await setupWorkspace(scenario.fixture);

  try {
    await writeFile(`${repoRoot}/${scenario.mutation.file}`, scenario.mutation.content);

    const trustGate = await runTrustGate(repoRoot, scenario.expectedFailure);
    const vitestChanged = await runVitestChanged(repoRoot, scenario.expectedFailure);

    return { scenario, trustGate, vitestChanged };
  } finally {
    await teardownWorkspace(repoRoot);
  }
}

export async function runBenchmark(): Promise<BenchmarkReport> {
  const results: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    console.error(`Running ${scenario.name}...`);
    results.push(await runScenario(scenario));
  }

  return { generatedAt: new Date().toISOString(), results };
}

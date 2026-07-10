import type { BenchmarkReport, ScenarioResult } from './types.js';

function mark(caught: boolean): string {
  return caught ? '✅ caught' : '❌ missed';
}

function catchRate(results: ScenarioResult[], arm: 'trustGate' | 'vitestChanged'): string {
  if (results.length === 0) return 'n/a';
  const caught = results.filter((r) => r[arm].caught).length;
  return `${caught}/${results.length} (${Math.round((100 * caught) / results.length)}%)`;
}

export function toMarkdown(report: BenchmarkReport): string {
  const dynamic = report.results.filter((r) => r.scenario.kind === 'dynamic');
  const control = report.results.filter((r) => r.scenario.kind === 'static-control');

  const lines: string[] = [];
  lines.push('# Trust Gate catch-rate benchmark');
  lines.push('');
  lines.push(`Generated ${report.generatedAt}.`);
  lines.push('');
  lines.push(
    "Trust Gate's `check_regression` unions a static import-graph analysis with " +
      'runtime test coverage; `vitest --changed` is purely static-import-graph-based. ' +
      'The gap between them is regressions reached only through dynamic imports, DI ' +
      'containers, or string-keyed plugin registries -- no static import edge exists ' +
      'for either tool to follow, but Trust Gate still knows (from coverage data) which ' +
      'tests actually exercise that code at runtime. These are purpose-built fixtures ' +
      '(`src/fixtures/`) modeling that specific pattern in three realistic contexts, plus ' +
      "one plain static-import control case to confirm the benchmark isn't rigged -- not " +
      'a random sample of real-world OSS regressions.',
  );
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| | Trust Gate | `vitest --changed` |');
  lines.push('|---|---|---|');
  lines.push(
    `| Dynamic-import/DI/registry blind spot (${dynamic.length} scenarios) | ${catchRate(dynamic, 'trustGate')} | ${catchRate(dynamic, 'vitestChanged')} |`,
  );
  lines.push(
    `| Static-import control (${control.length} scenario) | ${catchRate(control, 'trustGate')} | ${catchRate(control, 'vitestChanged')} |`,
  );
  lines.push('');
  lines.push('## Per-scenario detail');
  lines.push('');
  lines.push('| Scenario | Pattern | Trust Gate | `vitest --changed` |');
  lines.push('|---|---|---|---|');
  for (const r of report.results) {
    lines.push(
      `| \`${r.scenario.name}\` | ${r.scenario.description} | ${mark(r.trustGate.caught)} | ${mark(r.vitestChanged.caught)} |`,
    );
  }
  lines.push('');
  lines.push('## Raw detail');
  lines.push('');
  for (const r of report.results) {
    lines.push(`### ${r.scenario.name}`);
    lines.push('');
    lines.push(`Expected failure: \`${r.scenario.expectedFailure}\``);
    lines.push('');
    lines.push(
      `- Trust Gate: ${mark(r.trustGate.caught)} (${r.trustGate.durationMs.toFixed(0)}ms) -- ${r.trustGate.detail}`,
    );
    lines.push(
      `- \`vitest --changed\`: ${mark(r.vitestChanged.caught)} (${r.vitestChanged.durationMs.toFixed(0)}ms) -- ${r.vitestChanged.detail}`,
    );
    lines.push('');
  }

  return lines.join('\n');
}

export function toConsole(report: BenchmarkReport): string {
  const lines: string[] = [];
  for (const r of report.results) {
    lines.push(
      `${r.scenario.name.padEnd(16)} trust-gate=${mark(r.trustGate.caught).padEnd(11)} vitest-changed=${mark(r.vitestChanged.caught)}`,
    );
  }
  return lines.join('\n');
}

import { describe, expect, test } from 'bun:test';
import { toConsole, toMarkdown } from './report.js';
import type { BenchmarkReport } from './types.js';

const report: BenchmarkReport = {
  generatedAt: '2026-01-01T00:00:00.000Z',
  results: [
    {
      scenario: {
        name: 'dynamic-thing',
        description: 'a dynamic pattern',
        fixture: 'dynamic-thing',
        mutation: { file: 'src/a.ts', content: '' },
        expectedFailure: 'src/a.test.ts :: a',
        kind: 'dynamic',
      },
      trustGate: { caught: true, detail: 'passToPassFailures: src/a.test.ts :: a', durationMs: 12 },
      vitestChanged: {
        caught: false,
        detail: 'not selected -- 0 test(s) ran: none',
        durationMs: 3,
      },
    },
    {
      scenario: {
        name: 'static-thing',
        description: 'a static control',
        fixture: 'static-thing',
        mutation: { file: 'src/b.ts', content: '' },
        expectedFailure: 'src/b.test.ts :: b',
        kind: 'static-control',
      },
      trustGate: { caught: true, detail: 'passToPassFailures: src/b.test.ts :: b', durationMs: 10 },
      vitestChanged: { caught: true, detail: 'selected, status=fail', durationMs: 5 },
    },
  ],
};

describe('toMarkdown', () => {
  test('summarizes catch rate per category', () => {
    const md = toMarkdown(report);
    expect(md).toContain(
      'Dynamic-import/DI/registry blind spot (1 scenarios) | 1/1 (100%) | 0/1 (0%)',
    );
    expect(md).toContain('Static-import control (1 scenario) | 1/1 (100%) | 1/1 (100%)');
  });

  test('lists every scenario in the per-scenario table', () => {
    const md = toMarkdown(report);
    expect(md).toContain('`dynamic-thing`');
    expect(md).toContain('`static-thing`');
  });
});

describe('toConsole', () => {
  test('prints one line per scenario with both arms', () => {
    const out = toConsole(report);
    const lines = out.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('dynamic-thing');
    expect(lines[0]).toContain('✅ caught');
    expect(lines[0]).toContain('❌ missed');
  });
});

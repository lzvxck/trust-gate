#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { toConsole, toMarkdown } from './report.js';
import { runBenchmark } from './run-benchmark.js';

const outPath = fileURLToPath(new URL('../../../BENCHMARK.md', import.meta.url));

const report = await runBenchmark();

console.error('');
console.error(toConsole(report));
console.error('');

await writeFile(outPath, toMarkdown(report));
console.error(`Wrote ${outPath}`);

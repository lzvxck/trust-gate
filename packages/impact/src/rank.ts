import type { ImpactEdge } from '@trust-gate/core-graph';
import type {
  AtRiskReason,
  AtRiskTest,
  BlastRadius,
  BuildBlastRadiusInput,
  BuildBlastRadiusOptions,
} from './types.js';

const DEFAULT_TEST_FILE_PATTERN = /\.(test|spec)\.[cm]?[jt]sx?$/;

interface Candidate {
  staticWeight: number | undefined;
  hasCoverage: boolean;
}

export function buildBlastRadius(
  input: BuildBlastRadiusInput,
  options: BuildBlastRadiusOptions = {},
): BlastRadius {
  const { changedFiles, affected, edges, coverageMap } = input;
  const testFilePattern = options.testFilePattern ?? DEFAULT_TEST_FILE_PATTERN;
  const flakiness = options.flakiness ?? {};

  const candidates = new Map<string, Candidate>();
  for (const edge of edges) {
    if (edge.kind === 'covers') continue;
    if (!testFilePattern.test(edge.from)) continue;
    const existing = candidates.get(edge.from);
    const staticWeight = Math.max(existing?.staticWeight ?? 0, edge.weight);
    candidates.set(edge.from, {
      ...existing,
      staticWeight,
      hasCoverage: existing?.hasCoverage ?? false,
    });
  }

  const affectedFiles = new Set(affected.map((s) => s.file));
  const symbolsByFile = new Map<string, typeof affected>();
  for (const symbol of affected) {
    const list = symbolsByFile.get(symbol.file) ?? [];
    list.push(symbol);
    symbolsByFile.set(symbol.file, list);
  }

  const coverEdges: ImpactEdge[] = [];

  for (const affectedFile of affectedFiles) {
    const testEntries = coverageMap[affectedFile];
    if (!testEntries) continue;

    const symbols = symbolsByFile.get(affectedFile) ?? [];

    for (const [testFile, lines] of Object.entries(testEntries)) {
      const touchesAffectedSymbol =
        symbols.length === 0 ||
        symbols.some((s) => lines.some((l) => l >= s.startLine && l <= s.endLine));
      if (!touchesAffectedSymbol) continue;

      const existing = candidates.get(testFile);
      candidates.set(testFile, { staticWeight: existing?.staticWeight, hasCoverage: true });
      coverEdges.push({ from: testFile, to: affectedFile, kind: 'covers', weight: 1 });
    }
  }

  const atRiskTests: AtRiskTest[] = [];
  for (const [testFile, candidate] of candidates) {
    const reason: AtRiskReason[] = [];
    if (candidate.staticWeight !== undefined) reason.push('static-import');
    if (candidate.hasCoverage) reason.push('coverage');

    const rawScore = (candidate.staticWeight ?? 0) + (candidate.hasCoverage ? 1 : 0);
    const score = Math.max(0, rawScore - (flakiness[testFile] ?? 0));

    atRiskTests.push({ testFile, score, reason });
  }
  atRiskTests.sort((a, b) => b.score - a.score);

  const fullSuiteFallback = changedFiles.some((file) =>
    isBlindSpot(file, affectedFiles, edges, coverageMap),
  );

  return { affected, edges: [...edges, ...coverEdges], atRiskTests, fullSuiteFallback };
}

function isBlindSpot(
  file: string,
  affectedFiles: Set<string>,
  edges: ImpactEdge[],
  coverageMap: BuildBlastRadiusInput['coverageMap'],
): boolean {
  if (affectedFiles.has(file)) return false;
  if (edges.some((e) => e.to === file)) return false;
  if (coverageMap[file]) return false;
  return true;
}

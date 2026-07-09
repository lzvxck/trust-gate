import type { AffectedSymbol, ImpactEdge } from '@trust-gate/core-graph';
import type { CoverageMap } from '@trust-gate/coverage-map';

export type AtRiskReason = 'static-import' | 'coverage';

export interface AtRiskTest {
  testFile: string;
  testName?: string;
  score: number;
  reason: AtRiskReason[];
}

export interface BlastRadius {
  affected: AffectedSymbol[];
  edges: ImpactEdge[];
  atRiskTests: AtRiskTest[];
  fullSuiteFallback: boolean;
}

export interface BuildBlastRadiusOptions {
  /** Identifies which files in the graph are test files. */
  testFilePattern?: RegExp;
  /** testFile -> penalty in [0, 1], subtracted from score. No data source wired up yet (Week 4+); defaults to none. */
  flakiness?: Record<string, number>;
}

export interface BuildBlastRadiusInput {
  changedFiles: string[];
  affected: AffectedSymbol[];
  edges: ImpactEdge[];
  coverageMap: CoverageMap;
}

export type { AffectedSymbol, ImpactEdge } from '@trust-gate/core-graph';
export type { CoverageMap } from '@trust-gate/coverage-map';

import { buildImpactGraph, parseDiff } from '@trust-gate/core-graph';
import { buildBlastRadius } from '@trust-gate/impact';
import { getDiff } from './git.js';
import { loadProject } from './project.js';
import type { BlastRadius, OrchestratorInput } from './types.js';

const EMPTY_BLAST: BlastRadius = {
  affected: [],
  edges: [],
  atRiskTests: [],
  fullSuiteFallback: false,
};

/**
 * Static-only impact preview: no test execution. Deliberately passes an empty
 * coverage map into buildBlastRadius, so every AtRiskTest.reason here is
 * 'static-import' only -- building a real coverage map means running tests,
 * which would contradict this tool's "no test execution" contract. The
 * coverage signal (and full ranking) only applies in checkRegression.
 */
export async function getImpactReport(input: OrchestratorInput): Promise<BlastRadius> {
  const { repoRoot, baseRef = 'HEAD' } = input;

  const diffText = await getDiff(repoRoot, baseRef);
  if (diffText.trim() === '') return EMPTY_BLAST;

  const project = loadProject(repoRoot);
  const { affected, edges } = buildImpactGraph(project, diffText, repoRoot);
  const changedFiles = parseDiff(diffText).map((d) => d.file);

  return buildBlastRadius({ changedFiles, affected, edges, coverageMap: {} });
}

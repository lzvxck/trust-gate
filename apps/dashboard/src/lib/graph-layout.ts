import type { AtRiskTest, ImpactEdge, ImpactEdgeKind } from './api';

export interface GraphNode {
  id: string;
  layer: number;
  index: number;
  kind: 'changed' | 'test' | 'file';
  atRiskScore?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: ImpactEdgeKind;
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Pulls changed file paths out of a unified diff's `+++ b/<path>` / `--- a/<path>`
 * headers -- the only reliable source of "which files were actually in the diff"
 * available on a RunDetail (impact_edges has no explicit changed-file flag).
 */
export function parseChangedFiles(diff: string): Set<string> {
  const files = new Set<string>();
  const headerPattern = /^(?:\+\+\+ b\/|--- a\/)(.+)$/gm;
  let match: RegExpExecArray | null = headerPattern.exec(diff);
  while (match !== null) {
    files.add(match[1].trim());
    match = headerPattern.exec(diff);
  }
  return files;
}

/**
 * Layers nodes by BFS distance (via reversed edges) from the changed files, so the
 * graph reads left-to-right as "diff -> affected files -> tests that cover them" --
 * matching impact_edges' own direction convention (edge.from imports/covers edge.to,
 * so a changed file is a graph sink and tests are the roots reaching toward it).
 */
export function layoutImpactGraph(
  edges: Pick<ImpactEdge, 'fromSymbol' | 'toSymbol' | 'kind'>[],
  atRiskTests: Pick<AtRiskTest, 'testFile' | 'score'>[],
  diff: string,
): GraphLayout {
  const nodeIds = new Set<string>();
  for (const e of edges) {
    nodeIds.add(e.fromSymbol);
    nodeIds.add(e.toSymbol);
  }
  for (const t of atRiskTests) nodeIds.add(t.testFile);
  if (nodeIds.size === 0) return { nodes: [], edges: [] };

  const changed = new Set([...parseChangedFiles(diff)].filter((file) => nodeIds.has(file)));
  if (changed.size === 0) {
    // No diff header matched a graph node -- fall back to files with no outgoing
    // edge (nothing imports/covers *from* them), which are the graph's sinks.
    const outgoing = new Set(edges.map((e) => e.fromSymbol));
    for (const id of nodeIds) {
      if (!outgoing.has(id)) changed.add(id);
    }
  }

  const reverseAdjacency = new Map<string, string[]>();
  for (const e of edges) {
    const importers = reverseAdjacency.get(e.toSymbol) ?? [];
    importers.push(e.fromSymbol);
    reverseAdjacency.set(e.toSymbol, importers);
  }

  const layer = new Map<string, number>();
  const queue: string[] = [];
  for (const id of changed) {
    layer.set(id, 0);
    queue.push(id);
  }
  let cursor = 0;
  while (cursor < queue.length) {
    const current = queue[cursor];
    cursor += 1;
    const currentLayer = layer.get(current) ?? 0;
    for (const importer of reverseAdjacency.get(current) ?? []) {
      if (!layer.has(importer)) {
        layer.set(importer, currentLayer + 1);
        queue.push(importer);
      }
    }
  }

  let overflowLayer = Math.max(0, ...layer.values()) + 1;
  for (const id of nodeIds) {
    if (!layer.has(id)) {
      layer.set(id, overflowLayer);
      overflowLayer += 1;
    }
  }

  const atRiskByFile = new Map(atRiskTests.map((t) => [t.testFile, t.score]));

  const byLayer = new Map<number, string[]>();
  for (const id of nodeIds) {
    const l = layer.get(id) ?? 0;
    const list = byLayer.get(l) ?? [];
    list.push(id);
    byLayer.set(l, list);
  }

  const nodes: GraphNode[] = [];
  for (const l of [...byLayer.keys()].sort((a, b) => a - b)) {
    const ids = (byLayer.get(l) ?? []).sort();
    ids.forEach((id, index) => {
      nodes.push({
        id,
        layer: l,
        index,
        kind: changed.has(id) ? 'changed' : atRiskByFile.has(id) ? 'test' : 'file',
        atRiskScore: atRiskByFile.get(id),
      });
    });
  }

  const graphEdges: GraphEdge[] = edges.map((e, i) => ({
    id: `${e.fromSymbol}->${e.toSymbol}-${i}`,
    source: e.fromSymbol,
    target: e.toSymbol,
    kind: e.kind,
  }));

  return { nodes, edges: graphEdges };
}

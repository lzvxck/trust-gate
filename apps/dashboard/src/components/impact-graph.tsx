'use client';

import { Background, type Edge, MarkerType, type Node, Position, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { type CSSProperties, useMemo } from 'react';
import type { AtRiskTest, ImpactEdge, ImpactEdgeKind } from '@/lib/api';
import { layoutImpactGraph } from '@/lib/graph-layout';

const COLUMN_WIDTH = 260;
const ROW_HEIGHT = 64;

const EDGE_COLOR: Record<ImpactEdgeKind, string> = {
  imports: '#9297a0',
  calls: '#1b61c9',
  covers: '#0a2e0e',
};

const LEGEND: { label: string; swatch: string }[] = [
  { label: 'Changed file', swatch: '#aa2d00' },
  { label: 'At-risk test', swatch: '#0a2e0e' },
  { label: 'Intermediate file', swatch: '#f8fafc' },
];

interface ImpactGraphProps {
  edges: ImpactEdge[];
  atRiskTests: AtRiskTest[];
  diff: string;
}

export function ImpactGraph({ edges, atRiskTests, diff }: ImpactGraphProps) {
  const { nodes, flowEdges } = useMemo(() => {
    const layout = layoutImpactGraph(edges, atRiskTests, diff);

    const countByLayer = new Map<number, number>();
    for (const n of layout.nodes) {
      countByLayer.set(n.layer, (countByLayer.get(n.layer) ?? 0) + 1);
    }

    const nodes: Node[] = layout.nodes.map((n) => {
      const total = countByLayer.get(n.layer) ?? 1;
      const y = n.index * ROW_HEIGHT - ((total - 1) * ROW_HEIGHT) / 2;
      const shortLabel = n.id.split('/').pop() ?? n.id;
      const label =
        n.kind === 'test' && n.atRiskScore !== undefined
          ? `${shortLabel} (${n.atRiskScore.toFixed(2)})`
          : shortLabel;
      const background =
        n.kind === 'changed' ? '#aa2d00' : n.kind === 'test' ? '#0a2e0e' : '#f8fafc';
      const color = n.kind === 'file' ? '#181d26' : '#ffffff';

      return {
        id: n.id,
        position: { x: n.layer * COLUMN_WIDTH, y },
        data: { label },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          background,
          color,
          border: '1px solid #dddddd',
          borderRadius: 6,
          fontSize: 12,
          padding: '6px 10px',
          width: 'auto',
          maxWidth: 220,
        },
      };
    });

    const flowEdges: Edge[] = layout.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: e.kind === 'covers',
      style: {
        stroke: EDGE_COLOR[e.kind],
        strokeWidth: 1.5,
        strokeDasharray: e.kind === 'covers' ? '4 4' : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR[e.kind] },
    }));

    return { nodes, flowEdges };
  }, [edges, atRiskTests, diff]);

  if (nodes.length === 0) return null;

  return (
    <div>
      <div
        style={
          {
            height: 420,
            '--xy-handle-background-color': 'transparent',
            '--xy-handle-border-color': 'transparent',
          } as CSSProperties
        }
        className="overflow-hidden rounded-md border border-hairline"
      >
        <ReactFlow
          nodes={nodes}
          edges={flowEdges}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} color="#e0e2e6" />
        </ReactFlow>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-caption text-muted">
        {LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full border border-hairline"
              style={{ background: item.swatch }}
            />
            {item.label}
          </span>
        ))}
        <span>imports &mdash; solid gray</span>
        <span>calls &mdash; solid blue</span>
        <span>covers &mdash; dashed green</span>
      </div>
    </div>
  );
}

'use client';

import { useMemo, forwardRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Position,
  Handle,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { HierarchyNode, Alternative } from '@/types';
import { computeGlobalWeights } from '@/lib/topsis';

const NODE_WIDTH = 120;
const NODE_HEIGHT = 40;
const H_GAP = 20;
const V_GAP = 80;

// Color palette — one color per first-level criterion (cycles if > 8)
const CRITERIA_PALETTE = [
  { bg: '#fee2e2', border: '#ef4444', edge: '#ef4444', text: '#991b1b' }, // red   — K1
  { bg: '#dbeafe', border: '#3b82f6', edge: '#3b82f6', text: '#1d4ed8' }, // blue  — K2
  { bg: '#d1fae5', border: '#10b981', edge: '#10b981', text: '#065f46' }, // green — K3
  { bg: '#fef3c7', border: '#f59e0b', edge: '#f59e0b', text: '#92400e' }, // amber — K4
  { bg: '#ede9fe', border: '#8b5cf6', edge: '#8b5cf6', text: '#5b21b6' }, // violet— K5
  { bg: '#fce7f3', border: '#ec4899', edge: '#ec4899', text: '#9d174d' }, // pink  — K6
  { bg: '#cffafe', border: '#06b6d4', edge: '#06b6d4', text: '#164e63' }, // cyan  — K7
  { bg: '#ffedd5', border: '#f97316', edge: '#f97316', text: '#9a3412' }, // orange— K8
];

function palette(idx: number) {
  return CRITERIA_PALETTE[idx % CRITERIA_PALETTE.length];
}

// Build nodeId → first-level criterion index map
function buildColorMap(
  nodes: Record<string, HierarchyNode>,
  goalId: string
): Record<string, number> {
  const map: Record<string, number> = {};
  const children = nodes[goalId]?.children ?? [];
  function assign(nodeId: string, idx: number) {
    map[nodeId] = idx;
    nodes[nodeId]?.children.forEach((c) => assign(c, idx));
  }
  children.forEach((cId, i) => assign(cId, i));
  return map;
}

// ---- layout ----
function subtreeWidth(nodes: Record<string, HierarchyNode>, id: string): number {
  const node = nodes[id];
  if (!node || node.children.length === 0) return NODE_WIDTH + H_GAP;
  return node.children.reduce((sum, cId) => sum + subtreeWidth(nodes, cId), 0);
}

function buildLayout(
  nodes: Record<string, HierarchyNode>,
  goalId: string,
  alternatives: Alternative[]
) {
  const layoutNodes: {
    id: string; x: number; y: number;
    isLeaf: boolean; isGoal: boolean; isAlt: boolean;
    label: string; direction?: string;
  }[] = [];
  const edges: { from: string; to: string }[] = [];

  function place(id: string, x: number, y: number) {
    const node = nodes[id];
    if (!node) return;
    const isLeaf = node.children.length === 0;
    const isGoal = node.parentId === null;
    const w = subtreeWidth(nodes, id);
    const cx = x + w / 2;

    layoutNodes.push({
      id, isLeaf, isGoal, isAlt: false,
      x: cx - NODE_WIDTH / 2, y,
      label: node.name, direction: node.direction,
    });

    let childX = x;
    for (const cId of node.children) {
      edges.push({ from: id, to: cId });
      place(cId, childX, y + NODE_HEIGHT + V_GAP);
      childX += subtreeWidth(nodes, cId);
    }
  }

  place(goalId, 0, 0);

  const leaves = layoutNodes.filter((n) => n.isLeaf && !n.isGoal);
  if (leaves.length > 0 && alternatives.length > 0) {
    const altY = leaves[0].y + NODE_HEIGHT + V_GAP;
    const totalAltW = alternatives.length * (NODE_WIDTH + H_GAP) - H_GAP;
    const leafSpan = leaves[leaves.length - 1].x + NODE_WIDTH - leaves[0].x;
    const startX = leaves[0].x + (leafSpan - totalAltW) / 2;

    alternatives.forEach((alt, i) => {
      layoutNodes.push({
        id: `alt-${alt.id}`,
        x: startX + i * (NODE_WIDTH + H_GAP),
        y: altY,
        isLeaf: false, isGoal: false, isAlt: true,
        label: alt.name,
      });
      leaves.forEach((leaf) => edges.push({ from: leaf.id, to: `alt-${alt.id}` }));
    });
  }

  return { layoutNodes, edges };
}

// ---- Custom node ----
function CriterionNode({
  data,
}: {
  data: {
    label: string;
    isGoal: boolean;
    isLeaf: boolean;
    isAlt: boolean;
    weight?: string;
    direction?: string;
    colorIdx: number;
  };
}) {
  let bg = '#ffffff';
  let border = '#9ca3af';
  let textColor = '#374151';

  if (data.isGoal) {
    bg = '#1f2937'; border = '#1f2937'; textColor = '#ffffff';
  } else {
    bg = '#ffffff'; border = '#1f2937'; textColor = '#374151';
  }

  return (
    <div
      style={{
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        border: `2px solid ${border}`,
        borderRadius: 4,
        background: bg,
        color: textColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 1.3,
        userSelect: 'none',
        padding: '4px',
        boxSizing: 'border-box',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: border, width: 6, height: 6, border: 'none' }}
      />
      <div style={{ width: '100%' }}>
        <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
          {data.label}
        </div>
        {data.weight && (
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: data.direction === 'benefit' ? '#16a34a' : '#dc2626',
            marginTop: 1,
          }}>
            {data.weight} {data.direction === 'cost' ? '(C)' : '(B)'}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: border, width: 6, height: 6, border: 'none' }}
      />
    </div>
  );
}

const NODE_TYPES = { criterion: CriterionNode };

interface Props {
  nodes: Record<string, HierarchyNode>;
  goalId: string;
  alternatives: Alternative[];
}

const TreeFlow = forwardRef<HTMLDivElement, Props>(function TreeFlow(
  { nodes: hierNodes, goalId, alternatives },
  ref
) {
  const globalWeights = useMemo(
    () => computeGlobalWeights(hierNodes, goalId),
    [hierNodes, goalId]
  );

  const colorMap = useMemo(
    () => buildColorMap(hierNodes, goalId),
    [hierNodes, goalId]
  );

  const { layoutNodes, edges: rawEdges } = useMemo(
    () => buildLayout(hierNodes, goalId, alternatives),
    [hierNodes, goalId, alternatives]
  );

  const rfNodes: Node[] = useMemo(
    () =>
      layoutNodes.map((ln) => {
        const gw = globalWeights.find((w) => w.leafId === ln.id);
        const colorIdx = colorMap[ln.id] ?? -1;
        return {
          id: ln.id,
          type: 'criterion',
          position: { x: ln.x, y: ln.y },
          data: {
            label: ln.label,
            isGoal: ln.isGoal,
            isLeaf: ln.isLeaf,
            isAlt: ln.isAlt,
            weight: gw ? `${(gw.globalWeight * 100).toFixed(1)}%` : undefined,
            direction: gw?.direction,
            colorIdx,
          },
          draggable: true,
        };
      }),
    [layoutNodes, globalWeights, colorMap]
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      rawEdges.map((e, idx) => {
        // Color from target first, fallback to source (covers leaf→alt edges)
        const colorIdx = colorMap[e.to] ?? colorMap[e.from] ?? -1;
        const color = colorIdx >= 0 ? palette(colorIdx).edge : '#9ca3af';
        return {
          id: `e-${idx}`,
          source: e.from,
          target: e.to,
          type: 'straight',          // straight lines, no curves
          style: { stroke: color, strokeWidth: 1.5 },
        };
      }),
    [rawEdges, colorMap]
  );

  const [fnodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [fedges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  useEffect(() => { setNodes(rfNodes); }, [rfNodes, setNodes]);
  useEffect(() => { setEdges(rfEdges); }, [rfEdges, setEdges]);

  return (
    <div ref={ref} style={{ width: '100%', height: 600, background: '#ffffff' }}>
      <ReactFlow
        nodes={fnodes}
        edges={fedges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#f3f4f6" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
});

export default function HierarchyTreeView(
  props: Props & { innerRef?: React.RefObject<HTMLDivElement | null> }
) {
  const { innerRef, ...rest } = props;
  return (
    <ReactFlowProvider>
      <TreeFlow {...rest} ref={innerRef} />
    </ReactFlowProvider>
  );
}

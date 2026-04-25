"use client";

import { useProjectStore } from "@/store/projectStore";
import { computeGlobalWeights, getTotalGlobalWeight } from "@/lib/topsis";
import { ahpWeightsFromMatrix, initAHPMatrix, SAATY_SCALE } from "@/lib/ahp";
import type { HierarchyNode } from "@/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

function DirectWeightPanel({
  projectId,
  parentId,
}: {
  projectId: string;
  parentId: string;
}) {
  const { projects, updateNode } = useProjectStore();
  const project = projects[projectId];
  const parent = project?.nodes[parentId];
  if (!parent) return null;

  const children = parent.children.map((id) => project.nodes[id]);
  const total = children.reduce((s, c) => s + (c.localWeight || 0), 0);
  const isValid = Math.abs(total - 1) < 0.001;

  function autoNormalize() {
    if (total === 0) return;
    children.forEach((c) => {
      updateNode(projectId, c.id, {
        localWeight: c.localWeight / total,
      });
    });
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {parent.parentId === null ? "Kriteria utama" : parent.name}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-mono",
              isValid ? "text-green-600" : "text-red-500",
            )}
          >
            Total: {(total * 100).toFixed(2)}% {isValid ? "" : "✗"}
          </span>
          {!isValid && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={autoNormalize}
            >
              Normalisasi
            </Button>
          )}
        </div>
      </div>
      <div className="border border-gray-200 overflow-hidden">
        {children.map((child, idx) => (
          <div
            key={child.id}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5",
              idx !== 0 && "border-t border-gray-100",
            )}
          >
            <span className="flex-1 text-sm">{child.name}</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-24 h-7 text-sm text-right"
                min={0}
                max={100}
                step={0.01}
                value={parseFloat(((child.localWeight || 0) * 100).toFixed(4))}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    updateNode(projectId, child.id, {
                      localWeight: val / 100,
                    });
                  }
                }}
              />
              <span className="text-xs text-gray-400 w-4">%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AHPPanel({
  projectId,
  parentId,
}: {
  projectId: string;
  parentId: string;
}) {
  const { projects, setAHPComparison, applyAHPWeights } = useProjectStore();
  const project = projects[projectId];
  const parent = project?.nodes[parentId];

  const children = parent
    ? parent.children.map((id) => project!.nodes[id])
    : [];
  const n = children.length;
  const saved = parent ? project!.ahpComparisons[parentId] : undefined;

  const [matrix, setMatrix] = useState<number[][]>(
    saved?.matrix ?? initAHPMatrix(n),
  );

  if (!parent) return null;
  if (n < 2) return null;

  const { weights, CR } = ahpWeightsFromMatrix(matrix);
  const highCR = CR > 0.1;

  function setCell(i: number, j: number, val: number) {
    const m = matrix.map((r) => [...r]);
    m[i][j] = val;
    m[j][i] = val === 0 ? 1 : 1 / val;
    setMatrix(m);
  }

  function apply() {
    setAHPComparison(projectId, parentId, {
      matrix,
      nodeIds: children.map((c) => c.id),
    });
    applyAHPWeights(projectId, parentId, weights);
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {parent.parentId === null ? "Kriteria utama" : parent.name}
        </span>
        <span
          className={cn(
            "text-xs",
            highCR ? "text-amber-600" : "text-green-600",
          )}
        >
          CR = {CR.toFixed(4)} {highCR ? "⚠ > 0.1" : ""}
        </span>
      </div>

      {highCR && (
        <Alert className="mb-3 border-amber-200 bg-amber-50">
          <AlertDescription className="text-xs text-amber-700">
            Consistency Ratio melebihi 0.1. Pertimbangkan untuk merevisi
            perbandingan.
          </AlertDescription>
        </Alert>
      )}

      <div className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              <th className="w-28" />
              {children.map((c) => (
                <th
                  key={c.id}
                  className="px-2 py-1 font-medium text-gray-600 text-center min-w-20"
                >
                  {c.name}
                </th>
              ))}
              <th className="px-2 py-1 font-medium text-gray-600">Bobot</th>
            </tr>
          </thead>
          <tbody>
            {children.map((row, i) => (
              <tr key={row.id}>
                <td className="px-2 py-1 font-medium text-gray-700 text-right pr-3 whitespace-nowrap">
                  {row.name}
                </td>
                {children.map((_, j) => (
                  <td key={j} className="px-1 py-0.5">
                    {i === j ? (
                      <div className="w-16 h-7 bg-gray-100 flex items-center justify-center text-gray-400">
                        1
                      </div>
                    ) : i < j ? (
                      <select
                        className="w-20 h-7 text-xs border border-gray-200 px-1 bg-white"
                        value={matrix[i][j]}
                        onChange={(e) =>
                          setCell(i, j, parseFloat(e.target.value))
                        }
                      >
                        {SAATY_SCALE.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.value < 1
                              ? `1/${Math.round(1 / s.value)}`
                              : s.value}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-20 h-7 bg-gray-50 flex items-center justify-center text-gray-500">
                        {matrix[i][j] < 1
                          ? `1/${Math.round(1 / matrix[i][j])}`
                          : matrix[i][j].toFixed(0)}
                      </div>
                    )}
                  </td>
                ))}
                <td className="px-2 py-1 text-center font-mono text-gray-700">
                  {(weights[i] * 100).toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button size="sm" className="mt-3 text-xs h-7" onClick={apply}>
        Terapkan Bobot
      </Button>
    </div>
  );
}

function collectParentIds(
  nodes: Record<string, HierarchyNode>,
  nodeId: string,
): string[] {
  const node = nodes[nodeId];
  if (!node) return [];
  const ids: string[] = [];
  if (node.children.length > 0) {
    ids.push(nodeId);
    node.children.forEach((cId) => {
      ids.push(...collectParentIds(nodes, cId));
    });
  }
  return ids;
}

export default function WeightEditor({ projectId }: { projectId: string }) {
  const project = useProjectStore((s) => s.projects[projectId]);
  const { setWeightMode } = useProjectStore();
  if (!project) return null;

  const mode = project.weightMode;
  const parentIds = collectParentIds(project.nodes, project.goalId);
  const globalWeights = computeGlobalWeights(project.nodes, project.goalId);
  const rawTotal = getTotalGlobalWeight(project.nodes, project.goalId);
  const totalPct = rawTotal * 100;
  const totalValid = Math.abs(totalPct - 100) < 0.1;

  return (
    <div>
      {/* Mode selector */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-gray-600">Mode input:</span>
        <div className=" border border-gray-200 overflow-hidden">
          {(["direct", "ahp"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setWeightMode(projectId, m)}
              className={cn(
                "px-4 py-1.5 text-sm transition-colors",
                mode === m
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50",
              )}
            >
              {m === "direct" ? "Direct (%)" : "AHP Pairwise"}
            </button>
          ))}
        </div>
      </div>

      {/* Weight panels per parent */}
      {parentIds.map((pid) => {
        const parent = project.nodes[pid];
        if (!parent || parent.children.length === 0) return null;
        return mode === "direct" ? (
          <DirectWeightPanel key={pid} projectId={projectId} parentId={pid} />
        ) : (
          <AHPPanel key={pid} projectId={projectId} parentId={pid} />
        );
      })}

      {/* Global summary */}
      <div className="mt-6 border border-gray-200 overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm font-medium">
            Ringkasan Bobot Global (Leaf)
          </span>
          <span
            className={cn(
              "text-sm font-semibold",
              totalValid ? "text-green-600" : "text-red-500",
            )}
          >
            Total: {totalPct.toFixed(2)}% {totalValid ? "" : "✗ (harus 100%)"}
          </span>
        </div>
        <div>
          {globalWeights.map((gw, idx) => (
            <div
              key={gw.leafId}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm",
                idx !== 0 && "border-t border-gray-100",
              )}
            >
              <span className="flex-1 text-gray-600">
                {gw.path.slice(1).join(" → ")}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  gw.direction === "benefit"
                    ? "border-green-200 text-green-700 bg-green-50"
                    : "border-red-200 text-red-700 bg-red-50",
                )}
              >
                {gw.direction === "benefit" ? "Benefit" : "Cost"}
              </Badge>
              <span className="font-mono text-gray-700 w-16 text-right">
                {(gw.globalWeight * 100).toFixed(2)}%
              </span>
            </div>
          ))}
          {globalWeights.length === 0 && (
            <div className="px-4 py-6 text-center text-gray-400 text-sm">
              Belum ada kriteria daun. Bangun hirarki terlebih dahulu.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useProjectStore } from "@/store/projectStore";
import {
  computeTopsis,
  computeGlobalWeights,
  getLeafNodes,
  getTotalGlobalWeight,
} from "@/lib/topsis";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { exportAsExcel } from "@/lib/export";

function fmt(n: number, d = 4) {
  return n.toFixed(d);
}

function fmtRaw(n: number) {
  if (Number.isInteger(n)) return n.toLocaleString("id-ID");
  const s = parseFloat(n.toPrecision(8)).toString();
  return s;
}

export default function TopsisResultTable({
  projectId,
}: {
  projectId: string;
}) {
  const project = useProjectStore((s) => s.projects[projectId]);
  if (!project) return null;

  const leaves = getLeafNodes(project.nodes, project.goalId);
  const alts = project.alternatives;
  const totalCells = leaves.length * alts.length;
  const filledCells = project.scores.filter(
    (s) =>
      leaves.some((l) => l.id === s.leafCriterionId) &&
      alts.some((a) => a.id === s.alternativeId),
  ).length;

  if (leaves.length === 0 || alts.length < 2 || filledCells < totalCells) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Lengkapi kriteria, alternatif, dan semua penilaian untuk melihat hasil.
      </div>
    );
  }

  const rawTotal = getTotalGlobalWeight(project.nodes, project.goalId);
  if (Math.abs(rawTotal - 1) > 0.01) {
    return (
      <div className="text-center py-12 text-amber-600 text-sm">
        Total bobot global belum 100% ({(rawTotal * 100).toFixed(2)}%).
        Selesaikan pengisian bobot terlebih dahulu.
      </div>
    );
  }

  const globalWeights = computeGlobalWeights(project.nodes, project.goalId);
  const result = computeTopsis(
    project.nodes,
    alts,
    project.scores,
    project.goalId,
  );
  const {
    decisionMatrix: X,
    normalizedMatrix: R,
    weightedMatrix: V,
    idealBest,
    idealWorst,
    distanceBest,
    distanceWorst,
    scores,
    ranking,
  } = result;

  return (
    <div className="space-y-8">
      {/* Ranking summary */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Hasil Ranking</h3>
          <button
            onClick={() =>
              exportAsExcel(
                project.title,
                result,
                alts,
                globalWeights,
              )
            }
            className="h-8 px-3 text-sm border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium"
          >
            Export Excel
          </button>
        </div>
        <div className="border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-gray-700">
                  Alternatif
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">
                  D⁺
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">
                  D⁻
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">
                  Skor (Ci)
                </th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, idx) => (
                <tr
                  key={r.alternativeId}
                  className={cn(idx !== 0 && "border-t border-gray-100")}
                >
                  <td className="px-4 py-2.5 font-medium">
                    {r.alternativeName}
                    {r.rank === 1 && (
                      <Badge className="ml-2 bg-green-100 text-green-700 border-green-200 text-xs">
                        Terbaik
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-600">
                    {fmt(r.distanceBest)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-600">
                    {fmt(r.distanceWorst)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold">
                    {fmt(r.score)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step 1: Decision matrix — use decimals={-1} for raw/auto formatting */}
      <StepTable
        title="Step 1 Matriks Keputusan (X)"
        headers={globalWeights.map((w) => w.leafName)}
        rowHeaders={alts.map((a) => a.name)}
        data={X}
        decimals={-1}
      />

      {/* Step 2: Normalized */}
      <StepTable
        title="Step 2 Matriks Normalisasi (R)"
        headers={globalWeights.map((w) => w.leafName)}
        rowHeaders={alts.map((a) => a.name)}
        data={R}
      />

      {/* Step 3: Weighted */}
      <StepTable
        title="Step 3 Matriks Tertimbang (V)"
        subheaders={globalWeights.map(
          (w) => `w=${(w.globalWeight * 100).toFixed(1)}%`,
        )}
        headers={globalWeights.map((w) => w.leafName)}
        rowHeaders={alts.map((a) => a.name)}
        data={V}
      />

      {/* Step 4: Ideal solutions */}
      <div>
        <h3 className="text-base font-semibold mb-3">Step 4 Solusi Ideal</h3>
        <div className="border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Solusi
                  </th>
                  {globalWeights.map((w) => (
                    <th
                      key={w.leafId}
                      className="px-3 py-2 font-medium text-gray-700 text-center min-w-20"
                    >
                      {w.leafName}
                      <div
                        className={`font-normal text-xs ${w.direction === "benefit" ? "text-green-600" : "text-red-500"}`}
                      >
                        {w.direction === "benefit" ? "Benefit" : "Cost"}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100 bg-green-50">
                  <td className="px-3 py-2 font-medium text-green-700 border-l-4 border-l-green-400">
                    A⁺ (Ideal Terbaik)
                  </td>
                  {idealBest.map((v, j) => (
                    <td
                      key={j}
                      className="px-3 py-2 font-mono text-center text-green-700 font-semibold"
                    >
                      {fmt(v)}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-gray-100 bg-red-50">
                  <td className="px-3 py-2 font-medium text-red-600 border-l-4 border-l-red-400">
                    A⁻ (Ideal Terburuk)
                  </td>
                  {idealWorst.map((v, j) => (
                    <td
                      key={j}
                      className="px-3 py-2 font-mono text-center text-red-600 font-semibold"
                    >
                      {fmt(v)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Step 5: Distances */}
      <div>
        <h3 className="text-base font-semibold mb-3">
          Step 5 Jarak Euclidean & Skor Preferensi
        </h3>
        <div className="border border-gray-200 overflow-hidden">
          <table className="text-sm w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">
                  Alternatif
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">
                  D⁺ (ke A⁺)
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">
                  D⁻ (ke A⁻)
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">
                  Ci = D⁻/(D⁺+D⁻)
                </th>
              </tr>
            </thead>
            <tbody>
              {alts.map((alt, i) => (
                <tr
                  key={alt.id}
                  className={cn(i !== 0 && "border-t border-gray-100")}
                >
                  <td className="px-4 py-2 font-medium">{alt.name}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-600">
                    {fmt(distanceBest[i])}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-600">
                    {fmt(distanceWorst[i])}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-semibold">
                    {fmt(scores[i])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StepTable({
  title,
  headers,
  subheaders,
  rowHeaders,
  data,
  decimals = 4,
}: {
  title: string;
  headers: string[];
  subheaders?: string[];
  rowHeaders: string[];
  data: number[][];
  decimals?: number;
}) {
  return (
    <div>
      <h3 className="text-base font-semibold mb-3">{title}</h3>
      <div className="border border-gray-200 -lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead className="bg-gray-50">
              {subheaders && (
                <tr>
                  <th />
                  {subheaders.map((s, j) => (
                    <th
                      key={j}
                      className="px-3 py-1 text-center font-normal text-gray-500"
                    >
                      {s}
                    </th>
                  ))}
                </tr>
              )}
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Alternatif
                </th>
                {headers.map((h, j) => (
                  <th
                    key={j}
                    className="px-3 py-2 font-medium text-gray-700 text-center min-w-20"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowHeaders.map((rh, i) => (
                <tr
                  key={i}
                  className={cn(i !== 0 && "border-t border-gray-100")}
                >
                  <td className="px-3 py-2 font-medium text-gray-700">{rh}</td>
                  {data[i]?.map((val, j) => (
                    <td
                      key={j}
                      className="px-3 py-2 font-mono text-center text-gray-600"
                    >
                      {decimals === -1
                        ? fmtRaw(val)
                        : decimals === 0
                          ? val.toFixed(0)
                          : fmt(val, decimals)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

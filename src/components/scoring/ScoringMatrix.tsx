"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { getLeafNodes } from "@/lib/topsis";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ScoringMatrix({ projectId }: { projectId: string }) {
  const project = useProjectStore((s) => s.projects[projectId]);
  const { setScore, setScoreScale, setScaleLabel } = useProjectStore();
  const [showLabelEditor, setShowLabelEditor] = useState(false);

  if (!project) return null;

  const scaleMax = project.scoreScale ?? 5;
  const scaleLabels = project.scaleLabels ?? {};
  const leaves = getLeafNodes(project.nodes, project.goalId);
  const alts = project.alternatives;

  if (leaves.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Belum ada kriteria daun. Bangun hirarki terlebih dahulu.
      </div>
    );
  }
  if (alts.length < 2) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Tambahkan minimal 2 alternatif terlebih dahulu.
      </div>
    );
  }

  function getScore(altId: string, leafId: string) {
    return (
      project.scores.find(
        (s) => s.alternativeId === altId && s.leafCriterionId === leafId,
      )?.value ?? 0
    );
  }

  function optionLabel(v: number) {
    const custom = scaleLabels[v];
    return custom ? `${v} — ${custom}` : `${v}`;
  }

  const totalCells = leaves.length * alts.length;
  const filledCells = project.scores.filter(
    (s) =>
      leaves.some((l) => l.id === s.leafCriterionId) &&
      alts.some((a) => a.id === s.alternativeId) &&
      s.value > 0,
  ).length;

  const options = Array.from({ length: scaleMax }, (_, i) => i + 1);

  return (
    <div>
      {/* Scale configurator */}
      <div className="mb-4 p-3 bg-gray-50 border border-gray-100 space-y-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              Batas skala penilaian:
            </span>
            <span className="text-sm text-gray-500">1 —</span>
            <input
              type="number"
              min={2}
              max={100}
              value={scaleMax}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (!isNaN(v) && v >= 2 && v <= 100)
                  setScoreScale(projectId, v);
              }}
              className="w-20 h-8 text-sm border border-gray-300 px-2 text-center focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-fill text-xs"
            onClick={() => setShowLabelEditor((v) => !v)}
          >
            {showLabelEditor ? "Sembunyikan Label" : "Kustomisasi Label Skala"}
          </Button>
        </div>

        {/* Per-value label editor */}
        {showLabelEditor && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pt-1">
            {options.map((v) => (
              <div key={v} className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-500 w-4 shrink-0">
                  {v}
                </span>
                <Input
                  className="h-7 text-xs"
                  placeholder={`Label ${v}`}
                  value={scaleLabels[v] ?? ""}
                  onChange={(e) => setScaleLabel(projectId, v, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">
          {filledCells}/{totalCells} sel terisi
        </span>
        {filledCells < totalCells && (
          <span className="text-xs text-amber-600">
            Isi semua sel untuk mengaktifkan tab Hasil
          </span>
        )}
      </div>

      {/* Matrix table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700 min-w-48 sticky left-0 bg-gray-50">
                Alternatif
              </th>
              {leaves.map((leaf) => (
                <th
                  key={leaf.id}
                  className="border border-gray-200 px-3 py-2 font-medium text-gray-700 min-w-36 text-center"
                >
                  <div>{leaf.name}</div>
                  <div
                    className={cn(
                      "text-xs font-normal mt-0.5",
                      leaf.direction === "benefit"
                        ? "text-green-600"
                        : "text-red-500",
                    )}
                  >
                    {leaf.direction === "benefit" ? "Benefit" : "Cost"}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alts.map((alt, aIdx) => (
              <tr
                key={alt.id}
                className={aIdx !== 0 ? "border-t border-gray-100" : ""}
              >
                <td className="border border-gray-200 px-3 py-2 font-medium sticky left-0 bg-white">
                  {alt.name}
                </td>
                {leaves.map((leaf) => {
                  const val = getScore(alt.id, leaf.id);
                  return (
                    <td
                      key={leaf.id}
                      className="border border-gray-200 px-2 py-1 text-center"
                    >
                      <select
                        className={cn(
                          "w-full h-8 text-sm border px-1 bg-white text-center appearance-none",
                          val === 0
                            ? "border-amber-300 text-gray-400"
                            : "border-gray-200 text-gray-800",
                        )}
                        value={val}
                        onChange={(e) =>
                          setScore(
                            projectId,
                            alt.id,
                            leaf.id,
                            parseInt(e.target.value),
                          )
                        }
                      >
                        <option value={0}>— pilih —</option>
                        {options.map((v) => (
                          <option key={v} value={v}>
                            {optionLabel(v)}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

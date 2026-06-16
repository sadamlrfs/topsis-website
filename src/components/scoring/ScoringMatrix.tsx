"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { getLeafNodes } from "@/lib/topsis";
import { cn } from "@/lib/utils";
import type { HierarchyNode, ScoreInputType, ScoreLabel } from "@/types";

// ─── helpers ────────────────────────────────────────────────────────────────

function getType(n: HierarchyNode): ScoreInputType {
  return n.scoreType ?? "number";
}
function getLabels(n: HierarchyNode): ScoreLabel[] {
  return n.scoreLabels ?? [];
}
function getStep(n: HierarchyNode): number {
  return n.scoreStep && n.scoreStep > 0 ? n.scoreStep : 1;
}

/** A criterion is "ready" when the user has set the minimum required bounds. */
function isReady(n: HierarchyNode): boolean {
  if (getType(n) === "number") {
    return n.scoreMin !== undefined && n.scoreMax !== undefined;
  }
  return true; // variabel: free-form, always ready
}

const MAX_OPTS = 200;

function buildOptions(
  min: number,
  max: number,
  step: number,
  labels: ScoreLabel[],
): { value: number; display: string }[] | null {
  if (step <= 0) return null;
  const count = Math.round((max - min) / step) + 1;
  if (count > MAX_OPTS) return null; // too many — caller falls back to text input
  const opts: { value: number; display: string }[] = [];
  for (let i = 0; i < count && opts.length < MAX_OPTS; i++) {
    const v = parseFloat((min + i * step).toFixed(10));
    const lbl = labels.find((l) => l.value === v)?.label;
    opts.push({ value: v, display: lbl ? `${v}  ${lbl}` : String(v) });
  }
  return opts;
}

// settings blob that can be clipboard-copied between criteria
interface ClipSettings {
  scoreType?: ScoreInputType;
  scoreMin?: number;
  scoreMax?: number;
  scoreStep?: number;
  scoreLabels?: ScoreLabel[];
}

// ─── component ───────────────────────────────────────────────────────────────

export default function ScoringMatrix({ projectId }: { projectId: string }) {
  const project = useProjectStore((s) => s.projects[projectId]);
  const { setScore, updateNode } = useProjectStore();

  const [expandedLeaf, setExpandedLeaf] = useState<string | null>(null);
  const [newVal, setNewVal] = useState("");
  const [newLbl, setNewLbl] = useState("");

  // copy-paste state
  const [clip, setClip] = useState<ClipSettings | null>(null);
  const [clipSrc, setClipSrc] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  // local draft: lets number inputs be freely edited (Backspace/clear) without
  // snapping back to the stored value before a valid number is re-entered.
  const [inputDrafts, setInputDrafts] = useState<Record<string, string>>({});
  function draftKey(altId: string, leafId: string) {
    return `${altId}|${leafId}`;
  }
  function draftVal(
    altId: string,
    leafId: string,
    stored: number | "",
  ): string {
    const k = draftKey(altId, leafId);
    return k in inputDrafts
      ? inputDrafts[k]
      : stored === ""
        ? ""
        : String(stored);
  }
  function setDraft(altId: string, leafId: string, raw: string) {
    setInputDrafts((p) => ({ ...p, [draftKey(altId, leafId)]: raw }));
  }
  function clearDraft(altId: string, leafId: string) {
    setInputDrafts((p) => {
      const n = { ...p };
      delete n[draftKey(altId, leafId)];
      return n;
    });
  }

  if (!project) return null;

  const leaves = getLeafNodes(project.nodes, project.goalId);
  const alts = project.alternatives;

  if (leaves.length === 0)
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Belum ada kriteria daun. Bangun kriteria terlebih dahulu.
      </div>
    );
  if (alts.length < 2)
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Tambahkan minimal 2 alternatif terlebih dahulu.
      </div>
    );

  // ── score helpers ──
  function getScore(altId: string, leafId: string): number | "" {
    return (
      project.scores.find(
        (s) => s.alternativeId === altId && s.leafCriterionId === leafId,
      )?.value ?? ""
    );
  }
  function isSet(altId: string, leafId: string) {
    return project.scores.some(
      (s) => s.alternativeId === altId && s.leafCriterionId === leafId,
    );
  }

  const totalCells = leaves.length * alts.length;
  const filledCells = project.scores.filter(
    (s) =>
      leaves.some((l) => l.id === s.leafCriterionId) &&
      alts.some((a) => a.id === s.alternativeId),
  ).length;

  // ── label editor helpers ──
  function openLabel(leafId: string) {
    setExpandedLeaf((prev) => (prev === leafId ? null : leafId));
    setNewVal("");
    setNewLbl("");
  }
  function addLabel(leafId: string) {
    const v = parseFloat(newVal);
    if (isNaN(v) || !newLbl.trim()) return;
    const leaf = project.nodes[leafId];
    const next = [
      ...getLabels(leaf).filter((l) => l.value !== v),
      { value: v, label: newLbl.trim() },
    ].sort((a, b) => a.value - b.value);
    updateNode(projectId, leafId, { scoreLabels: next });
    setNewVal("");
    setNewLbl("");
  }
  function removeLabel(leafId: string, value: number) {
    updateNode(projectId, leafId, {
      scoreLabels: getLabels(project.nodes[leafId]).filter(
        (l) => l.value !== value,
      ),
    });
  }

  // ── copy / paste ──
  function copySettings(leaf: HierarchyNode) {
    setClip({
      scoreType: leaf.scoreType,
      scoreMin: leaf.scoreMin,
      scoreMax: leaf.scoreMax,
      scoreStep: leaf.scoreStep,
      scoreLabels: leaf.scoreLabels,
    });
    setClipSrc(leaf.id);
    setFlashId(leaf.id);
    setTimeout(() => setFlashId(null), 1400);
  }
  function pasteSettings(leafId: string) {
    if (!clip) return;
    updateNode(projectId, leafId, clip);
  }

  // ─── render ──────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Settings panel ── */}
      <div className="mb-4 p-3 bg-gray-50 border border-gray-100">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700">
            Pengaturan Skala per Kriteria
          </span>
          {clip && (
            <span className="text-xs text-blue-500 italic">
              Pengaturan tersalin — klik <strong>Tempel</strong> pada kriteria
              lain
            </span>
          )}
        </div>

        <div className="space-y-2">
          {leaves.map((leaf) => {
            const type = getType(leaf);
            const labels = getLabels(leaf);
            const step = getStep(leaf);
            const isOpen = expandedLeaf === leaf.id;
            const isCopied = clipSrc === leaf.id && !!clip;
            const isFlash = flashId === leaf.id;

            // warn if number range would exceed MAX_OPTS
            const tooMany =
              type === "number" &&
              leaf.scoreMin !== undefined &&
              leaf.scoreMax !== undefined &&
              leaf.scoreMax > leaf.scoreMin &&
              Math.round((leaf.scoreMax - leaf.scoreMin) / step) + 1 > MAX_OPTS;

            return (
              <div
                key={leaf.id}
                className="border border-gray-200 bg-white p-2"
              >
                {/* main row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-sm font-medium text-gray-700 w-32 truncate shrink-0"
                    title={leaf.name}
                  >
                    {leaf.name}
                  </span>

                  {/* type */}
                  <select
                    className="h-7 text-xs border border-gray-300 px-1 bg-white focus:outline-none"
                    value={type}
                    onChange={(e) =>
                      updateNode(projectId, leaf.id, {
                        scoreType: e.target.value as ScoreInputType,
                      })
                    }
                  >
                    <option value="number">Skala</option>
                    <option value="currency">Variabel</option>
                  </select>

                  {/* variabel hint */}
                  {type === "currency" && (
                    <span className="text-xs text-blue-500 italic">
                      Nilai bebas, isi langsung di tabel bawah
                    </span>
                  )}

                  {/* min — skala type only */}
                  {type === "number" && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">Min:</span>
                      <input
                        type="number"
                        step="any"
                        placeholder="—"
                        value={leaf.scoreMin !== undefined ? leaf.scoreMin : ""}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          updateNode(projectId, leaf.id, {
                            scoreMin: isNaN(v) ? undefined : v,
                          });
                        }}
                        className="w-24 h-7 text-xs border border-gray-300 px-2 focus:outline-none focus:ring-1 focus:ring-gray-400"
                      />
                    </div>
                  )}

                  {/* max — number type only */}
                  {type === "number" && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">Max:</span>
                      <input
                        type="number"
                        step="any"
                        placeholder="—"
                        value={leaf.scoreMax !== undefined ? leaf.scoreMax : ""}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          updateNode(projectId, leaf.id, {
                            scoreMax: isNaN(v) ? undefined : v,
                          });
                        }}
                        className="w-24 h-7 text-xs border border-gray-300 px-2 focus:outline-none focus:ring-1 focus:ring-gray-400"
                      />
                    </div>
                  )}

                  {/* step — number type only */}
                  {type === "number" && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">Step:</span>
                      <input
                        type="number"
                        step="any"
                        min="0.000001"
                        placeholder="1"
                        value={
                          leaf.scoreStep !== undefined ? leaf.scoreStep : ""
                        }
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          updateNode(projectId, leaf.id, {
                            scoreStep: isNaN(v) || v <= 0 ? undefined : v,
                          });
                        }}
                        className="w-16 h-7 text-xs border border-gray-300 px-2 focus:outline-none focus:ring-1 focus:ring-gray-400"
                      />
                    </div>
                  )}

                  {/* label toggle — number type only */}
                  {type === "number" && (
                    <button
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => openLabel(leaf.id)}
                    >
                      {isOpen
                        ? "Tutup"
                        : `Label${labels.length > 0 ? ` (${labels.length})` : ""}`}
                    </button>
                  )}

                  {/* too-many warning */}
                  {tooMany && (
                    <span className="text-xs text-amber-500">
                      ⚠ &gt;{MAX_OPTS} opsi — perbesar step
                    </span>
                  )}

                  <div className="flex-1" />

                  {/* copy */}
                  <button
                    onClick={() => copySettings(leaf)}
                    className={cn(
                      "h-6 px-2 text-xs border",
                      isFlash
                        ? "bg-green-100 border-green-300 text-green-700"
                        : isCopied
                          ? "bg-gray-200 border-gray-400 text-gray-700"
                          : "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-600",
                    )}
                  >
                    {isFlash ? "Tersalin ✓" : isCopied ? "Salin ✓" : "Salin"}
                  </button>

                  {/* paste — visible when clipboard has data and this isn't the source */}
                  {clip && clipSrc !== leaf.id && (
                    <button
                      onClick={() => pasteSettings(leaf.id)}
                      className="h-6 px-2 text-xs border bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-600"
                    >
                      Tempel
                    </button>
                  )}
                </div>

                {/* label editor */}
                {type === "number" && isOpen && (
                  <div className="mt-2 pl-2 border-l-2 border-blue-100 space-y-2">
                    {labels.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {labels.map((l) => (
                          <span
                            key={l.value}
                            className="inline-flex items-center gap-1 text-xs bg-gray-100 px-2 py-0.5"
                          >
                            <span className="font-medium">{l.value}</span>
                            <span className="text-gray-500"> {l.label}</span>
                            <button
                              className="text-gray-400 hover:text-red-500 ml-0.5"
                              onClick={() => removeLabel(leaf.id, l.value)}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="number"
                        step="any"
                        placeholder="Nilai"
                        value={newVal}
                        onChange={(e) => setNewVal(e.target.value)}
                        className="w-20 h-7 text-xs border border-gray-300 px-2 focus:outline-none"
                      />
                      <span className="text-xs text-gray-400">=</span>
                      <input
                        type="text"
                        placeholder="Label (cth: Buruk)"
                        value={newLbl}
                        onChange={(e) => setNewLbl(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && addLabel(leaf.id)
                        }
                        className="w-36 h-7 text-xs border border-gray-300 px-2 focus:outline-none"
                      />
                      <button
                        className="h-7 px-2 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300"
                        onClick={() => addLabel(leaf.id)}
                      >
                        + Tambah
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Progress ── */}
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

      {/* ── Matrix table ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700 min-w-48 sticky left-0 bg-gray-50">
                Alternatif
              </th>
              {leaves.map((leaf) => {
                const type = getType(leaf);
                const labels = getLabels(leaf);
                const ready = isReady(leaf);
                return (
                  <th
                    key={leaf.id}
                    className="border border-gray-200 px-3 py-2 font-medium text-gray-700 min-w-44 text-center align-top"
                  >
                    <div>{leaf.name}</div>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span
                        className={cn(
                          "text-xs font-normal",
                          leaf.direction === "benefit"
                            ? "text-green-600"
                            : "text-red-500",
                        )}
                      >
                        {leaf.direction === "benefit" ? "Benefit" : "Cost"}
                      </span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400 font-normal">
                        {type === "currency" ? "Variabel" : "Skala"}
                      </span>
                    </div>
                    {!ready && (
                      <div className="text-xs text-amber-400 font-normal mt-0.5">
                        Atur skala dulu
                      </div>
                    )}
                    {/* label legend */}
                    {type === "number" && ready && labels.length > 0 && (
                      <div className="mt-1 text-left space-y-0.5">
                        {labels.map((l) => (
                          <div
                            key={l.value}
                            className="text-xs text-gray-400 font-normal"
                          >
                            <span className="font-medium text-gray-500">
                              {l.value}
                            </span>{" "}
                            {l.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </th>
                );
              })}
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
                  const ready = isReady(leaf);

                  /* ── not configured → disabled placeholder ── */
                  if (!ready) {
                    return (
                      <td
                        key={leaf.id}
                        className="border border-gray-200 px-2 py-1"
                      >
                        <input
                          disabled
                          readOnly
                          value=""
                          placeholder="—"
                          className="w-full h-8 text-sm border border-gray-200 px-2 bg-gray-50 text-gray-300 cursor-not-allowed text-center"
                        />
                      </td>
                    );
                  }

                  const type = getType(leaf);
                  const val = getScore(alt.id, leaf.id);
                  const filled = isSet(alt.id, leaf.id);

                  /* ── number type → dropdown ── */
                  if (type === "number") {
                    const opts = buildOptions(
                      leaf.scoreMin!,
                      leaf.scoreMax!,
                      getStep(leaf),
                      getLabels(leaf),
                    );
                    // fallback: too many options → plain number input
                    if (!opts) {
                      return (
                        <td
                          key={leaf.id}
                          className="border border-gray-200 px-2 py-1"
                        >
                          <input
                            type="number"
                            step="any"
                            placeholder="—"
                            value={draftVal(alt.id, leaf.id, val)}
                            min={leaf.scoreMin}
                            max={leaf.scoreMax}
                            className={cn(
                              "w-full h-8 text-sm border px-2 bg-white text-right focus:outline-none focus:ring-1 focus:ring-gray-400",
                              !filled
                                ? "border-amber-300 text-gray-400"
                                : "border-gray-200 text-gray-800",
                            )}
                            onChange={(e) => {
                              setDraft(alt.id, leaf.id, e.target.value);
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v))
                                setScore(projectId, alt.id, leaf.id, v);
                            }}
                            onBlur={() => clearDraft(alt.id, leaf.id)}
                          />
                        </td>
                      );
                    }

                    return (
                      <td
                        key={leaf.id}
                        className="border border-gray-200 px-2 py-1 text-center"
                      >
                        <select
                          className={cn(
                            "w-full h-8 text-sm border px-1 bg-white focus:outline-none",
                            !filled
                              ? "border-amber-300 text-gray-400"
                              : "border-gray-200 text-gray-800",
                          )}
                          value={val === "" ? "" : String(val)}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v))
                              setScore(projectId, alt.id, leaf.id, v);
                          }}
                        >
                          <option value="">  pilih  </option>
                          {opts.map((o) => (
                            <option key={o.value} value={String(o.value)}>
                              {o.display}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  }

                  /* ── variabel type → free-form number, no constraints ── */
                  return (
                    <td
                      key={leaf.id}
                      className="border border-gray-200 px-2 py-1"
                    >
                      <input
                        type="number"
                        step="any"
                        placeholder="—"
                        value={draftVal(alt.id, leaf.id, val)}
                        className={cn(
                          "w-full h-8 text-sm border px-2 bg-white text-right focus:outline-none focus:ring-1 focus:ring-gray-400",
                          !filled
                            ? "border-amber-300 text-gray-400"
                            : "border-gray-200 text-gray-800",
                        )}
                        onChange={(e) => {
                          setDraft(alt.id, leaf.id, e.target.value);
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v))
                            setScore(projectId, alt.id, leaf.id, v);
                        }}
                        onBlur={() => clearDraft(alt.id, leaf.id)}
                      />
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

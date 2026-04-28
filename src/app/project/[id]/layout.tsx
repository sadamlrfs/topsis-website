"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getLeafNodes, getTotalGlobalWeight } from "@/lib/topsis";

const TABS = [
  { key: "hierarchy", label: "Hirarki" },
  { key: "weights", label: "Bobot" },
  { key: "alternatives", label: "Alternatif" },
  { key: "scoring", label: "Penilaian" },
  { key: "visualization", label: "Visualisasi" },
  { key: "result", label: "Hasil" },
];

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const project = useProjectStore((s) => s.projects[id]);

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Project tidak ditemukan.{" "}
        <button className="ml-1 underline" onClick={() => router.push("/")}>
          Beranda
        </button>
      </div>
    );
  }

  const leaves = getLeafNodes(project.nodes, project.goalId);
  const leafCount = leaves.length;
  const altCount = project.alternatives.length;
  const scoreCount = project.scores.length;
  const totalRequired = leafCount * altCount;
  const rawWeightTotal = getTotalGlobalWeight(project.nodes, project.goalId);
  const weightsValid = Math.abs(rawWeightTotal - 1) < 0.01;
  const resultReady =
    leafCount > 0 &&
    altCount >= 2 &&
    scoreCount === totalRequired &&
    totalRequired > 0 &&
    weightsValid;

  const activeTab =
    TABS.find((t) => pathname.endsWith(`/${t.key}`))?.key ?? "hierarchy";

  return (
    <div className="flex flex-col h-full">
      {/* Project title bar */}
      <div className="border-b border-gray-100 px-6 py-6 flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">
            {project.title}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {leafCount} Kriteria · {altCount} Alternatif
            {totalRequired > 0 && ` · ${scoreCount}/${totalRequired} Nilai`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <nav className="border-b border-gray-100 px-6 shrink-0">
        <div className="flex gap-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const isLocked = tab.key === "result" && !resultReady;
            return (
              <Link
                key={tab.key}
                href={`/project/${id}/${tab.key}`}
                className={cn(
                  "px-4 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-gray-900 text-gray-900 font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-700",
                  isLocked && "opacity-40 pointer-events-none",
                )}
              >
                {tab.label}
                {tab.key === "result" && !resultReady && (
                  <span className="ml-1 text-gray-300" title={
                    !weightsValid
                      ? "Direct % bobot belum 100%"
                      : "Lengkapi penilaian terlebih dahulu"
                  }>🔒</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Content — scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
    </div>
  );
}

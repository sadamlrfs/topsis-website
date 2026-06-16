"use client";

import { useParams } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { exportAsImage, exportAsPDF } from "@/lib/export";

const HierarchyTreeView = dynamic(
  () => import("@/components/tree/HierarchyTreeView"),
  { ssr: false },
);

export default function VisualizationPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProjectStore((s) => s.projects[id]);
  const treeRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  if (!project) return null;

  async function handleExport(format: "pdf" | "png" | "jpg") {
    if (!treeRef.current) return;
    setExporting(true);
    try {
      const filename = project!.title || "kriteria";
      if (format === "pdf") await exportAsPDF(treeRef.current, filename);
      else await exportAsImage(treeRef.current, format, filename);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Visualisasi Kriteria</h2>
        </div>
        <div className="flex gap-2">
          {(["png", "jpg", "pdf"] as const).map((fmt) => (
            <Button
              key={fmt}
              variant="outline"
              size="sm"
              disabled={exporting}
              onClick={() => handleExport(fmt)}
            >
              {exporting ? "..." : `Download ${fmt.toUpperCase()}`}
            </Button>
          ))}
        </div>
      </div>

      <div className="border border-gray-200 overflow-hidden">
        <HierarchyTreeView
          nodes={project.nodes}
          goalId={project.goalId}
          alternatives={project.alternatives}
          innerRef={treeRef}
        />
      </div>
    </div>
  );
}

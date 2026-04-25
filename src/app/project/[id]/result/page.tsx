"use client";

import { useParams } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import TopsisResultTable from "@/components/result/TopsisResultTable";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProjectStore((s) => s.projects[id]);

  if (!project) return null;

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Hasil TOPSIS</h2>
        </div>
      </div>

      <div className="bg-white">
        <TopsisResultTable projectId={id} />
      </div>
    </div>
  );
}

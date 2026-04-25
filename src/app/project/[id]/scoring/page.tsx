"use client";

import { useParams } from "next/navigation";
import ScoringMatrix from "@/components/scoring/ScoringMatrix";

export default function ScoringPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Penilaian Alternatif</h2>
      </div>
      <ScoringMatrix projectId={id} />
    </div>
  );
}

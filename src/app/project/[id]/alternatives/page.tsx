"use client";

import { useParams } from "next/navigation";
import AlternativeList from "@/components/scoring/AlternativeList";

export default function AlternativesPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="max-w-xl">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Daftar Alternatif</h2>
      </div>
      <AlternativeList projectId={id} />
    </div>
  );
}

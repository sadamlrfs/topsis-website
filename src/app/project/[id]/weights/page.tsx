"use client";

import { useParams } from "next/navigation";
import WeightEditor from "@/components/weights/WeightEditor";

export default function WeightsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Bobot Kriteria</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Isi Direct % secara manual atau gunakan bantuan AHP Pairwise untuk setiap level kriteria.
        </p>
      </div>
      <WeightEditor projectId={id} />
    </div>
  );
}

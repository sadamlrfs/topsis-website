"use client";

import { useParams } from "next/navigation";
import HierarchyBuilder from "@/components/hierarchy/HierarchyBuilder";

export default function HierarchyPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Struktur Hirarki</h2>
      </div>
      <HierarchyBuilder projectId={id} />
    </div>
  );
}

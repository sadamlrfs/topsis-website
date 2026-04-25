"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import { getLeafNodes } from "@/lib/topsis";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { projects, createProject, deleteProject, importProject } =
    useProjectStore();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const projectList = Object.values(projects).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  // Extract active project id from pathname
  const activeId = pathname.match(/\/project\/([^/]+)/)?.[1] ?? null;

  function handleCreate() {
    if (!title.trim()) return;
    const id = createProject(title.trim());
    setCreating(false);
    setTitle("");
    router.push(`/project/${id}/hierarchy`);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        importProject(data);
        router.push(`/project/${data.id}/hierarchy`);
      } catch {
        alert("File tidak valid.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleExport(p: (typeof projectList)[number]) {
    const blob = new Blob([JSON.stringify(p, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${p.title}.json`;
    a.click();
  }

  return (
    <aside className="w-1/3 px-8 py-8 min-w-56 max-w-xs h-screen border-r border-gray-100 flex flex-col bg-gray-50 shrink-0">
      {/* Header */}
      <div className=" border-b border-gray-100 bg-white">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          TOPSIS WEBSITE
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Pengambilan Keputusan Hirarki
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-3 h-fit">
          <label className="flex-1 cursor-pointer">
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
            <span className="flex items-center py-2 justify-center h-7 px-2 text-xs border border-gray-200 bg-white hover:bg-gray-50 transition-colors w-full">
              Import Goals
            </span>
          </label>
          <button
            onClick={() => setCreating(true)}
            className="flex-1 w-full px-2 h-7 py-2 text-xs bg-gray-900 text-white hover:bg-gray-700 transition-colors"
          >
            + Buat Goals
          </button>
        </div>

        {/* Inline create form */}
        {creating && (
          <div className="mt-2 space-y-1.5">
            <input
              autoFocus
              type="text"
              placeholder="Judul / Goal..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setCreating(false);
                  setTitle("");
                }
              }}
              className="w-full h-7 px-2 text-xs border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <div className="flex gap-1">
              <button
                onClick={handleCreate}
                disabled={!title.trim()}
                className="flex-1 h-6 text-xs bg-gray-900 text-white disabled:opacity-40"
              >
                Buat
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setTitle("");
                }}
                className="flex-1 h-6 text-xs border border-gray-200 hover:bg-gray-100"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto py-2">
        {projectList.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400">
            Belum ada project.
            <br />
            Buat baru atau import JSON.
          </div>
        ) : (
          projectList.map((p) => {
            const leaves = getLeafNodes(p.nodes, p.goalId);
            const leafCount = leaves.length;
            const altCount = p.alternatives.length;
            const scoreCount = p.scores.length;
            const ready =
              leafCount > 0 &&
              altCount >= 2 &&
              scoreCount === leafCount * altCount;
            const isActive = p.id === activeId;

            return (
              <div
                key={p.id}
                className={cn(
                  "group  mb-1 border transition-colors cursor-pointer",
                  isActive
                    ? "border-gray-900 bg-white shadow-sm"
                    : "border-transparent hover:border-gray-200 hover:bg-white",
                )}
              >
                <div
                  className="px-3 py-2.5"
                  onClick={() => router.push(`/project/${p.id}/hierarchy`)}
                >
                  <div className="flex items-start gap-1.5">
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-xs font-medium truncate",
                          isActive ? "text-gray-900" : "text-gray-700",
                        )}
                      >
                        {p.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {leafCount} kriteria · {altCount} alternatif
                        {ready && <span className="ml-1 text-green-600"></span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Hover actions */}
                <div className="hidden group-hover:flex items-center gap-1 px-3 pb-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport(p);
                    }}
                    className="text-xs text-gray-400 hover:text-gray-700 px-1.5 py-0.5 hover:bg-gray-100"
                  >
                    Export
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(p.id);
                    }}
                    className="text-xs text-red-400 hover:text-red-600 px-1.5 py-0.5 hover:bg-red-50"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white shadow-xl p-5 w-72 mx-4">
            <p className="text-sm font-medium text-gray-900">Hapus project?</p>
            <p className="text-xs text-gray-500 mt-1">
              Aksi ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 h-8 text-sm border border-gray-200 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  deleteProject(deleteId);
                  if (activeId === deleteId) router.push("/");
                  setDeleteId(null);
                }}
                className="flex-1 h-8 text-sm bg-red-600 text-white hover:bg-red-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

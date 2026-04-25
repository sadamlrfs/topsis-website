'use client';

import { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AlternativeList({ projectId }: { projectId: string }) {
  const project = useProjectStore((s) => s.projects[projectId]);
  const { addAlternative, updateAlternative, deleteAlternative } =
    useProjectStore();
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (!project) return null;
  const alts = project.alternatives;

  function handleAdd() {
    if (!newName.trim()) return;
    addAlternative(projectId, newName.trim());
    setNewName('');
  }

  function saveEdit() {
    if (editId && editName.trim()) {
      updateAlternative(projectId, editId, { name: editName.trim() });
    }
    setEditId(null);
  }

  return (
    <div>
      <div className="border border-gray-200 overflow-hidden mb-3">
        {alts.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">
            Belum ada alternatif. Minimal 2 alternatif diperlukan.
          </div>
        ) : (
          alts.map((alt, idx) => (
            <div
              key={alt.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                idx !== 0 ? 'border-t border-gray-100' : ''
              } group`}
            >
              <span className="text-sm text-gray-400 w-5">{idx + 1}.</span>
              {editId === alt.id ? (
                <Input
                  className="h-7 text-sm flex-1"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') setEditId(null);
                  }}
                  onBlur={saveEdit}
                  autoFocus
                />
              ) : (
                <span
                  className="flex-1 text-sm cursor-pointer"
                  onDoubleClick={() => {
                    setEditId(alt.id);
                    setEditName(alt.name);
                  }}
                >
                  {alt.name}
                </span>
              )}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => {
                    setEditId(alt.id);
                    setEditName(alt.name);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-red-500"
                  onClick={() => setDeleteId(alt.id)}
                >
                  Hapus
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add row */}
      <div className="flex gap-2">
        <Input
          className="h-8 text-sm"
          placeholder="Nama alternatif baru..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button size="sm" className="h-8 text-sm" onClick={handleAdd} disabled={!newName.trim()}>
          + Tambah
        </Button>
      </div>

      {alts.length < 2 && (
        <p className="text-xs text-amber-600 mt-2">
          Minimal 2 alternatif diperlukan untuk menghitung TOPSIS.
        </p>
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus alternatif?</AlertDialogTitle>
            <AlertDialogDescription>
              Nilai penilaian alternatif ini juga akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteId) {
                  deleteAlternative(projectId, deleteId);
                  setDeleteId(null);
                }
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

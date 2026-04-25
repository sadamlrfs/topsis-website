'use client';

import { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import type { HierarchyNode } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

interface NodeRowProps {
  projectId: string;
  nodeId: string;
  nodes: Record<string, HierarchyNode>;
  depth: number;
  isGoal?: boolean;
}

function NodeRow({ projectId, nodeId, nodes, depth, isGoal }: NodeRowProps) {
  const { addNode, updateNode, deleteNode } = useProjectStore();
  const node = nodes[nodeId];
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [addingChild, setAddingChild] = useState(false);
  const [childName, setChildName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (!node) return null;
  const isLeaf = node.children.length === 0 && !isGoal;

  function saveEdit() {
    if (editName.trim()) updateNode(projectId, nodeId, { name: editName.trim() });
    setEditing(false);
  }

  function addChild() {
    if (!childName.trim()) return;
    addNode(projectId, nodeId, childName.trim());
    setChildName('');
    setAddingChild(false);
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 group px-2 py-1.5 hover:bg-gray-50"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {/* Collapse toggle */}
        {node.children.length > 0 ? (
          <button
            className="w-4 h-4 text-gray-400 hover:text-gray-600 flex-shrink-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? '▶' : '▼'}
          </button>
        ) : (
          <span className="w-4 h-4 flex-shrink-0" />
        )}

        {/* Node name */}
        {editing ? (
          <Input
            className="h-7 text-sm flex-1 max-w-xs"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') setEditing(false);
            }}
            onBlur={saveEdit}
            autoFocus
          />
        ) : (
          <span
            className="text-sm flex-1 cursor-pointer"
            onDoubleClick={() => {
              setEditName(node.name);
              setEditing(true);
            }}
          >
            {node.name}
            {isGoal && (
              <span className="ml-2 text-xs text-gray-400">(Goal)</span>
            )}
          </span>
        )}

        {/* Leaf badge + direction */}
        {isLeaf && (
          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                updateNode(projectId, nodeId, {
                  direction:
                    node.direction === 'benefit' ? 'cost' : 'benefit',
                })
              }
              className={`text-xs px-2 py-0.5 border font-medium transition-colors ${
                node.direction === 'benefit'
                  ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                  : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              {node.direction === 'benefit' ? 'Benefit' : 'Cost'}
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => {
              setEditName(node.name);
              setEditing(true);
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => setAddingChild(true)}
          >
            + Sub
          </Button>
          {!isGoal && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2 text-red-500 hover:text-red-600"
              onClick={() => setDeleteTarget(true)}
            >
              Hapus
            </Button>
          )}
        </div>
      </div>

      {/* Add child input */}
      {addingChild && (
        <div
          className="flex items-center gap-2 py-1"
          style={{ paddingLeft: `${(depth + 1) * 20 + 8}px` }}
        >
          <span className="w-4 h-4 flex-shrink-0" />
          <Input
            className="h-7 text-sm max-w-xs"
            placeholder="Nama kriteria..."
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addChild();
              if (e.key === 'Escape') setAddingChild(false);
            }}
            autoFocus
          />
          <Button size="sm" className="h-7 text-xs" onClick={addChild}>
            Tambah
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setAddingChild(false)}
          >
            Batal
          </Button>
        </div>
      )}

      {/* Children */}
      {!collapsed &&
        node.children.map((childId) => (
          <NodeRow
            key={childId}
            projectId={projectId}
            nodeId={childId}
            nodes={nodes}
            depth={depth + 1}
          />
        ))}

      {/* Delete confirm */}
      <AlertDialog open={deleteTarget} onOpenChange={setDeleteTarget}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus &ldquo;{node.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua sub-kriteria di dalamnya juga akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteNode(projectId, nodeId)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function HierarchyBuilder({
  projectId,
}: {
  projectId: string;
}) {
  const project = useProjectStore((s) => s.projects[projectId]);
  const { addNode } = useProjectStore();
  const [rootChildName, setRootChildName] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  if (!project) return null;

  function addTopLevel() {
    if (!rootChildName.trim()) return;
    addNode(projectId, project.goalId, rootChildName.trim());
    setRootChildName('');
    setShowAdd(false);
  }

  const leafCount = Object.values(project.nodes).filter(
    (n) => n.children.length === 0 && n.parentId !== null
  ).length;

  return (
    <div>
      <div className="border border-gray-200 overflow-hidden">
        {/* Goal root */}
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            {project.title}
          </span>
          <Badge variant="outline" className="text-xs">
            Goal
          </Badge>
        </div>

        <div className="py-1">
          {project.nodes[project.goalId]?.children.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-400 text-sm">
              Belum ada kriteria. Tambahkan kriteria pertama.
            </div>
          ) : (
            project.nodes[project.goalId]?.children.map((childId) => (
              <NodeRow
                key={childId}
                projectId={projectId}
                nodeId={childId}
                nodes={project.nodes}
                depth={1}
              />
            ))
          )}
        </div>

        {/* Add top-level criterion */}
        <div className="border-t border-gray-100 px-3 py-2">
          {showAdd ? (
            <div className="flex items-center gap-2">
              <Input
                className="h-7 text-sm"
                placeholder="Nama kriteria..."
                value={rootChildName}
                onChange={(e) => setRootChildName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addTopLevel();
                  if (e.key === 'Escape') setShowAdd(false);
                }}
                autoFocus
              />
              <Button size="sm" className="h-7 text-xs" onClick={addTopLevel}>
                Tambah
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowAdd(false)}
              >
                Batal
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-gray-500"
              onClick={() => setShowAdd(true)}
            >
              + Tambah Kriteria
            </Button>
          )}
        </div>
      </div>

      {leafCount > 0 && (
        <p className="text-xs text-gray-400 mt-3">
          {leafCount} kriteria daun ditemukan · Double-click nama untuk mengedit
          · Klik Benefit/Cost untuk mengubah tipe
        </p>
      )}
    </div>
  );
}

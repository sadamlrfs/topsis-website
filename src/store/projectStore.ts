import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  Project,
  HierarchyNode,
  Alternative,
  ScoreEntry,
  AHPComparison,
  WeightMode,
  CriterionDirection,
} from '@/types';

interface ProjectStore {
  projects: Record<string, Project>;

  // Project CRUD
  createProject: (title: string) => string;
  deleteProject: (id: string) => void;
  updateProjectTitle: (id: string, title: string) => void;

  // Node CRUD
  addNode: (projectId: string, parentId: string, name: string) => string;
  updateNode: (projectId: string, nodeId: string, updates: Partial<Pick<HierarchyNode, 'name' | 'description' | 'localWeight' | 'direction'>>) => void;
  deleteNode: (projectId: string, nodeId: string) => void;
  reorderChildren: (projectId: string, parentId: string, newOrder: string[]) => void;

  // Weight mode
  setWeightMode: (projectId: string, mode: WeightMode) => void;
  setAHPComparison: (projectId: string, parentId: string, comparison: AHPComparison) => void;
  applyAHPWeights: (projectId: string, parentId: string, weights: number[]) => void;

  // Alternatives
  addAlternative: (projectId: string, name: string, description?: string) => string;
  updateAlternative: (projectId: string, altId: string, updates: Partial<Pick<Alternative, 'name' | 'description'>>) => void;
  deleteAlternative: (projectId: string, altId: string) => void;

  // Scores
  setScore: (projectId: string, altId: string, leafId: string, value: number) => void;
  setScoreScale: (projectId: string, max: number) => void;
  setScaleLabel: (projectId: string, value: number, label: string) => void;

  // Import/export
  importProject: (project: Project) => void;
  exportProject: (id: string) => Project | null;
}

function createGoalNode(id: string): HierarchyNode {
  return {
    id,
    name: 'Goal',
    parentId: null,
    children: [],
    localWeight: 1,
  };
}

function touch(project: Project): Project {
  return { ...project, updatedAt: new Date().toISOString() };
}

function deleteNodeRecursive(
  nodes: Record<string, HierarchyNode>,
  nodeId: string
): Record<string, HierarchyNode> {
  const node = nodes[nodeId];
  if (!node) return nodes;

  const updated = { ...nodes };

  // Delete children first
  for (const childId of node.children) {
    const result = deleteNodeRecursive(updated, childId);
    Object.assign(updated, result);
    delete updated[childId];
  }

  // Remove from parent's children list
  if (node.parentId && updated[node.parentId]) {
    updated[node.parentId] = {
      ...updated[node.parentId],
      children: updated[node.parentId].children.filter((id) => id !== nodeId),
    };
  }

  return updated;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: {},

      createProject: (title) => {
        const id = uuidv4();
        const goalId = uuidv4();
        const now = new Date().toISOString();
        const project: Project = {
          id,
          title,
          goalId,
          nodes: { [goalId]: createGoalNode(goalId) },
          alternatives: [],
          scores: [],
          weightMode: 'direct',
          ahpComparisons: {},
          scoreScale: 5,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ projects: { ...s.projects, [id]: project } }));
        return id;
      },

      deleteProject: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.projects;
          return { projects: rest };
        }),

      updateProjectTitle: (id, title) =>
        set((s) => ({
          projects: {
            ...s.projects,
            [id]: touch({ ...s.projects[id], title }),
          },
        })),

      addNode: (projectId, parentId, name) => {
        const id = uuidv4();
        set((s) => {
          const project = s.projects[projectId];
          const parent = project.nodes[parentId];
          const newNode: HierarchyNode = {
            id,
            name,
            parentId,
            children: [],
            localWeight: 1,
            direction: 'benefit',
          };
          return {
            projects: {
              ...s.projects,
              [projectId]: touch({
                ...project,
                nodes: {
                  ...project.nodes,
                  [parentId]: { ...parent, children: [...parent.children, id] },
                  [id]: newNode,
                },
              }),
            },
          };
        });
        return id;
      },

      updateNode: (projectId, nodeId, updates) =>
        set((s) => {
          const project = s.projects[projectId];
          return {
            projects: {
              ...s.projects,
              [projectId]: touch({
                ...project,
                nodes: {
                  ...project.nodes,
                  [nodeId]: { ...project.nodes[nodeId], ...updates },
                },
              }),
            },
          };
        }),

      deleteNode: (projectId, nodeId) =>
        set((s) => {
          const project = s.projects[projectId];
          const nodes = deleteNodeRecursive({ ...project.nodes }, nodeId);
          delete nodes[nodeId];
          // Remove scores related to deleted subtree
          const remainingIds = new Set(Object.keys(nodes));
          const scores = project.scores.filter((sc) =>
            remainingIds.has(sc.leafCriterionId)
          );
          return {
            projects: {
              ...s.projects,
              [projectId]: touch({ ...project, nodes, scores }),
            },
          };
        }),

      reorderChildren: (projectId, parentId, newOrder) =>
        set((s) => {
          const project = s.projects[projectId];
          return {
            projects: {
              ...s.projects,
              [projectId]: touch({
                ...project,
                nodes: {
                  ...project.nodes,
                  [parentId]: { ...project.nodes[parentId], children: newOrder },
                },
              }),
            },
          };
        }),

      setWeightMode: (projectId, mode) =>
        set((s) => ({
          projects: {
            ...s.projects,
            [projectId]: touch({ ...s.projects[projectId], weightMode: mode }),
          },
        })),

      setAHPComparison: (projectId, parentId, comparison) =>
        set((s) => {
          const project = s.projects[projectId];
          return {
            projects: {
              ...s.projects,
              [projectId]: touch({
                ...project,
                ahpComparisons: {
                  ...project.ahpComparisons,
                  [parentId]: comparison,
                },
              }),
            },
          };
        }),

      applyAHPWeights: (projectId, parentId, weights) =>
        set((s) => {
          const project = s.projects[projectId];
          const parent = project.nodes[parentId];
          const updatedNodes = { ...project.nodes };
          parent.children.forEach((childId, idx) => {
            updatedNodes[childId] = {
              ...updatedNodes[childId],
              localWeight: weights[idx] ?? 0,
            };
          });
          return {
            projects: {
              ...s.projects,
              [projectId]: touch({ ...project, nodes: updatedNodes }),
            },
          };
        }),

      addAlternative: (projectId, name, description) => {
        const id = uuidv4();
        set((s) => {
          const project = s.projects[projectId];
          return {
            projects: {
              ...s.projects,
              [projectId]: touch({
                ...project,
                alternatives: [
                  ...project.alternatives,
                  { id, name, description },
                ],
              }),
            },
          };
        });
        return id;
      },

      updateAlternative: (projectId, altId, updates) =>
        set((s) => {
          const project = s.projects[projectId];
          return {
            projects: {
              ...s.projects,
              [projectId]: touch({
                ...project,
                alternatives: project.alternatives.map((a) =>
                  a.id === altId ? { ...a, ...updates } : a
                ),
              }),
            },
          };
        }),

      deleteAlternative: (projectId, altId) =>
        set((s) => {
          const project = s.projects[projectId];
          return {
            projects: {
              ...s.projects,
              [projectId]: touch({
                ...project,
                alternatives: project.alternatives.filter(
                  (a) => a.id !== altId
                ),
                scores: project.scores.filter(
                  (sc) => sc.alternativeId !== altId
                ),
              }),
            },
          };
        }),

      setScoreScale: (projectId, max) =>
        set((s) => ({
          projects: {
            ...s.projects,
            [projectId]: touch({ ...s.projects[projectId], scoreScale: max }),
          },
        })),

      setScaleLabel: (projectId, value, label) =>
        set((s) => {
          const project = s.projects[projectId];
          const scaleLabels = { ...(project.scaleLabels ?? {}), [value]: label };
          return {
            projects: {
              ...s.projects,
              [projectId]: touch({ ...project, scaleLabels }),
            },
          };
        }),

      setScore: (projectId, altId, leafId, value) =>
        set((s) => {
          const project = s.projects[projectId];
          const existing = project.scores.filter(
            (sc) =>
              !(
                sc.alternativeId === altId && sc.leafCriterionId === leafId
              )
          );
          return {
            projects: {
              ...s.projects,
              [projectId]: touch({
                ...project,
                scores: [
                  ...existing,
                  { alternativeId: altId, leafCriterionId: leafId, value },
                ],
              }),
            },
          };
        }),

      importProject: (project) =>
        set((s) => ({
          projects: { ...s.projects, [project.id]: project },
        })),

      exportProject: (id) => get().projects[id] ?? null,
    }),
    { name: 'topsis-projects' }
  )
);

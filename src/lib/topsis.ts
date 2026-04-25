import type {
  HierarchyNode,
  Alternative,
  ScoreEntry,
  CriterionDirection,
  TopsisStep,
  GlobalWeightResult,
  RankingResult,
} from '@/types';

export function getLeafNodes(
  nodes: Record<string, HierarchyNode>,
  nodeId: string
): HierarchyNode[] {
  const node = nodes[nodeId];
  if (!node) return [];
  if (node.children.length === 0) return [node];
  return node.children.flatMap((childId) => getLeafNodes(nodes, childId));
}

export function getNodePath(
  nodes: Record<string, HierarchyNode>,
  nodeId: string
): string[] {
  const node = nodes[nodeId];
  if (!node) return [];
  if (node.parentId === null) return [node.name];
  return [...getNodePath(nodes, node.parentId), node.name];
}

export function computeGlobalWeights(
  nodes: Record<string, HierarchyNode>,
  rootId: string
): GlobalWeightResult[] {
  const leaves = getLeafNodes(nodes, rootId);
  const results: GlobalWeightResult[] = [];

  for (const leaf of leaves) {
    let weight = leaf.localWeight;
    let currentId = leaf.parentId;

    while (currentId !== null) {
      const parent = nodes[currentId];
      if (!parent) break;
      weight *= parent.localWeight;
      currentId = parent.parentId;
    }

    const path = getNodePath(nodes, leaf.id);
    results.push({
      leafId: leaf.id,
      leafName: leaf.name,
      path,
      globalWeight: weight,
      direction: leaf.direction ?? 'benefit',
    });
  }

  // Normalize so total = 1
  const total = results.reduce((sum, r) => sum + r.globalWeight, 0);
  if (total > 0) {
    for (const r of results) {
      r.globalWeight = r.globalWeight / total;
    }
  }

  return results;
}

export function getTotalGlobalWeight(
  nodes: Record<string, HierarchyNode>,
  rootId: string
): number {
  const leaves = getLeafNodes(nodes, rootId);
  let total = 0;

  for (const leaf of leaves) {
    let weight = leaf.localWeight;
    let currentId = leaf.parentId;

    while (currentId !== null) {
      const parent = nodes[currentId];
      if (!parent) break;
      weight *= parent.localWeight;
      currentId = parent.parentId;
    }
    total += weight;
  }
  return total;
}

export function computeTopsis(
  nodes: Record<string, HierarchyNode>,
  alternatives: Alternative[],
  scores: ScoreEntry[],
  rootId: string
): TopsisStep {
  const globalWeights = computeGlobalWeights(nodes, rootId);
  const m = alternatives.length;
  const n = globalWeights.length;

  // Build decision matrix X[alt][criterion]
  const X: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const entry = scores.find(
        (s) =>
          s.alternativeId === alternatives[i].id &&
          s.leafCriterionId === globalWeights[j].leafId
      );
      X[i][j] = entry?.value ?? 0;
    }
  }

  // Normalize: r_ij = x_ij / sqrt(sum_i(x_ij^2))
  const R: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
  for (let j = 0; j < n; j++) {
    const denom = Math.sqrt(X.reduce((sum, row) => sum + row[j] ** 2, 0));
    for (let i = 0; i < m; i++) {
      R[i][j] = denom > 0 ? X[i][j] / denom : 0;
    }
  }

  // Weighted: v_ij = w_j * r_ij
  const V: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      V[i][j] = globalWeights[j].globalWeight * R[i][j];
    }
  }

  // Ideal solutions
  const Aplus: number[] = Array(n).fill(0);
  const Aminus: number[] = Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    const col = V.map((row) => row[j]);
    if (globalWeights[j].direction === 'benefit') {
      Aplus[j] = Math.max(...col);
      Aminus[j] = Math.min(...col);
    } else {
      Aplus[j] = Math.min(...col);
      Aminus[j] = Math.max(...col);
    }
  }

  // Distances
  const Dplus: number[] = [];
  const Dminus: number[] = [];
  for (let i = 0; i < m; i++) {
    Dplus.push(
      Math.sqrt(V[i].reduce((sum, v, j) => sum + (v - Aplus[j]) ** 2, 0))
    );
    Dminus.push(
      Math.sqrt(V[i].reduce((sum, v, j) => sum + (v - Aminus[j]) ** 2, 0))
    );
  }

  // Preference score
  const C: number[] = Dplus.map((dp, i) => {
    const total = dp + Dminus[i];
    return total > 0 ? Dminus[i] / total : 0;
  });

  // Ranking
  const ranked: RankingResult[] = alternatives
    .map((alt, i) => ({
      rank: 0,
      alternativeId: alt.id,
      alternativeName: alt.name,
      score: C[i],
      distanceBest: Dplus[i],
      distanceWorst: Dminus[i],
    }))
    .sort((a, b) => b.score - a.score)
    .map((r, idx) => ({ ...r, rank: idx + 1 }));

  return {
    decisionMatrix: X,
    normalizedMatrix: R,
    weightedMatrix: V,
    idealBest: Aplus,
    idealWorst: Aminus,
    distanceBest: Dplus,
    distanceWorst: Dminus,
    scores: C,
    ranking: ranked,
  };
}

export type CriterionDirection = 'benefit' | 'cost';
export type WeightMode = 'direct' | 'ahp';

export interface HierarchyNode {
  id: string;
  name: string;
  description?: string;
  parentId: string | null;
  children: string[];
  localWeight: number;
  direction?: CriterionDirection;
}

export interface Alternative {
  id: string;
  name: string;
  description?: string;
}

export interface ScoreEntry {
  alternativeId: string;
  leafCriterionId: string;
  value: number;
}

export interface AHPComparison {
  matrix: number[][];
  nodeIds: string[];
}

export interface Project {
  id: string;
  title: string;
  goalId: string;
  nodes: Record<string, HierarchyNode>;
  alternatives: Alternative[];
  scores: ScoreEntry[];
  weightMode: WeightMode;
  ahpComparisons: Record<string, AHPComparison>;
  scoreScale: number;          // max value of the scoring dropdown (min always 1)
  scaleLabels?: Record<number, string>; // custom label per value, e.g. { 1: 'Buruk', 5: 'Baik' }
  createdAt: string;
  updatedAt: string;
}

export interface TopsisStep {
  decisionMatrix: number[][];
  normalizedMatrix: number[][];
  weightedMatrix: number[][];
  idealBest: number[];
  idealWorst: number[];
  distanceBest: number[];
  distanceWorst: number[];
  scores: number[];
  ranking: RankingResult[];
}

export interface RankingResult {
  rank: number;
  alternativeId: string;
  alternativeName: string;
  score: number;
  distanceBest: number;
  distanceWorst: number;
}

export interface GlobalWeightResult {
  leafId: string;
  leafName: string;
  path: string[];
  globalWeight: number;
  direction: CriterionDirection;
}

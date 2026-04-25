// AHP pairwise comparison: compute weights via eigenvector approximation
// and Consistency Ratio

const RI: Record<number, number> = {
  1: 0, 2: 0, 3: 0.58, 4: 0.9, 5: 1.12,
  6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49,
};

export function ahpWeightsFromMatrix(M: number[][]): {
  weights: number[];
  CR: number;
  CI: number;
  lambda: number;
} {
  const n = M.length;
  if (n === 1) return { weights: [1], CR: 0, CI: 0, lambda: 1 };

  // Column sum normalization method
  const colSums = Array(n).fill(0);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) colSums[j] += M[i][j];

  const normalized: number[][] = M.map((row) =>
    row.map((val, j) => (colSums[j] > 0 ? val / colSums[j] : 0))
  );

  const weights = normalized.map(
    (row) => row.reduce((a, b) => a + b, 0) / n
  );

  // Lambda max
  let lambdaMax = 0;
  for (let j = 0; j < n; j++) {
    const wSum = weights.reduce((sum, w, i) => sum + M[i][j] * w, 0);
    lambdaMax += wSum / (n * weights[j]);
  }

  const CI = (lambdaMax - n) / (n - 1);
  const ri = RI[n] ?? 1.49;
  const CR = ri > 0 ? CI / ri : 0;

  return { weights, CR, CI, lambda: lambdaMax };
}

export function buildReciprocal(value: number): number {
  return value === 0 ? 1 : 1 / value;
}

export function initAHPMatrix(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 1))
  );
}

// Saaty scale labels
export const SAATY_SCALE: { value: number; label: string }[] = [
  { value: 9, label: '9 — Mutlak lebih penting' },
  { value: 8, label: '8' },
  { value: 7, label: '7 — Sangat kuat lebih penting' },
  { value: 6, label: '6' },
  { value: 5, label: '5 — Kuat lebih penting' },
  { value: 4, label: '4' },
  { value: 3, label: '3 — Sedikit lebih penting' },
  { value: 2, label: '2' },
  { value: 1, label: '1 — Sama penting' },
  { value: 1 / 2, label: '1/2' },
  { value: 1 / 3, label: '1/3 — Sedikit kurang penting' },
  { value: 1 / 4, label: '1/4' },
  { value: 1 / 5, label: '1/5 — Kurang penting' },
  { value: 1 / 6, label: '1/6' },
  { value: 1 / 7, label: '1/7 — Sangat kurang penting' },
  { value: 1 / 8, label: '1/8' },
  { value: 1 / 9, label: '1/9 — Mutlak kurang penting' },
];

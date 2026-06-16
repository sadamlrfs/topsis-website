'use client';

import type { TopsisStep, Alternative, GlobalWeightResult } from '@/types';

export function exportAsExcel(
  filename: string,
  result: TopsisStep,
  alts: Alternative[],
  globalWeights: GlobalWeightResult[],
) {
  import('xlsx').then((XLSX) => {
    const wb = XLSX.utils.book_new();

    // round to 4 dp — matches website display
    const r4 = (n: number) => parseFloat(n.toFixed(4));

    const altNames  = alts.map((a) => a.name);
    // plain criterion names (used in Steps 1-3)
    const leafNames = globalWeights.map((w) => w.leafName);
    // names with direction suffix (used in Steps 4)
    const leafWithDir = globalWeights.map((w) =>
      `${w.leafName} | ${w.direction === 'benefit' ? 'Benefit' : 'Cost'}`
    );
    // weight % row (used in Step 3)
    const weightRow = globalWeights.map((w) =>
      `w=${(w.globalWeight * 100).toFixed(1)}%`
    );

    // helper: add !cols so columns auto-fit
    function setCols(ws: ReturnType<typeof XLSX.utils.aoa_to_sheet>, widths: number[]) {
      ws['!cols'] = widths.map((w) => ({ wch: w }));
    }

    // ── Sheet 1: Ranking ─────────────────────────────────────────────────────
    // matches website Table 1 exactly; adds No. + Keterangan columns
    const rankRows: (string | number)[][] = [
      ['No.', 'Alternatif', 'D⁺', 'D⁻', 'Skor (Ci)', 'Keterangan'],
      ...result.ranking.map((r) => [
        r.rank,
        r.alternativeName,
        r4(r.distanceBest),
        r4(r.distanceWorst),
        r4(r.score),
        r.rank === 1 ? 'Terbaik' : '',
      ]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(rankRows);
    setCols(ws1, [5, 38, 12, 12, 12, 12]);
    XLSX.utils.book_append_sheet(wb, ws1, 'Ranking');

    // ── Sheet 2: Step 1 — Matriks Keputusan (X) ──────────────────────────────
    // raw scores (integers / free-form) — no rounding
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Alternatif', ...leafNames],
      ...altNames.map((name, i) => [name, ...(result.decisionMatrix[i] ?? [])]),
    ]);
    setCols(ws2, [38, ...leafNames.map(() => 20)]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Step1 Matriks Keputusan');

    // ── Sheet 3: Step 2 — Matriks Normalisasi (R) ─────────────────────────────
    const ws3 = XLSX.utils.aoa_to_sheet([
      ['Alternatif', ...leafNames],
      ...altNames.map((name, i) => [
        name,
        ...(result.normalizedMatrix[i] ?? []).map(r4),
      ]),
    ]);
    setCols(ws3, [38, ...leafNames.map(() => 20)]);
    XLSX.utils.book_append_sheet(wb, ws3, 'Step2 Normalisasi');

    // ── Sheet 4: Step 3 — Matriks Tertimbang (V) ─────────────────────────────
    // matches website Table 4: two header rows (weight % + criterion names)
    const ws4 = XLSX.utils.aoa_to_sheet([
      ['', ...weightRow],            // row 1: w=14.4% …
      ['Alternatif', ...leafNames],  // row 2: criterion names
      ...altNames.map((name, i) => [
        name,
        ...(result.weightedMatrix[i] ?? []).map(r4),
      ]),
    ]);
    setCols(ws4, [38, ...leafNames.map(() => 20)]);
    XLSX.utils.book_append_sheet(wb, ws4, 'Step3 Tertimbang');

    // ── Sheet 5: Step 4 — Solusi Ideal ───────────────────────────────────────
    // matches website Table 5: criterion headers include "| Benefit/Cost"
    const ws5 = XLSX.utils.aoa_to_sheet([
      ['Solusi', ...leafWithDir],
      ['A⁺ (Ideal Terbaik)',  ...result.idealBest.map(r4)],
      ['A⁻ (Ideal Terburuk)', ...result.idealWorst.map(r4)],
    ]);
    setCols(ws5, [22, ...leafWithDir.map(() => 32)]);
    XLSX.utils.book_append_sheet(wb, ws5, 'Step4 Solusi Ideal');

    // ── Sheet 6: Step 5 — Jarak Euclidean & Skor ─────────────────────────────
    // matches website Table 6; uses original alt order (not ranked)
    const ws6 = XLSX.utils.aoa_to_sheet([
      ['Alternatif', 'D⁺ (ke A⁺)', 'D⁻ (ke A⁻)', 'Ci = D⁻/(D⁺+D⁻)'],
      ...altNames.map((name, i) => [
        name,
        r4(result.distanceBest[i]),
        r4(result.distanceWorst[i]),
        r4(result.scores[i]),
      ]),
    ]);
    setCols(ws6, [38, 18, 18, 22]);
    XLSX.utils.book_append_sheet(wb, ws6, 'Step5 Jarak dan Skor');

    XLSX.writeFile(wb, `${filename}.xlsx`);
  });
}

// html2canvas cannot parse oklch() used by Tailwind v4 / shadcn.
// html-to-image embeds HTML into foreignObject SVG and lets the browser
// render it — no color parsing, no oklch issue.

const HD_RATIO = 3; // 3× resolution for crisp PNG/JPG/PDF

async function getCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const { toCanvas } = await import('html-to-image');
  return toCanvas(element, {
    backgroundColor: '#ffffff',
    pixelRatio: HD_RATIO,
    filter: (node) => {
      if (node instanceof HTMLElement && node.tagName === 'SCRIPT') return false;
      return true;
    },
  });
}

export async function exportAsImage(
  element: HTMLElement,
  format: 'png' | 'jpg',
  filename: string
) {
  const { toPng, toJpeg } = await import('html-to-image');
  const opts = { backgroundColor: '#ffffff', pixelRatio: HD_RATIO };
  const dataUrl =
    format === 'png'
      ? await toPng(element, opts)
      : await toJpeg(element, { ...opts, quality: 0.97 });

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${filename}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function exportAsPDF(element: HTMLElement, filename: string) {
  const { default: jsPDF } = await import('jspdf');
  const canvas = await getCanvas(element);

  // Canvas dimensions = CSS dimensions × HD_RATIO
  // Convert back to CSS px, then to mm (96 DPI: 1px = 25.4/96 mm)
  const cssW = Math.round(canvas.width  / HD_RATIO);
  const cssH = Math.round(canvas.height / HD_RATIO);
  const mmW  = cssW * (25.4 / 96);
  const mmH  = cssH * (25.4 / 96);

  const pdf = new jsPDF({
    orientation: cssW > cssH ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [mmW, mmH],
  });

  // Use JPEG inside PDF for smaller file size
  const imgData = canvas.toDataURL('image/jpeg', 0.93);
  pdf.addImage(imgData, 'JPEG', 0, 0, mmW, mmH);
  pdf.save(`${filename}.pdf`);
}

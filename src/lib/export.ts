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
    const r4 = (n: number) => parseFloat(n.toFixed(4));

    const altNames   = alts.map((a) => a.name);
    const leafNames  = globalWeights.map((w) => w.leafName);
    const leafWithDir = globalWeights.map((w) =>
      `${w.leafName} (${w.direction === 'benefit' ? 'Benefit' : 'Cost'})`
    );
    const weightRow  = globalWeights.map((w) =>
      `w=${(w.globalWeight * 100).toFixed(1)}%`
    );

    // Build one flat array of rows — blank row = section separator
    const rows: (string | number)[][] = [];
    const blank = () => rows.push([]);
    const heading = (title: string) => rows.push([title]);

    // ── Hasil Ranking ────────────────────────────────────────────────────────
    heading('HASIL RANKING');
    rows.push(['No.', 'Alternatif', 'D⁺', 'D⁻', 'Skor (Ci)', 'Keterangan']);
    result.ranking.forEach((r) => {
      rows.push([r.rank, r.alternativeName, r4(r.distanceBest), r4(r.distanceWorst), r4(r.score), r.rank === 1 ? 'Terbaik' : '']);
    });

    // ── Step 1 ───────────────────────────────────────────────────────────────
    blank(); blank();
    heading('STEP 1  Matriks Keputusan (X)');
    rows.push(['Alternatif', ...leafNames]);
    altNames.forEach((name, i) => rows.push([name, ...(result.decisionMatrix[i] ?? [])]));

    // ── Step 2 ───────────────────────────────────────────────────────────────
    blank(); blank();
    heading('STEP 2  Matriks Normalisasi (R)');
    rows.push(['Alternatif', ...leafNames]);
    altNames.forEach((name, i) => rows.push([name, ...(result.normalizedMatrix[i] ?? []).map(r4)]));

    // ── Step 3 ───────────────────────────────────────────────────────────────
    blank(); blank();
    heading('STEP 3  Matriks Tertimbang (V)');
    rows.push(['', ...weightRow]);
    rows.push(['Alternatif', ...leafNames]);
    altNames.forEach((name, i) => rows.push([name, ...(result.weightedMatrix[i] ?? []).map(r4)]));

    // ── Step 4 ───────────────────────────────────────────────────────────────
    blank(); blank();
    heading('STEP 4  Solusi Ideal');
    rows.push(['Solusi', ...leafWithDir]);
    rows.push(['A⁺ (Ideal Terbaik)',  ...result.idealBest.map(r4)]);
    rows.push(['A⁻ (Ideal Terburuk)', ...result.idealWorst.map(r4)]);

    // ── Step 5 ───────────────────────────────────────────────────────────────
    blank(); blank();
    heading('STEP 5  Jarak Euclidean & Skor Preferensi');
    rows.push(['Alternatif', 'D⁺ (ke A⁺)', 'D⁻ (ke A⁻)', 'Ci = D⁻/(D⁺+D⁻)']);
    altNames.forEach((name, i) => {
      rows.push([name, r4(result.distanceBest[i]), r4(result.distanceWorst[i]), r4(result.scores[i])]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Column widths: col A wide (alt names), rest uniform
    const nCols = Math.max(...rows.map((r) => r.length));
    ws['!cols'] = [{ wch: 38 }, ...Array(nCols - 1).fill({ wch: 20 })];

    XLSX.utils.book_append_sheet(wb, ws, 'Hasil TOPSIS');
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

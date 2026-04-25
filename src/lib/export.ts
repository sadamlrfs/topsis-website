'use client';

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

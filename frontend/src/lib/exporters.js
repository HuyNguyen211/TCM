/**
 * exporters.js — client-side file downloads (CSV now, PDF on demand).
 * jsPDF is dynamically imported so it stays out of the initial bundle until
 * the user actually clicks "Export PDF".
 */

/** UTF-8 byte-order mark so Excel detects the encoding of CSV files. */
const BOM = String.fromCharCode(0xfeff);

/** Trigger a browser download for a Blob. */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Quote a CSV cell when it contains a comma, quote, or newline. */
function csvCell(value) {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a CSV string from a header row + array of row arrays. */
export function toCsv(header, rows) {
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

/** Download `rows` as a CSV file. */
export function downloadCsv(filename, header, rows) {
  const blob = new Blob([BOM + toCsv(header, rows)], {
    type: 'text/csv;charset=utf-8;',
  });
  downloadBlob(blob, filename);
}

/**
 * Build a one-page A4 PDF: title, subtitle, an optional chart image, and a
 * data table. `imageAspect` is height/width of the source canvas, used to
 * keep the embedded chart from stretching.
 */
export async function exportChartPdf({
  filename,
  title,
  subtitle,
  imageDataUrl,
  imageAspect = 0.4,
  columns,
  rows,
}) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  doc.setFontSize(16);
  doc.text(title, margin, y);
  y += 20;

  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(subtitle, margin, y);
    doc.setTextColor(0);
    y += 20;
  }

  if (imageDataUrl) {
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = imgWidth * imageAspect;
    doc.addImage(imageDataUrl, 'PNG', margin, y, imgWidth, imgHeight);
    y += imgHeight + 28;
  }

  if (columns && rows) {
    const lineH = 16;
    const colWidth = (pageWidth - margin * 2) / columns.length;
    const colX = columns.map((_, i) => margin + i * colWidth);

    const drawHeader = () => {
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      columns.forEach((c, i) => doc.text(String(c), colX[i], y));
      doc.setFont(undefined, 'normal');
      y += lineH;
    };

    drawHeader();
    for (const row of rows) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
        drawHeader();
      }
      row.forEach((cell, i) => doc.text(String(cell), colX[i], y));
      y += lineH;
    }
  }

  doc.save(filename);
}

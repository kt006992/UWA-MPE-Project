import jsPDF from 'jspdf';
import Plotly from 'plotly.js-dist-min';

// charts: [{ kind:'chartjs'|'plotly', ref }]
export async function exportChartsToPDF(charts, fileName = 'charts.pdf') {
  const doc = new jsPDF();
  let first = true;

  for (const c of charts) {
    let imgData = null;

    if (c.kind === 'chartjs' && c.ref?.current?.canvas) {
      const canvas = c.ref.current.canvas;
      imgData = canvas.toDataURL('image/png', 1.0);
    }

    if (!imgData && c.kind === 'plotly' && c.ref?.current) {
      const container = c.ref.current;
      const plotDiv = container.querySelector('.js-plotly-plot') || container.firstElementChild;
      if (plotDiv) {
        imgData = await Plotly.toImage(plotDiv, { format: 'png', height: 900, width: 1400, scale: 2 });
      }
    }

    if (!imgData) continue;

    if (!first) doc.addPage();
    first = false;

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const imgW = 1400, imgH = 900;
    const ratio = Math.min(pageW / imgW, pageH / imgH);
    const w = imgW * ratio, h = imgH * ratio;

    doc.addImage(imgData, 'PNG', (pageW - w) / 2, (pageH - h) / 2, w, h);
  }

  doc.save(fileName);
}

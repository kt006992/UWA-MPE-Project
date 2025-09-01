// Generate Chart.js data/options based on payload
export const genScatterFromDatasets = (payload, title, valueKey, colorFn) => {
  const { datasets, xRange, yRange, xLabel, yLabel } = payload;
  const data = {
    datasets: datasets.map(d => ({
      label: d.label,
      data: d.points.map(p => ({ x: p.x, y: p.y, r: 4, value: p[valueKey] })),
      pointBackgroundColor: d.points.map(p => colorFn(p[valueKey])),
      pointRadius: 4,
      showLine: false
    }))
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: title },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.raw.value;
            return `(${ctx.raw.x.toFixed(1)}, ${ctx.raw.y.toFixed(1)})  value: ${v==null?'NA':v.toFixed(1)} dB`;
          }
        }
      }
    },
    scales: {
      x: { title: { display: true, text: xLabel || 'X' }, min: xRange?.[0], max: xRange?.[1] },
      y: { title: { display: true, text: yLabel || 'Y' }, min: yRange?.[0], max: yRange?.[1] }
    }
  };
  return { type: 'scatter', title, data, options };
};

export const genScatterFromPoints = (payload, title, valueKey, colorFn) => {
  const { points, xRange, yRange } = payload;
  const data = {
    datasets: [{
      label: title,
      data: points.map(p => ({ x: p.x, y: p.y, r: 5, value: p[valueKey] })),
      pointBackgroundColor: points.map(p => colorFn(p[valueKey])),
      pointRadius: 5,
      showLine: false
    }]
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: title },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.raw.value;
            return `(${ctx.raw.x.toFixed(1)}, ${ctx.raw.y.toFixed(1)})  value: ${v==null?'NA':v.toFixed(1)} dB`;
          }
        }
      }
    },
    scales: {
      x: { title: { display: true, text: 'X (coordinate)' }, min: xRange?.[0], max: yRange?.[1] },
      y: { title: { display: true, text: 'Y (coordinate)' }, min: yRange?.[0], max: yRange?.[1] }
    }
  };
  return { type: 'scatter', title, data, options };
};

export const genStackedBar = (payload, title) => {
  const { xLabels, seriesLabels, matrix } = payload; // 4 x T
  const palette = ['green', 'orange', 'red', 'black'];
  const datasets = seriesLabels.map((s, i) => ({
    label: s,
    data: matrix[i],
    backgroundColor: palette[i]
  }));
  const data = { labels: xLabels, datasets };
  const options = {
    responsive: true,
    plugins: { legend: { position: 'top' }, title: { display: true, text: title } },
    scales: { x: { stacked: true }, y: { stacked: true, title: { display: true, text: 'Counts' } } }
  };
  return { type: 'bar', title, data, options };
};

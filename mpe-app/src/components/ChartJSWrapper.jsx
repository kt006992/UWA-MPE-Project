import React, { forwardRef, useRef } from 'react';
import 'chart.js/auto';               //Automatically register all modules
import { Scatter, Bar } from 'react-chartjs-2';

// Give each graph a stable id
const ChartJSWrapper = forwardRef(({ type, data, options, chartId, redraw = true }, ref) => {
  const idRef = useRef(chartId || `ch-${Math.random().toString(36).slice(2)}`);

  if (type === 'bar') {
    return <Bar id={idRef.current} ref={ref} data={data} options={options} redraw={redraw} />;
  }
  return <Scatter id={idRef.current} ref={ref} data={data} options={options} redraw={redraw} />;
});
ChartJSWrapper.displayName = 'ChartJSWrapper';

export default ChartJSWrapper;

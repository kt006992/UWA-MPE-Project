import React, { forwardRef } from 'react';
import Plot from 'react-plotly.js';

// Unify the Plotly 3D wrapper, exposing the container DOM for toImage
const PlotlyWrapper = forwardRef(({ title, x, y, z, colorscale }, ref) => {
  const data = [{
    type: 'mesh3d',
    x, y, z,
    intensity: z,
    colorscale,
    showscale: true,
    colorbar: { title: 'Threshold (dB)' },
    opacity: 0.95,
    flatshading: false
  }];

  const layout = {
    title,
    autosize: true,
    margin: { l: 0, r: 0, t: 40, b: 0 },
    scene: {
      xaxis: { title: 'X (coordinate)' },
      yaxis: { title: 'Y (coordinate)' },
      zaxis: { title: 'Threshold (dB)' },
      aspectmode: 'cube'
    }
  };

  return (
    <div ref={ref}>
      <Plot
        data={data}
        layout={layout}
        useResizeHandler
        style={{ width: '100%', height: '520px' }}
        config={{ responsive: true, displaylogo: false }}
      />
    </div>
  );
});
PlotlyWrapper.displayName = 'PlotlyWrapper';

export default PlotlyWrapper;

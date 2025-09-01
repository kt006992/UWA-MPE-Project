export const colorByValue = (v) => {
  if (v == null) return 'rgba(150,150,150,0.4)';
  if (v < 0) return 'black';
  if (v < 13) return 'red';
  if (v <= 23) return 'orange';
  return 'green';
};
export const colorByRegression = (v) => {
  if (v == null) return 'rgba(150,150,150,0.4)';
  if (v >= 7) return 'blue';
  if (v >= 2) return 'green';
  if (v >= -2) return 'yellow';
  if (v >= -7) return 'orange';
  return 'red';
};
export const colorByDelta = (v) => {
  if (v == null) return 'rgba(150,150,150,0.4)';
  if (v >= 7) return 'blue';
  if (v >= 2) return 'green';
  if (v >= -2) return 'yellow';
  if (v >= -7) return 'orange';
  return 'red';
};

// Plotly 3D colormap
export const PLOTLY_COLOR_SCALE = [
  [0.00, "#8B0000"],
  [0.25, "#FF7F00"],
  [0.50, "#FFFF00"],
  [0.75, "#00AA00"],
  [1.00, "#006400"]
];

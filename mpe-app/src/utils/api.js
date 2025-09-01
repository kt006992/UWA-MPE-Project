const BASE = 'http://127.0.0.1:5000';

export const endpoints = {
  timeScatter: '/data/timepoint/scatter',
  regression: '/data/regression',
  changeScatter: '/data/change/scatter',
  timeBars: '/data/timepoint/bars',
  changeBars: '/data/change/bars'
};

export async function fetchJSON(path) {
  const resp = await fetch(`${BASE}${path}`);
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

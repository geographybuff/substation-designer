/** Plan-view colour palette. */
export const THEME = {
  outside: '#18241c',
  grass: '#2c4532',
  grassEdge: '#3d5c44',
  gravel: '#6f736f',
  gravelSpeck: 'rgba(255,255,255,0.05)',
  gridMinor: 'rgba(255,255,255,0.045)',
  gridMajor: 'rgba(255,255,255,0.11)',
  noBuild: 'rgba(56, 120, 200, 0.28)',
  noBuildEdge: 'rgba(120, 180, 255, 0.6)',
  expansion: 'rgba(250, 204, 21, 0.10)',
  expansionEdge: 'rgba(250, 204, 21, 0.65)',
  fence: '#d6dde3',
  fenceZone: 'rgba(239, 68, 68, 0.16)',
  steel: '#434e59',
  steelLight: '#5b6875',
  steelDark: '#2c343c',
  tank: '#7d8a96',
  porcelain: '#9a6b4f',
  text: '#f1f5f9',
  textDim: 'rgba(241,245,249,0.7)',
  select: '#fde047',
  hover: 'rgba(253, 224, 71, 0.45)',
  portOpen: '#ef4444',
  portOk: '#a3e635',
  copper: '#d9822b',
  protected: 'rgba(74, 222, 128, 0.20)',
  exposed: 'rgba(239, 68, 68, 0.22)',
  ghostOk: 'rgba(163, 230, 53, 0.35)',
  ghostBad: 'rgba(239, 68, 68, 0.45)',
  critical: '#ef4444',
  major: '#f97316',
  minor: '#facc15',
  info: '#60a5fa',
  shieldWire: '#cbd5e1',
  house: '#bfa77a',
  houseRoof: '#8c7a55',
} as const;

/** Bus colour by nominal voltage (CAD-style convention for this game). */
export function kvColor(kv: number): string {
  if (kv >= 220) return '#c084fc';
  if (kv >= 150) return '#f472b6';
  if (kv >= 130) return '#fb7185';
  if (kv >= 100) return '#fb923c';
  if (kv >= 60) return '#f87171';
  if (kv >= 40) return '#fbbf24';
  if (kv >= 30) return '#facc15';
  if (kv >= 20) return '#4ade80';
  if (kv > 0) return '#38bdf8';
  return '#94a3b8';
}

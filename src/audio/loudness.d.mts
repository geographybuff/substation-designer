type Samples = Float32Array | Float64Array;

export function kWeightingCoefficients(sr: number): Array<{ b: [number, number, number]; a: [number, number] }>;
export function momentaryLoudness(x: Samples, sr: number, hopS?: number): number[];
export function loudnessMax(x: Samples, sr: number): number;
export function peakDb(x: Samples): number;
export function limit<T extends Samples>(x: T, sr: number, ceiling: number, releaseS?: number): T;
export function normalizeLoudness(x: Samples, sr: number, targetLufs: number, ceilingDb?: number): { gainDb: number; lufs: number };

export interface Candidate {
  recording: string;
  start: number;
  end: number;
  followsMains?: boolean;
}
export interface RecordingRef {
  mainsHz: number | null;
}
export function chooseCandidate<C extends Candidate>(candidates: readonly C[], systemHz: number, recordings: ReadonlyMap<string, RecordingRef>): C;
export function conversionFactor(candidate: Candidate, recording: RecordingRef | undefined, systemHz: number): number;
export function validateManifest(m: unknown): string[];

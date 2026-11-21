import type { LevelDef } from '../engine/types';
import { L1_FIRST_LIGHT, L2_KEEP_LIGHTS_ON, L3_THUNDERSTORM_ALLEY, L4_MOBILE_READY, L5_GROWING_PAINS, L6_TOUCH_AND_STEP, SANDBOX } from './campaign';

export const CAMPAIGN: LevelDef[] = [L1_FIRST_LIGHT, L2_KEEP_LIGHTS_ON, L3_THUNDERSTORM_ALLEY, L4_MOBILE_READY, L5_GROWING_PAINS, L6_TOUCH_AND_STEP].sort((a, b) => a.order - b.order);
export const ALL_LEVELS: LevelDef[] = [...CAMPAIGN, SANDBOX];

export function getLevel(id: string): LevelDef | undefined {
  return ALL_LEVELS.find((l) => l.id === id);
}

/** A campaign level is unlocked when the previous one has been completed. */
export function isUnlocked(id: string, progress: Record<string, { completed: boolean }>): boolean {
  const idx = CAMPAIGN.findIndex((l) => l.id === id);
  if (idx <= 0) return true;
  return !!progress[CAMPAIGN[idx - 1]!.id]?.completed;
}

/**
 * Model registry: one builder per catalogue item kind.
 */
import type { ItemKind } from '../../engine/types';
import type { Parts } from '../parts';
import { capacitorBank, deadTankBreaker, mobilePad, powerTransformer, recloser, stationService, voltageRegulator } from './apparatus';
import type { ItemInfo, ModelFn, ModelOut } from './common';
import { arresterStand, ccvt, voltageTransformer } from './shunt';
import { controlHouse, feederExit, lightningMast, lineTerminal } from './structures';
import { circuitSwitcher, disconnectSwitch, hookstickSwitch, meteringUnit, powerFuse, waveTrap } from './switchgear';

export const MODELS: Record<ItemKind, ModelFn> = {
  line_terminal: lineTerminal,
  feeder_exit: feederExit,
  switch: disconnectSwitch,
  hookstick_switch: hookstickSwitch,
  fuse: powerFuse,
  circuit_switcher: circuitSwitcher,
  breaker: deadTankBreaker,
  recloser,
  transformer: powerTransformer,
  regulator: voltageRegulator,
  arrester: arresterStand,
  capacitor_bank: capacitorBank,
  vt: voltageTransformer,
  ccvt,
  wave_trap: waveTrap,
  metering: meteringUnit,
  station_service: stationService,
  mobile_pad: mobilePad,
  control_house: controlHouse,
  mast: lightningMast,
};

/** Plain block used when a model is missing or throws, so a bad item never breaks the view. */
export function fallbackModel(p: Parts, I: ItemInfo): ModelOut {
  p.box('cabinet', 0.1, 0, 0.1, I.w - 0.1, Math.max(0.5, I.top), I.d - 0.1);
  return { terminals: {} };
}

export { itemInfo } from './common';
export type { ModelOut, OffsiteLocal, PortId } from './common';

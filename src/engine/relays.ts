/**
 * Protective relay options offered on breakers and transformers, by standard
 * device function number (Bulletin Appendix F, IEEE C37.2).
 */
export interface RelayOption {
  code: string;
  name: string;
}

export const RELAY_OPTIONS: RelayOption[] = [
  { code: '50/51', name: 'Phase overcurrent (instantaneous / time)' },
  { code: '50N/51N', name: 'Ground overcurrent (instantaneous / time)' },
  { code: '79', name: 'Automatic reclosing' },
  { code: '87T', name: 'Transformer differential' },
  { code: '63', name: 'Sudden pressure' },
  { code: '21', name: 'Distance' },
  { code: '67', name: 'Directional overcurrent' },
  { code: '85', name: 'Pilot (communications-assisted) channel' },
  { code: '87B', name: 'Bus differential' },
  { code: '50BF', name: 'Breaker failure' },
  { code: '86', name: 'Lockout relay' },
  { code: '27', name: 'Undervoltage' },
  { code: '59', name: 'Overvoltage' },
  { code: '81', name: 'Frequency (underfrequency load shedding)' },
];

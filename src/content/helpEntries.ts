/**
 * "Help me fix this" entries for every review check and campaign objective.
 * Steps speak the game's language (toolbox names, Inspector fields, overlays)
 * and paraphrase the bulletin rule the check enforces. Keep each step short and
 * concrete; prefer naming the actual items involved.
 */
import { alignItemToBus } from '../engine/design';
import { itemLabel } from '../engine/items';
import type { FindingHelpFn, ObjectiveHelpFn } from './help';
import type { Design, ObjectiveKind } from '../engine/types';

const label = (design: Design, id: string | undefined) => {
  const it = id ? design.items.find((i) => i.id === id) : undefined;
  return it ? itemLabel(it) : 'the equipment';
};

export const FINDING_HELP: Record<string, FindingHelpFn> = {
  // ---------------------------------------------------------------- connectivity
  'conn.feederunassigned': (f, { design, level, review }) => {
    const used = new Set(design.items.filter((i) => i.kind === 'feeder_exit').map((i) => String(i.props.feeder ?? '')));
    const free = level.system.feeders.find((fd) => !used.has(fd.name));
    const id = f.itemIds?.[0];
    void review;
    return {
      what: 'Each getaway is where one distribution feeder leaves the station. The game cannot count this one until you say which feeder it carries.',
      steps: [`Select ${label(design, id)}.`, `In the Inspector, set Feeder to ${free ? free.name : 'one of the feeders listed in the project brief'}.`],
      fix: free && id ? { label: `Assign it to ${free.name}`, apply: (d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, props: { ...i.props, feeder: free.name } } : i)) }) } : undefined,
    };
  },
  'conn.sideentry': (f, { design }) => {
    const id = f.itemIds?.[0];
    const cid = f.conductorIds?.[0];
    return {
      what: 'The bus reaches this terminal from the side, so its three phases arrive lined up along the terminal instead of across it and the connections to the bushings have to cross over each other. Phase-to-phase clearance (Table 4-7) applies to those connections too.',
      steps: [
        `Line ${label(design, id)} up with the bus: drag it until its terminal sits exactly on the bus centre line (the bus tool then runs straight in).`,
        'Or redraw the last part of the bus so it leaves the terminal straight out, in the direction the terminal faces, before turning.',
      ],
      diagram: 'straight-entry',
      guide: 'clearances',
      fix: id && cid ? { label: `Line ${label(design, id)} up with the bus`, apply: (d, l) => alignItemToBus(d, l, id, cid) } : undefined,
    };
  },
  'clear.selfphase': (f, { design }) => {
    const cid = f.conductorIds?.[0];
    const id = f.itemIds?.[0];
    return {
      what: 'This bus turns twice within less than two phase spacings (a jog or a tight U-turn), so its outer phases fold into each other. The three phases of one bus need the Table 4-7 metal-to-metal clearance from each other just like two separate buses.',
      steps: [
        id ? `Move ${label(design, id)} so its terminals line up with the bus and the jog disappears.` : 'Move the equipment at one end so the bus can run straight.',
        'Or redraw the bus with each sideways step at least twice the phase spacing long.',
      ],
      diagram: 'straight-entry',
      guide: 'clearances',
      fix: id && cid ? { label: `Line ${label(design, id)} up with the bus`, apply: (d, l) => alignItemToBus(d, l, id, cid) } : undefined,
    };
  },

  // ---------------------------------------------------------------- protective relaying
  'relay.fuse.advice': (f, { design }) => ({
    what: `${label(design, f.itemIds?.[0])} is in the size range (10 MVA and up) where cooperatives usually protect the transformer with relays instead of fuses (section 12.4.4.1). Fuses are cheaper but do little for faults inside the transformer. This is advice, not an error.`,
    steps: [
      'To keep fuses: nothing to do. The finding is informational and does not cost stars.',
      'To use relays instead: replace the transformer-primary Power Fuses with a Circuit Switcher or a Circuit Breaker (if this project offers them), with a disconnect switch on its line side.',
      'Select the new device and add the transformer relays in the Inspector: 87T (differential), 63 (sudden pressure), 50/51 and 51N.',
    ],
    diagram: 'xfmr-primary',
    guide: 'primary-protection',
  }),
};

export const OBJECTIVE_HELP: Partial<Record<ObjectiveKind, ObjectiveHelpFn>> = {
  bypass_reclosers: (_o, { design, review }) => {
    const devs = design.items.filter((i) => i.kind === 'recloser' || (i.kind === 'breaker' && review.topo.loads.some((l) => l.feeder && review.facts.feederProtection.get(l.itemId) === i.id)));
    const missing = devs.filter((d) => !review.facts.bypassed.get(d.id));
    return {
      what: 'Reclosers need regular maintenance. A bypass lets a crew take the recloser out (open it and its two disconnect switches) while the feeder stays energized through a normally-open bypass switch (section 4.3.4, Fig. 4-4).',
      steps: [
        'Pick "Hook Stick Switches" (12.47 kV) in the toolbox and place one beside each recloser bay.',
        'Select it and tick "Normally open" in the Inspector: it is closed only during maintenance.',
        'Draw a bus from the station bus (on the source side of the bay\'s first disconnect switch) to one side of the bypass switch.',
        "Draw a bus from the other side to the feeder side of the bay's last disconnect switch, for example onto the bus that runs to the getaway.",
        missing.length ? `Still to do: ${missing.map((m) => itemLabel(m)).join(', ')}.` : 'Every recloser has a bypass.',
      ],
      tool: 'hookstick_switch',
      side: 'lv',
      diagram: 'recloser-bypass',
      guide: 'bypass',
      itemIds: missing.map((m) => m.id),
    };
  },
};

/**
 * Small one-line diagrams for the campaign help panel. Drawn left to right in
 * the direction of power flow with simple symbols: bus (thick line), disconnect
 * switch (open blade), recloser/breaker (box), fuse, transformer (two circles),
 * regulator, arrester, feeder getaway (arrow). Normally-open devices are dashed.
 */
import type { JSX } from 'preact';
import type { HelpDiagramId } from '../../content/help';

const C = { bus: '#7dd3fc', hv: '#f87171', dev: '#e2e8f0', no: '#fbbf24', dim: '#9fb1c2', ok: '#4ade80', bad: '#f87171' };

function Sw({ x, y, no, vertical }: { x: number; y: number; no?: boolean; vertical?: boolean }) {
  const s = no ? C.no : C.dev;
  return vertical ? (
    <g stroke={s} stroke-width={2} fill="none" stroke-dasharray={no ? '3 2' : undefined}>
      <circle cx={x} cy={y} r={2} fill={s} />
      <line x1={x} y1={y} x2={x + 7} y2={y + 12} />
      <circle cx={x} cy={y + 14} r={2} fill={s} />
    </g>
  ) : (
    <g stroke={s} stroke-width={2} fill="none" stroke-dasharray={no ? '3 2' : undefined}>
      <circle cx={x} cy={y} r={2} fill={s} />
      <line x1={x} y1={y} x2={x + 12} y2={y - 7} />
      <circle cx={x + 14} cy={y} r={2} fill={s} />
    </g>
  );
}
const Box = ({ x, y, t, color = C.dev }: { x: number; y: number; t: string; color?: string }) => (
  <g>
    <rect x={x} y={y - 8} width={18} height={16} rx={3} fill="#0f172a" stroke={color} stroke-width={2} />
    <text x={x + 9} y={y + 4} text-anchor="middle" font-size={10} fill={color} font-weight={700}>
      {t}
    </text>
  </g>
);
const Exit = ({ x, y }: { x: number; y: number }) => <path d={`M${x} ${y - 6} L${x + 10} ${y} L${x} ${y + 6}`} fill="none" stroke={C.bus} stroke-width={2} />;
const Line = ({ pts, color = C.bus, w = 2.5, dash }: { pts: Array<[number, number]>; color?: string; w?: number; dash?: string }) => (
  <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} stroke-width={w} stroke-dasharray={dash} stroke-linejoin="round" />
);
const Label = ({ x, y, t, color = C.dim, anchor = 'middle' }: { x: number; y: number; t: string; color?: string; anchor?: 'start' | 'middle' | 'end' }) => (
  <text x={x} y={y} font-size={9} fill={color} text-anchor={anchor}>
    {t}
  </text>
);
const Xfmr = ({ x, y, color = C.hv }: { x: number; y: number; color?: string }) => (
  <g fill="none" stroke-width={2}>
    <circle cx={x + 6} cy={y} r={7} stroke={color} />
    <circle cx={x + 15} cy={y} r={7} stroke={C.bus} />
  </g>
);
const Fuse = ({ x, y, color = C.hv }: { x: number; y: number; color?: string }) => (
  <g>
    <rect x={x} y={y - 4} width={16} height={8} rx={2} fill="#0f172a" stroke={color} stroke-width={2} />
    <line x1={x + 2} y1={y} x2={x + 14} y2={y} stroke={color} stroke-width={1.5} />
  </g>
);
const Arrester = ({ x, y, color = C.dev }: { x: number; y: number; color?: string }) => (
  <g stroke={color} stroke-width={2} fill="none">
    <line x1={x} y1={y} x2={x} y2={y + 6} />
    <path d={`M${x - 5} ${y + 6} h10 l-5 9 z`} />
    <line x1={x} y1={y + 15} x2={x} y2={y + 21} />
    <line x1={x - 6} y1={y + 21} x2={x + 6} y2={y + 21} />
    <line x1={x - 3} y1={y + 24} x2={x + 3} y2={y + 24} />
  </g>
);

const DIAGRAMS: Record<HelpDiagramId, { caption: string; svg: () => JSX.Element }> = {
  'feeder-bay': {
    caption: 'A feeder bay: disconnect switch, recloser, disconnect switch, getaway. The switches let the recloser be isolated.',
    svg: () => (
      <>
        <Line pts={[[12, 10], [12, 70]]} w={4} />
        <Label x={4} y={86} t="station bus" anchor="start" />
        <Line pts={[[12, 40], [40, 40]]} />
        <Sw x={40} y={40} />
        <Line pts={[[54, 40], [78, 40]]} />
        <Box x={78} y={40} t="R" />
        <Line pts={[[96, 40], [120, 40]]} />
        <Sw x={120} y={40} />
        <Line pts={[[134, 40], [168, 40]]} />
        <Exit x={168} y={40} />
        <Label x={47} y={60} t="switch" />
        <Label x={87} y={60} t="recloser" />
        <Label x={127} y={60} t="switch" />
        <Label x={186} y={60} t="getaway" anchor="end" />
      </>
    ),
  },
  'recloser-bypass': {
    caption: 'Bypass (Fig. 4-4): a normally-open switch (dashed) from the bus to the feeder side. Close it, then open the recloser and its two switches to work on the recloser with the feeder still on.',
    svg: () => (
      <>
        <Line pts={[[12, 10], [12, 76]]} w={4} />
        <Line pts={[[12, 52], [40, 52]]} />
        <Sw x={40} y={52} />
        <Line pts={[[54, 52], [78, 52]]} />
        <Box x={78} y={52} t="R" />
        <Line pts={[[96, 52], [120, 52]]} />
        <Sw x={120} y={52} />
        <Line pts={[[134, 52], [168, 52]]} />
        <Exit x={168} y={52} />
        <Line pts={[[12, 20], [80, 20]]} color={C.no} />
        <Sw x={80} y={20} no />
        <Line pts={[[94, 20], [150, 20], [150, 52]]} color={C.no} />
        <circle cx={150} cy={52} r={3} fill={C.no} />
        <Label x={87} y={10} t="bypass switch, normally open" color={C.no} />
        <Label x={87} y={74} t="recloser bay" />
      </>
    ),
  },
  'regulator-bypass': {
    caption: 'Regulator bypass: a normally-open switch across the regulator, with disconnect switches on each side so the regulator can be removed without an outage.',
    svg: () => (
      <>
        <Line pts={[[10, 52], [40, 52]]} />
        <Sw x={40} y={52} />
        <Line pts={[[54, 52], [78, 52]]} />
        <g fill="none" stroke={C.dev} stroke-width={2}>
          <circle cx={88} cy={52} r={9} />
          <path d="M82 58 L94 46 M90 46 h4 v4" />
        </g>
        <Line pts={[[97, 52], [120, 52]]} />
        <Sw x={120} y={52} />
        <Line pts={[[134, 52], [176, 52]]} />
        <Line pts={[[26, 52], [26, 22], [80, 22]]} color={C.no} />
        <Sw x={80} y={22} no />
        <Line pts={[[94, 22], [150, 22], [150, 52]]} color={C.no} />
        <Label x={87} y={12} t="bypass, normally open" color={C.no} />
        <Label x={88} y={76} t="regulator" />
      </>
    ),
  },
  'bus-regulation': {
    caption: 'Bus regulation: regulators connected right at the transformer low-voltage terminal, with the station bus on their far side, so every feeder gets regulated voltage. Feeder regulation puts a bank in each bay instead.',
    svg: () => (
      <>
        <Line pts={[[4, 46], [12, 46]]} color={C.hv} />
        <Xfmr x={12} y={46} />
        <Line pts={[[41, 46], [66, 46]]} />
        <g fill="none" stroke={C.no} stroke-width={2}>
          <circle cx={75} cy={46} r={9} />
          <path d="M69 52 L81 40 M77 40 h4 v4" />
        </g>
        <Line pts={[[84, 46], [116, 46]]} />
        <Line pts={[[116, 14], [116, 78]]} w={4} />
        {[22, 46, 70].map((y) => (
          <g key={y}>
            <Line pts={[[116, y], [170, y]]} />
            <Exit x={170} y={y} />
          </g>
        ))}
        <Label x={26} y={72} t="transformer" />
        <Label x={75} y={28} t="regulators" color={C.no} />
        <Label x={116} y={90} t="station bus" />
        <Label x={146} y={16} t="feeders" />
      </>
    ),
  },
  'xfmr-primary': {
    caption: 'Transformer primary: a disconnect switch, then a protective device (fuses, or a circuit switcher or breaker with relays), then the transformer.',
    svg: () => (
      <>
        <Line pts={[[6, 46], [22, 46]]} color={C.hv} />
        <Sw x={22} y={46} />
        <Line pts={[[36, 46], [70, 46]]} color={C.hv} />
        <Fuse x={70} y={46} />
        <Line pts={[[86, 46], [122, 46]]} color={C.hv} />
        <Xfmr x={122} y={46} />
        <Line pts={[[151, 46], [186, 46]]} />
        <Label x={29} y={28} t="switch" />
        <Label x={78} y={68} t="fuses, or breaker" />
        <Label x={78} y={78} t="with relays" />
        <Label x={136} y={28} t="transformer" />
      </>
    ),
  },
  arresters: {
    caption: 'Surge arresters connect from each phase to ground as close as practical to the equipment they protect: at the transformer terminals and at the line entrance.',
    svg: () => (
      <>
        <Line pts={[[6, 30], [84, 30]]} color={C.hv} />
        <Arrester x={22} y={30} />
        <Arrester x={66} y={30} />
        <Xfmr x={84} y={30} />
        <Line pts={[[113, 30], [186, 30]]} />
        <Arrester x={128} y={30} />
        <Label x={22} y={70} t="line" />
        <Label x={22} y={80} t="entrance" />
        <Label x={66} y={70} t="HV" />
        <Label x={66} y={80} t="terminals" />
        <Label x={128} y={70} t="LV" />
        <Label x={128} y={80} t="terminals" />
      </>
    ),
  },
  'straight-entry': {
    caption: 'Run the bus straight out of a terminal. A bus that arrives from the side squeezes the three phase connections together; a jog shorter than two phase spacings folds the phases into each other.',
    svg: () => (
      <>
        <Box x={14} y={34} t="R" />
        {[-6, 0, 6].map((o) => (
          <Line key={o} pts={[[32, 34 + o], [84, 34 + o]]} w={1.6} color={C.ok} />
        ))}
        <Label x={50} y={64} t="straight out" color={C.ok} />
        <Box x={106} y={34} t="R" />
        {[-6, 0, 6].map((o) => (
          <Line key={o} pts={[[124, 34 + o], [140 - o, 50], [140 - o, 86]]} w={1.6} color={C.bad} />
        ))}
        <Label x={170} y={30} t="from the" color={C.bad} />
        <Label x={170} y={40} t="side" color={C.bad} />
      </>
    ),
  },
  tap: {
    caption: 'A tap joins a branch to a bus. Where buses cross and connect, one runs lower and each phase rises to its own phase above.',
    svg: () => (
      <>
        <Line pts={[[10, 24], [176, 24]]} w={4} />
        <Line pts={[[80, 24], [80, 70]]} />
        <circle cx={80} cy={24} r={4} fill={C.bus} />
        <Label x={130} y={16} t="main bus" />
        <Label x={96} y={60} t="tap" anchor="start" />
      </>
    ),
  },
  'mobile-pad': {
    caption: 'Mobile transformer provision: a pad with switches that ties into the HV and LV buses so a mobile unit can carry the load while the station transformer is out.',
    svg: () => (
      <>
        <Line pts={[[8, 20], [176, 20]]} color={C.hv} />
        <Line pts={[[8, 70], [176, 70]]} />
        <Line pts={[[60, 20], [60, 70]]} color={C.dim} />
        <Xfmr x={50} y={45} />
        <Line pts={[[130, 20], [130, 34]]} color={C.hv} />
        <Sw x={130} y={34} vertical />
        <rect x={116} y={50} width={28} height={12} rx={2} fill="none" stroke={C.no} stroke-dasharray="3 2" stroke-width={2} />
        <Line pts={[[130, 62], [130, 70]]} />
        <Label x={60} y={86} t="station transformer" />
        <Label x={130} y={86} t="mobile pad" color={C.no} />
      </>
    ),
  },
  'sectionalized-bus': {
    caption: 'Sectionalized bus: two bus sections joined by a tie breaker (normally open here), each fed by its own transformer, so one transformer can carry the station.',
    svg: () => (
      <>
        <Line pts={[[8, 50], [78, 50]]} w={4} />
        <Line pts={[[104, 50], [176, 50]]} w={4} />
        <Box x={82} y={50} t="T" color={C.no} />
        <Xfmr x={30} y={22} />
        <Line pts={[[45, 29], [45, 50]]} />
        <Xfmr x={130} y={22} />
        <Line pts={[[145, 29], [145, 50]]} />
        <Label x={91} y={72} t="tie breaker" color={C.no} />
      </>
    ),
  },
};

export function HelpDiagram({ id }: { id: HelpDiagramId }) {
  const d = DIAGRAMS[id];
  if (!d) return null;
  return (
    <figure class="help-diagram" data-testid={`help-diagram-${id}`}>
      <svg viewBox="0 0 190 92" role="img" aria-label={d.caption}>
        {d.svg()}
      </svg>
      <figcaption>{d.caption}</figcaption>
    </figure>
  );
}

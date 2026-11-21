import { describe, expect, it } from 'vitest';
import { sampleDesign, SAMPLE_LEVEL } from '../src/engine/samples';
import { analyzeTopology, isCutDevice, loadsCutBy } from '../src/engine/topology';

describe('topology of the sample distribution substation', () => {
  const design = sampleDesign();
  const topo = analyzeTopology(design, SAMPLE_LEVEL);

  it('connects every terminal', () => {
    expect(topo.unconnectedPorts.map((p) => `${p.itemId}:${p.portId}`)).toEqual([]);
  });

  it('has no voltage conflicts', () => {
    expect(topo.voltageConflicts).toEqual([]);
  });

  it('identifies one source and two feeder loads', () => {
    expect(topo.sources.map((s) => s.itemId)).toEqual(['L1']);
    expect(topo.loads.map((l) => l.itemId).sort()).toEqual(['FE1', 'FE2']);
    expect(topo.loads.every((l) => l.feeder)).toBe(true);
  });

  it('energizes both feeders in the normal configuration', () => {
    for (const l of topo.loads) expect(topo.isLoadServed(l, topo.energized)).toBe(true);
  });

  it('assigns 69 kV and 12.47 kV to the right nodes', () => {
    const t1hv = topo.nodeOfPort.get('T1:hv')!;
    const t1lv = topo.nodeOfPort.get('T1:lv')!;
    expect(topo.nodeById.get(t1hv)!.kv).toBe(69);
    expect(topo.nodeById.get(t1lv)!.kv).toBe(12.47);
    // The LV bus, bypass taps and regulator output share one node.
    const bus = topo.nodeOfConductor.get('BUS');
    expect(topo.nodeOfConductor.get('C10')).toBe(bus);
    expect(topo.nodeOfConductor.get('C16')).toBe(bus);
    expect(topo.nodeOfPort.get('RG1:b')).toBe(bus);
  });

  it('treats each recloser as a cut device for its own feeder only', () => {
    const fe1 = topo.loads.find((l) => l.itemId === 'FE1')!;
    const fe2 = topo.loads.find((l) => l.itemId === 'FE2')!;
    expect(isCutDevice(topo, 'R1', fe1)).toBe(true);
    expect(isCutDevice(topo, 'R1', fe2)).toBe(false);
    expect(isCutDevice(topo, 'T1', fe1)).toBe(true);
  });

  it('keeps a feeder in service through its bypass when the recloser is out', () => {
    const open = new Set(['R1', 'S2', 'S3']);
    expect(loadsCutBy(topo, open).map((l) => l.itemId)).toEqual(['FE1']);
    expect(loadsCutBy(topo, open, { closeNormallyOpen: true })).toEqual([]);
  });
});

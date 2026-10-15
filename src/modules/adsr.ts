import type { ModuleDescriptor } from '../core/types';

export const adsr: ModuleDescriptor = {
  type: 'adsr',
  name: 'ADSR',
  color: '#ff6b81',
  control: 'fader',
  inputs: [],
  outputs: [{ id: 'out', name: 'Out', type: 'cv' }],
  params: [
    { id: 'attack', name: 'A', min: 0.002, max: 5, default: 0.01, unit: 's', scale: 'log' },
    { id: 'decay', name: 'D', min: 0.005, max: 5, default: 0.3, unit: 's', scale: 'log' },
    { id: 'sustain', name: 'S', min: 0, max: 1, default: 0.4 },
    { id: 'release', name: 'R', min: 0.005, max: 8, default: 0.5, unit: 's', scale: 'log' },
  ],
  create(ctx, state) {
    const p = { attack: 0, decay: 0, sustain: 0, release: 0 };
    const set = (id: string, v: number | string) => {
      if (id in p) p[id as keyof typeof p] = Number(v);
    };
    for (const [id, v] of Object.entries(state)) set(id, v);

    const source = ctx.createConstantSource();
    source.offset.value = 0;
    source.start();
    const level = source.offset;

    return {
      inputs: {},
      outputs: { out: source },
      setParam: set,
      gate(on) {
        const now = ctx.currentTime;
        // Restart from the current level so retriggering never jumps.
        const current = level.value;
        level.cancelScheduledValues(now);
        level.setValueAtTime(current, now);
        if (on) {
          level.linearRampToValueAtTime(1, now + p.attack);
          level.setTargetAtTime(p.sustain, now + p.attack, p.decay / 3);
        } else {
          level.setTargetAtTime(0, now, p.release / 3);
        }
      },
      dispose() {
        source.stop();
        source.disconnect();
      },
    };
  },
};

import type { ModuleDescriptor } from '../core/types';
import { smooth } from './util';

export const vca: ModuleDescriptor = {
  type: 'vca',
  name: 'VCA',
  color: '#1dd1a1',
  inputs: [
    { id: 'in', name: 'In', type: 'audio' },
    { id: 'gain', name: 'Gain CV', type: 'cv' },
  ],
  outputs: [{ id: 'out', name: 'Out', type: 'audio' }],
  params: [
    { id: 'base', name: 'Level', min: 0, max: 1, default: 0 },
    { id: 'amount', name: 'CV amt', min: 0, max: 1, default: 1 },
  ],
  create(ctx, state) {
    const amp = ctx.createGain();
    const cv = ctx.createGain();
    amp.gain.value = Number(state.base);
    cv.gain.value = Number(state.amount);
    cv.connect(amp.gain);

    return {
      inputs: { in: amp, gain: cv },
      outputs: { out: amp },
      setParam(id, value) {
        if (id === 'base') smooth(ctx, amp.gain, value);
        else if (id === 'amount') smooth(ctx, cv.gain, value);
      },
      dispose() {
        amp.disconnect();
        cv.disconnect();
      },
    };
  },
};

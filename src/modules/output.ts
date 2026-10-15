import type { ModuleDescriptor } from '../core/types';
import { smooth } from './util';

export const output: ModuleDescriptor = {
  type: 'output',
  name: 'Output',
  color: '#c8d6e5',
  inputs: [{ id: 'in', name: 'In', type: 'audio' }],
  outputs: [],
  params: [{ id: 'volume', name: 'Volume', min: 0, max: 1, default: 0.5 }],
  create(ctx, state) {
    const master = ctx.createGain();
    master.gain.value = Number(state.volume);
    master.connect(ctx.destination);

    return {
      inputs: { in: master },
      outputs: {},
      setParam(id, value) {
        if (id === 'volume') smooth(ctx, master.gain, value);
      },
      dispose() {
        master.disconnect();
      },
    };
  },
};

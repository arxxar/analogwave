import type { ModuleDescriptor } from '../core/types';
import { smooth } from './util';

export const vcf: ModuleDescriptor = {
  type: 'vcf',
  name: 'VCF',
  color: '#54a0ff',
  inputs: [
    { id: 'in', name: 'In', type: 'audio' },
    { id: 'cutoff', name: 'Cutoff CV', type: 'cv' },
  ],
  outputs: [{ id: 'out', name: 'Out', type: 'audio' }],
  params: [
    { id: 'type', name: 'Type', min: 0, max: 0, default: 'lowpass', options: ['lowpass', 'highpass', 'bandpass'] },
    { id: 'cutoff', name: 'Cutoff', min: 20, max: 20000, default: 400, unit: 'Hz', scale: 'log' },
    { id: 'resonance', name: 'Reso', min: 0.1, max: 20, default: 4, scale: 'log' },
    { id: 'amount', name: 'CV amt', min: 0, max: 10000, default: 3000, unit: 'Hz' },
  ],
  create(ctx, state) {
    const filter = ctx.createBiquadFilter();
    const cv = ctx.createGain();
    filter.type = state.type as BiquadFilterType;
    filter.frequency.value = Number(state.cutoff);
    filter.Q.value = Number(state.resonance);
    cv.gain.value = Number(state.amount);
    cv.connect(filter.frequency);

    return {
      inputs: { in: filter, cutoff: cv },
      outputs: { out: filter },
      setParam(id, value) {
        if (id === 'type') filter.type = value as BiquadFilterType;
        else if (id === 'cutoff') smooth(ctx, filter.frequency, value);
        else if (id === 'resonance') smooth(ctx, filter.Q, value);
        else if (id === 'amount') smooth(ctx, cv.gain, value);
      },
      dispose() {
        filter.disconnect();
        cv.disconnect();
      },
    };
  },
};

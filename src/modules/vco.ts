import type { ModuleDescriptor } from '../core/types';
import { smooth } from './util';

export const vco: ModuleDescriptor = {
  type: 'vco',
  name: 'VCO',
  color: '#ff9f43',
  inputs: [{ id: 'freq', name: 'FM', type: 'cv' }],
  outputs: [{ id: 'out', name: 'Out', type: 'audio' }],
  params: [
    { id: 'wave', name: 'Wave', min: 0, max: 0, default: 'sawtooth', options: ['sine', 'square', 'sawtooth', 'triangle'] },
    { id: 'freq', name: 'Pitch', min: 20, max: 2000, default: 110, unit: 'Hz', scale: 'log' },
    { id: 'detune', name: 'Detune', min: -100, max: 100, default: 0, unit: 'ct' },
    { id: 'fm', name: 'FM amt', min: 0, max: 1000, default: 100, unit: 'Hz' },
  ],
  create(ctx, state) {
    const osc = ctx.createOscillator();
    const out = ctx.createGain();
    const fmAmount = ctx.createGain();
    osc.type = state.wave as OscillatorType;
    osc.frequency.value = Number(state.freq);
    osc.detune.value = Number(state.detune);
    fmAmount.gain.value = Number(state.fm);
    fmAmount.connect(osc.frequency);
    osc.connect(out);
    osc.start();

    return {
      inputs: { freq: fmAmount },
      outputs: { out },
      setParam(id, value) {
        if (id === 'wave') osc.type = value as OscillatorType;
        else if (id === 'freq') smooth(ctx, osc.frequency, value);
        else if (id === 'detune') smooth(ctx, osc.detune, value);
        else if (id === 'fm') smooth(ctx, fmAmount.gain, value);
      },
      dispose() {
        osc.stop();
        osc.disconnect();
        out.disconnect();
        fmAmount.disconnect();
      },
    };
  },
};

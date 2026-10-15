import type { ParamValue } from '../core/types';

/** Applies a parameter change with a short ramp to avoid zipper noise and clicks. */
export function smooth(ctx: AudioContext, param: AudioParam, value: ParamValue): void {
  param.setTargetAtTime(Number(value), ctx.currentTime, 0.01);
}

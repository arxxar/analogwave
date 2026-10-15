export type SignalType = 'audio' | 'cv' | 'gate';

export interface PortDef {
  id: string;
  name: string;
  type: SignalType;
}

export interface ParamDef {
  id: string;
  name: string;
  min: number;
  max: number;
  default: number | string;
  unit?: string;
  scale?: 'linear' | 'log';
  /** Discrete choices; when set the parameter is a string selection. */
  options?: string[];
}

export type ParamValue = number | string;
export type ParamState = Record<string, ParamValue>;

export type InputTarget = AudioNode | AudioParam;

export interface ModuleInstance {
  inputs: Record<string, InputTarget>;
  outputs: Record<string, AudioNode>;
  setParam(id: string, value: ParamValue): void;
  /** Optional gate handler, implemented by envelope-like modules. */
  gate?(on: boolean): void;
  dispose(): void;
}

export interface ModuleDescriptor {
  type: string;
  name: string;
  /** CSS color used as default accent for the module's controls. */
  color: string;
  /** Control style for numeric parameters; defaults to knob. */
  control?: 'knob' | 'fader';
  inputs: PortDef[];
  outputs: PortDef[];
  params: ParamDef[];
  create(ctx: AudioContext, state: ParamState): ModuleInstance;
}

export interface PortRef {
  module: string;
  port: string;
}

export interface Connection {
  id: string;
  from: PortRef;
  to: PortRef;
}

export interface ModuleData {
  id: string;
  type: string;
  params: ParamState;
}

export interface PatchData {
  modules: ModuleData[];
  connections: Connection[];
}

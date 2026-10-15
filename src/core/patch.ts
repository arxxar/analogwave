import { getDescriptor } from './registry';
import type {
  Connection,
  ModuleDescriptor,
  ModuleInstance,
  ParamState,
  ParamValue,
  PatchData,
  PortRef,
} from './types';

export interface PatchModule {
  id: string;
  descriptor: ModuleDescriptor;
  params: ParamState;
  instance: ModuleInstance;
}

type Listener = () => void;

/** Holds module instances and connections; keeps the audio graph in sync. */
export class Patch {
  readonly modules = new Map<string, PatchModule>();
  readonly connections: Connection[] = [];
  private listeners = new Set<Listener>();
  private counter = 0;

  constructor(readonly ctx: AudioContext) {}

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }

  addModule(type: string, params: Partial<ParamState> = {}, id?: string): PatchModule {
    const descriptor = getDescriptor(type);
    const moduleId = id ?? `${type}-${++this.counter}`;
    if (this.modules.has(moduleId)) throw new Error(`Duplicate module id: ${moduleId}`);

    const state: ParamState = {};
    for (const p of descriptor.params) state[p.id] = params[p.id] ?? p.default;

    const instance = descriptor.create(this.ctx, state);
    const mod: PatchModule = { id: moduleId, descriptor, params: state, instance };
    this.modules.set(moduleId, mod);
    this.emit();
    return mod;
  }

  removeModule(id: string): void {
    const mod = this.modules.get(id);
    if (!mod) return;
    for (const c of this.connections.filter((c) => c.from.module === id || c.to.module === id)) {
      this.disconnect(c.id);
    }
    mod.instance.dispose();
    this.modules.delete(id);
    this.emit();
  }

  setParam(moduleId: string, paramId: string, value: ParamValue): void {
    const mod = this.modules.get(moduleId);
    if (!mod) return;
    mod.params[paramId] = value;
    mod.instance.setParam(paramId, value);
  }

  canConnect(from: PortRef, to: PortRef): string | null {
    const src = this.modules.get(from.module);
    const dst = this.modules.get(to.module);
    if (!src || !dst) return 'Unknown module';
    const out = src.descriptor.outputs.find((p) => p.id === from.port);
    const inp = dst.descriptor.inputs.find((p) => p.id === to.port);
    if (!out || !inp) return 'Unknown port';
    if ((out.type === 'gate') !== (inp.type === 'gate')) return 'Gate signals only connect to gate inputs';
    if (this.connections.some((c) => sameRef(c.from, from) && sameRef(c.to, to))) return 'Already connected';
    return null;
  }

  connect(from: PortRef, to: PortRef): Connection {
    const error = this.canConnect(from, to);
    if (error) throw new Error(error);
    const source = this.modules.get(from.module)!.instance.outputs[from.port];
    const target = this.modules.get(to.module)!.instance.inputs[to.port];
    if (target instanceof AudioParam) source.connect(target);
    else source.connect(target);
    const connection: Connection = { id: `c${++this.counter}`, from, to };
    this.connections.push(connection);
    this.emit();
    return connection;
  }

  disconnect(connectionId: string): void {
    const index = this.connections.findIndex((c) => c.id === connectionId);
    if (index < 0) return;
    const [c] = this.connections.splice(index, 1);
    const source = this.modules.get(c.from.module)?.instance.outputs[c.from.port];
    const target = this.modules.get(c.to.module)?.instance.inputs[c.to.port];
    if (source && target) {
      if (target instanceof AudioParam) source.disconnect(target);
      else source.disconnect(target);
    }
    this.emit();
  }

  /** Sends a gate signal to every module that reacts to gates. */
  gate(on: boolean): void {
    for (const m of this.modules.values()) m.instance.gate?.(on);
  }

  toJSON(): PatchData {
    return {
      modules: [...this.modules.values()].map((m) => ({ id: m.id, type: m.descriptor.type, params: { ...m.params } })),
      connections: this.connections.map((c) => ({ ...c })),
    };
  }

  load(data: PatchData): void {
    for (const id of [...this.modules.keys()]) this.removeModule(id);
    for (const m of data.modules) this.addModule(m.type, m.params, m.id);
    for (const c of data.connections) this.connect(c.from, c.to);
  }
}

function sameRef(a: PortRef, b: PortRef): boolean {
  return a.module === b.module && a.port === b.port;
}

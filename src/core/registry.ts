import type { ModuleDescriptor } from './types';

const descriptors = new Map<string, ModuleDescriptor>();

export function registerModule(descriptor: ModuleDescriptor): void {
  if (descriptors.has(descriptor.type)) {
    throw new Error(`Module type already registered: ${descriptor.type}`);
  }
  descriptors.set(descriptor.type, descriptor);
}

export function getDescriptor(type: string): ModuleDescriptor {
  const d = descriptors.get(type);
  if (!d) throw new Error(`Unknown module type: ${type}`);
  return d;
}

export function listDescriptors(): ModuleDescriptor[] {
  return [...descriptors.values()];
}

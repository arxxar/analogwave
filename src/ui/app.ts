import type { Patch, PatchModule } from '../core/patch';
import type { PortDef, PortRef } from '../core/types';
import { listDescriptors } from '../core/registry';
import './aw-knob';
import './aw-fader';

const SVG_NS = 'http://www.w3.org/2000/svg';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class App {
  private readonly workspace = el('div', 'workspace');
  private readonly modulesEl = el('div', 'modules');
  private readonly cables = document.createElementNS(SVG_NS, 'svg');
  private readonly status = el('span', 'status', 'Audio off');
  private dragFrom: PortRef | null = null;
  private dragPath: SVGPathElement | null = null;

  constructor(
    root: HTMLElement,
    private readonly patch: Patch,
  ) {
    this.cables.setAttribute('class', 'cables');
    this.workspace.append(this.modulesEl, this.cables);
    root.append(this.buildToolbar(), this.workspace);
    patch.onChange(() => this.render());
    window.addEventListener('resize', () => this.drawCables());
    this.render();
  }

  private buildToolbar(): HTMLElement {
    const bar = el('header', 'toolbar');
    bar.append(el('h1', undefined, 'Analogwave'));

    const power = el('button', 'btn', 'Start audio');
    power.addEventListener('click', async () => {
      const ctx = this.patch.ctx;
      if (ctx.state === 'running') await ctx.suspend();
      else await ctx.resume();
    });
    const updateState = () => {
      const on = this.patch.ctx.state === 'running';
      power.textContent = on ? 'Stop audio' : 'Start audio';
      this.status.textContent = on ? 'Audio on' : 'Audio off';
    };
    this.patch.ctx.addEventListener('statechange', updateState);

    const trigger = el('button', 'btn trigger', 'Trigger (Space)');
    const press = async () => {
      await this.patch.ctx.resume();
      trigger.classList.add('down');
      this.patch.gate(true);
    };
    const release = () => {
      if (!trigger.classList.contains('down')) return;
      trigger.classList.remove('down');
      this.patch.gate(false);
    };
    trigger.addEventListener('pointerdown', (e) => {
      trigger.setPointerCapture(e.pointerId);
      void press();
    });
    trigger.addEventListener('pointerup', release);
    trigger.addEventListener('pointercancel', release);
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || e.repeat || (e.target as HTMLElement).closest('button, select')) return;
      e.preventDefault();
      void press();
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') release();
    });

    const add = el('div', 'add');
    add.append(el('span', undefined, 'Add:'));
    for (const d of listDescriptors()) {
      const b = el('button', 'btn small', d.name);
      b.style.setProperty('--aw-color', d.color);
      b.addEventListener('click', () => this.patch.addModule(d.type));
      add.append(b);
    }

    bar.append(power, trigger, this.status, add);
    return bar;
  }

  private render(): void {
    this.modulesEl.replaceChildren(...[...this.patch.modules.values()].map((m) => this.renderModule(m)));
    this.drawCables();
  }

  private renderModule(mod: PatchModule): HTMLElement {
    const d = mod.descriptor;
    const panel = el('section', 'module');
    panel.style.setProperty('--aw-color', d.color);

    const head = el('div', 'head');
    head.append(el('h2', undefined, d.name));
    const remove = el('button', 'remove', '×');
    remove.title = 'Remove module';
    remove.addEventListener('click', () => this.patch.removeModule(mod.id));
    head.append(remove);

    const params = el('div', 'params');
    for (const p of d.params) {
      if (p.options) {
        const wrap = el('label', 'select', p.name);
        const sel = el('select');
        for (const o of p.options) sel.append(new Option(o, o, false, o === mod.params[p.id]));
        sel.addEventListener('change', () => this.patch.setParam(mod.id, p.id, sel.value));
        wrap.append(sel);
        params.append(wrap);
        continue;
      }
      const ctl = document.createElement(d.control === 'fader' ? 'aw-fader' : 'aw-knob');
      ctl.setAttribute('min', String(p.min));
      ctl.setAttribute('max', String(p.max));
      ctl.setAttribute('default', String(p.default));
      ctl.setAttribute('label', p.name);
      if (p.unit) ctl.setAttribute('unit', p.unit);
      if (p.scale) ctl.setAttribute('scale', p.scale);
      ctl.setAttribute('value', String(mod.params[p.id]));
      ctl.addEventListener('input', () =>
        this.patch.setParam(mod.id, p.id, (ctl as unknown as { value: number }).value),
      );
      params.append(ctl);
    }

    const ports = el('div', 'ports');
    const ins = el('div', 'port-col');
    const outs = el('div', 'port-col out');
    d.inputs.forEach((p) => ins.append(this.renderPort(mod.id, p, 'in')));
    d.outputs.forEach((p) => outs.append(this.renderPort(mod.id, p, 'out')));
    ports.append(ins, outs);

    panel.append(head, params, ports);
    return panel;
  }

  private renderPort(moduleId: string, port: PortDef, dir: 'in' | 'out'): HTMLElement {
    const row = el('div', 'port-row');
    const jack = el('span', `port ${port.type}`);
    jack.dataset.module = moduleId;
    jack.dataset.port = port.id;
    jack.dataset.dir = dir;
    jack.title = `${port.name} (${port.type})`;
    if (dir === 'out') jack.addEventListener('pointerdown', (e) => this.startDrag(e, { module: moduleId, port: port.id }));
    row.append(dir === 'in' ? jack : el('span', undefined, port.name), dir === 'in' ? el('span', undefined, port.name) : jack);
    return row;
  }

  private portCenter(ref: PortRef, dir: 'in' | 'out'): [number, number] | null {
    const jack = this.workspace.querySelector<HTMLElement>(
      `.port[data-dir="${dir}"][data-module="${ref.module}"][data-port="${ref.port}"]`,
    );
    if (!jack) return null;
    const r = jack.getBoundingClientRect();
    const w = this.workspace.getBoundingClientRect();
    return [r.left - w.left + r.width / 2, r.top - w.top + r.height / 2];
  }

  private static curve(a: [number, number], b: [number, number]): string {
    const sag = 40 + Math.abs(b[0] - a[0]) * 0.15;
    return `M ${a[0]} ${a[1]} C ${a[0] + 60} ${a[1] + sag}, ${b[0] - 60} ${b[1] + sag}, ${b[0]} ${b[1]}`;
  }

  private drawCables(): void {
    this.cables.replaceChildren();
    for (const c of this.patch.connections) {
      const a = this.portCenter(c.from, 'out');
      const b = this.portCenter(c.to, 'in');
      if (!a || !b) continue;
      const color = getComputedStyle(this.workspace).getPropertyValue(
        `--cable-${this.patch.modules.get(c.from.module)?.descriptor.outputs.find((p) => p.id === c.from.port)?.type}`,
      );
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', App.curve(a, b));
      path.setAttribute('class', 'cable');
      path.setAttribute('stroke', color || '#ccc');
      path.addEventListener('click', () => this.patch.disconnect(c.id));
      const title = document.createElementNS(SVG_NS, 'title');
      title.textContent = 'Click to remove';
      path.append(title);
      this.cables.append(path);
    }
  }

  private startDrag(e: PointerEvent, from: PortRef): void {
    e.preventDefault();
    this.dragFrom = from;
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('class', 'cable pending');
    this.cables.append(path);
    this.dragPath = path;
    const start = this.portCenter(from, 'out')!;
    const move = (ev: PointerEvent) => {
      const w = this.workspace.getBoundingClientRect();
      path.setAttribute('d', App.curve(start, [ev.clientX - w.left, ev.clientY - w.top]));
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('.port[data-dir="in"]');
      this.dragPath?.remove();
      this.dragPath = null;
      if (target && this.dragFrom) {
        const to = { module: target.dataset.module!, port: target.dataset.port! };
        const error = this.patch.canConnect(this.dragFrom, to);
        if (error) this.status.textContent = error;
        else this.patch.connect(this.dragFrom, to);
      }
      this.dragFrom = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    move(e);
  }
}

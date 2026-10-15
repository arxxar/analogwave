/**
 * Shared behavior for value controls (knob, fader).
 * Colors are customizable via CSS custom properties:
 *   --aw-color        active/accent color
 *   --aw-track-color  inactive track color
 *   --aw-bg-color     control body color
 *   --aw-text-color   label/value text color
 */
export abstract class AwControl extends HTMLElement {
  static observedAttributes = ['min', 'max', 'value', 'default', 'scale', 'label', 'unit'];

  protected readonly root: ShadowRoot;
  private dragStart: { pos: number; t: number } | null = null;
  private _value = 0;
  private connected = false;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  /** Pixels of pointer travel for the full range. */
  protected abstract readonly travel: number;
  /** Pointer coordinate along the control's axis; positive is toward lower values. */
  protected abstract axis(e: PointerEvent): number;
  protected abstract template(): string;
  protected abstract update(t: number, text: string): void;

  get min(): number {
    return this.num('min', 0);
  }
  get max(): number {
    return this.num('max', 1);
  }
  get log(): boolean {
    return this.getAttribute('scale') === 'log' && this.min > 0;
  }

  get value(): number {
    return this._value;
  }
  set value(v: number) {
    this._value = Math.min(this.max, Math.max(this.min, v));
    if (this.connected) this.refresh();
  }

  connectedCallback(): void {
    this.connected = true;
    this.tabIndex = 0;
    this.setAttribute('role', 'slider');
    this.root.innerHTML = `
      <style>
        :host { display: inline-block; touch-action: none; user-select: none; cursor: ns-resize; outline: none;
          --_color: var(--aw-color, #ff9f43); --_track: var(--aw-track-color, #3a3f4b);
          --_bg: var(--aw-bg-color, #232733); --_text: var(--aw-text-color, #c8d0dc); }
        :host(:focus-visible) { outline: 1px solid var(--_color); outline-offset: 2px; }
        svg { display: block; }
        text { fill: var(--_text); font: 10px system-ui, sans-serif; text-anchor: middle; }
        .label { font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
        .track { stroke: var(--_track); fill: none; stroke-linecap: round; }
        .active { stroke: var(--_color); fill: none; stroke-linecap: round; }
        .body { fill: var(--_bg); stroke: var(--_track); }
        .mark { stroke: var(--_color); stroke-linecap: round; }
        .handle { fill: var(--_bg); stroke: var(--_color); }
      </style>${this.template()}`;
    this.addEventListener('pointerdown', this.onDown);
    this.addEventListener('pointermove', this.onMove);
    this.addEventListener('pointerup', this.onUp);
    this.addEventListener('pointercancel', this.onUp);
    this.addEventListener('dblclick', this.onReset);
    this.addEventListener('keydown', this.onKey);
    if (this.hasAttribute('value')) this._value = this.num('value', this.min);
    this.refresh();
  }

  disconnectedCallback(): void {
    this.connected = false;
    this.removeEventListener('pointerdown', this.onDown);
    this.removeEventListener('pointermove', this.onMove);
    this.removeEventListener('pointerup', this.onUp);
    this.removeEventListener('pointercancel', this.onUp);
    this.removeEventListener('dblclick', this.onReset);
    this.removeEventListener('keydown', this.onKey);
  }

  attributeChangedCallback(name: string, _old: string | null, next: string | null): void {
    if (name === 'value' && next !== null) this._value = Number(next);
    if (this.connected) this.refresh();
  }

  private num(name: string, fallback: number): number {
    const v = this.getAttribute(name);
    return v === null || v === '' ? fallback : Number(v);
  }

  private get t(): number {
    const { min, max, _value: v } = this;
    if (max === min) return 0;
    if (this.log) return Math.log(v / min) / Math.log(max / min);
    return (v - min) / (max - min);
  }

  private fromT(t: number): number {
    const c = Math.min(1, Math.max(0, t));
    return this.log ? this.min * Math.pow(this.max / this.min, c) : this.min + c * (this.max - this.min);
  }

  private format(): string {
    const v = this._value;
    const abs = Math.abs(v);
    const unit = this.getAttribute('unit') ?? '';
    if (abs >= 1000) return `${(v / 1000).toFixed(abs >= 10000 ? 1 : 2)} k${unit}`;
    const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
    return `${v.toFixed(digits)}${unit ? ' ' + unit : ''}`;
  }

  private refresh(): void {
    const label = this.getAttribute('label') ?? '';
    this.setAttribute('aria-label', label);
    this.setAttribute('aria-valuemin', String(this.min));
    this.setAttribute('aria-valuemax', String(this.max));
    this.setAttribute('aria-valuenow', String(this._value));
    this.update(this.t, this.format());
    const l = this.root.querySelector('.label');
    if (l) l.textContent = label;
  }

  private commit(t: number, type: 'input' | 'change'): void {
    const next = this.fromT(t);
    if (next !== this._value) {
      this._value = next;
      this.refresh();
      this.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (type === 'change') this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private onDown = (e: PointerEvent): void => {
    this.setPointerCapture(e.pointerId);
    this.dragStart = { pos: this.axis(e), t: this.t };
    this.focus();
  };

  private onMove = (e: PointerEvent): void => {
    if (!this.dragStart) return;
    const scale = e.shiftKey ? 5 : 1;
    const delta = (this.dragStart.pos - this.axis(e)) / (this.travel * scale);
    this.commit(this.dragStart.t + delta, 'input');
  };

  private onUp = (): void => {
    if (!this.dragStart) return;
    this.dragStart = null;
    this.dispatchEvent(new Event('change', { bubbles: true }));
  };

  private onReset = (): void => {
    const d = this.getAttribute('default');
    if (d === null) return;
    this._value = Math.min(this.max, Math.max(this.min, Number(d)));
    this.refresh();
    this.dispatchEvent(new Event('input', { bubbles: true }));
    this.dispatchEvent(new Event('change', { bubbles: true }));
  };

  private onKey = (e: KeyboardEvent): void => {
    const step = e.shiftKey ? 0.001 : 0.01;
    const dir = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    this.commit(this.t + dir * step, 'change');
  };
}

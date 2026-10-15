import { AwControl } from './aw-control';

const CX = 30;
const CY = 30;
const R = 21;
const START = 135;
const SWEEP = 270;

function point(deg: number, r: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function arc(from: number, to: number): string {
  const [x1, y1] = point(from, R);
  const [x2, y2] = point(to, R);
  const large = to - from > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export class AwKnob extends AwControl {
  protected readonly travel = 160;

  protected axis(e: PointerEvent): number {
    return e.clientY;
  }

  protected template(): string {
    return `<svg width="60" height="74" viewBox="0 0 60 74">
      <path class="track" stroke-width="4" d="${arc(START, START + SWEEP)}" />
      <path class="active" stroke-width="4" d="" />
      <circle class="body" cx="${CX}" cy="${CY}" r="15" stroke-width="1.5" />
      <line class="mark" stroke-width="2.5" x1="0" y1="0" x2="0" y2="0" />
      <text class="label" x="30" y="63"></text>
      <text class="value" x="30" y="73"></text>
    </svg>`;
  }

  protected update(t: number, text: string): void {
    const angle = START + SWEEP * t;
    const active = this.root.querySelector('.active')!;
    // A zero-length arc renders nothing; keep a tiny sweep so the cap shows.
    active.setAttribute('d', arc(START, START + Math.max(0.01, SWEEP * t)));
    const [x1, y1] = point(angle, 5);
    const [x2, y2] = point(angle, 14);
    const mark = this.root.querySelector('.mark')!;
    mark.setAttribute('x1', String(x1));
    mark.setAttribute('y1', String(y1));
    mark.setAttribute('x2', String(x2));
    mark.setAttribute('y2', String(y2));
    this.root.querySelector('.value')!.textContent = text;
  }
}

customElements.define('aw-knob', AwKnob);

import { AwControl } from './aw-control';

const TOP = 8;
const HEIGHT = 80;

export class AwFader extends AwControl {
  protected readonly travel = HEIGHT;

  protected axis(e: PointerEvent): number {
    return e.clientY;
  }

  protected template(): string {
    return `<svg width="44" height="124" viewBox="0 0 44 124">
      <line class="track" stroke-width="5" x1="22" y1="${TOP}" x2="22" y2="${TOP + HEIGHT}" />
      <line class="active" stroke-width="5" x1="22" y1="${TOP + HEIGHT}" x2="22" y2="${TOP + HEIGHT}" />
      <rect class="handle" x="9" y="0" width="26" height="12" rx="3" stroke-width="2" />
      <text class="label" x="22" y="107"></text>
      <text class="value" x="22" y="119"></text>
    </svg>`;
  }

  protected update(t: number, text: string): void {
    const y = TOP + HEIGHT * (1 - t);
    this.root.querySelector('.active')!.setAttribute('y2', String(y));
    this.root.querySelector('.handle')!.setAttribute('y', String(y - 6));
    this.root.querySelector('.value')!.textContent = text;
  }
}

customElements.define('aw-fader', AwFader);

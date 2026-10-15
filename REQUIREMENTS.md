# Analogwave – Requirements

## 1. Overview

Analogwave is a static web app (no backend) that emulates a modular analog synthesizer in the browser. Sound is generated with the Web Audio API. The architecture is modular so new module types can be added with minimal effort.

## 2. Scope of the first version (MVP)

### 2.1 Modules

| Module | Purpose | Inputs | Outputs | Main parameters |
|--------|---------|--------|---------|-----------------|
| **VCO** (Voltage Controlled Oscillator) | Generates a periodic waveform | `freq` (CV, optional) | `out` (audio) | Waveform (sine, square, saw, triangle), pitch/frequency, detune |
| **VCF** (Voltage Controlled Filter) | Shapes the spectrum | `in` (audio), `cutoff` (CV) | `out` (audio) | Type (lowpass, highpass, bandpass), cutoff, resonance |
| **VCA** (Voltage Controlled Amplifier) | Controls amplitude | `in` (audio), `gain` (CV) | `out` (audio) | Base gain |
| **ADSR** (Envelope generator) | Generates a control envelope | `gate` (trigger) | `out` (CV) | Attack, Decay, Sustain, Release |

### 2.2 Modulation
- The ADSR output can be connected to the VCF `cutoff` input and to the VCA `gain` input.
- Modulation amount per CV input must be adjustable (attenuator).

### 2.3 Pitch and triggering
- No keyboard in the MVP.
- A single **Trigger button** fires the ADSR: press = gate on (attack/decay/sustain), release = gate off (release).
- Pitch is set manually via a control (knob/slider) on the VCO module (confirmed).

### 2.4 Default patch
VCO → VCF → VCA → Output, with ADSR → VCF cutoff and ADSR → VCA gain, plus a global **Output** (speaker) module and a start/stop audio button (required by browser autoplay policies).

## 3. Functional requirements

### 3.1 Modularity
- **FR-1** Each module type is defined by a self-contained descriptor: type id, display name, input ports, output ports, parameters (name, range, default, unit), and a factory that creates the audio nodes.
- **FR-2** Module types are registered in a central registry. Adding a new module type requires only adding a new module file and registering it; no changes to the core engine or patch/connection logic.
- **FR-3** The UI for a module (controls and ports) is generated from its descriptor, with the option to override with a custom view.

### 3.2 Multiple instances
- **FR-4** Any module type can be instantiated multiple times; each instance has a unique id and its own parameter state.
- **FR-5** Instances can be created and removed at runtime. Removing an instance removes its connections.

### 3.3 Ports and connections
- **FR-6** A module can have any number of inputs and outputs. Ports have an id, a name and a signal type (`audio`, `cv`, `gate`).
- **FR-7** Connections are defined by `(source module, output port) → (target module, input port)`.
- **FR-8** One output may connect to many inputs (fan-out); one input may accept many connections (summing).
- **FR-9** Connections can be created and removed at runtime, in the UI (drag cable between ports) and programmatically via the patch API.
- **FR-10** Connections are validated for compatibility (e.g. `gate` only into `gate`; `audio`/`cv` are interchangeable). Invalid connections are rejected with a clear message.
- **FR-11** Connections are not hard-coded; the whole routing is data (see 3.4).
- **FR-11a** Complex connectivity configuration (e.g. routing presets, connection rules, matrix patching, per-connection amount) is deferred to a later phase. The MVP only needs the basic connection model above, but the connection data model must be extensible (e.g. optional fields per connection) so this can be added without breaking saved patches.

### 3.4 Patch model
- **FR-12** The complete state (module instances, parameters, connections) is a serializable JSON document (the "patch").
- **FR-13** A patch can be saved/loaded (browser localStorage and JSON file export/import).
- **FR-14** Loading a patch rebuilds the audio graph from the data.

### 3.5 Module behavior
- **FR-15 VCO**: waveform selectable; frequency adjustable (e.g. 20 Hz–20 kHz, displayed also as note name); optional CV input for frequency modulation.
- **FR-16 VCF**: cutoff (20 Hz–20 kHz), resonance (Q); cutoff CV input scaled by an amount control.
- **FR-17 VCA**: gain CV input added to base gain; with gain base 0 and ADSR connected, the sound is silent until triggered.
- **FR-18 ADSR**: times in seconds, sustain level 0–1; retriggering during release/decay starts from the current level (no clicks); output 0–1 CV.
- **FR-19** Parameter changes are applied live and smoothed to avoid audio clicks.

### 3.6 User interface
- **FR-20** Workspace showing module instances as panels with knobs/sliders/selects and visible input/output ports.
- **FR-21** Cables drawn between connected ports; add/remove modules via a module palette generated from the registry.
- **FR-22** Trigger button (mouse, touch, and optionally keyboard space bar as a shortcut) controlling the ADSR gate.
- **FR-23** Master volume and an audio on/off button.
- **FR-24** Controls are custom, dependency-free SVG Web Components written in TypeScript (`<aw-knob>`, `<aw-fader>`; further controls such as selector/switch and button later).
  - Colors are customizable via CSS custom properties (e.g. `--aw-color`, `--aw-track-color`, `--aw-bg-color`), settable globally, per module type or per instance.
  - Support linear and logarithmic scales, min/max/step/default, unit display, mouse, touch and keyboard (arrow keys) input, Shift for fine adjustment, double-click to reset to default, and accessible roles/labels (`role="slider"`, `aria-valuenow`).
  - Emit standard `input`/`change` events; usable with any module descriptor parameter.

## 4. Non-functional requirements

- **NFR-1** Static web app: only HTML/CSS/JS, deployable to any static host (e.g. GitHub Pages); no server needed.
- **NFR-2** Audio via the Web Audio API; custom DSP, if needed, via AudioWorklet.
- **NFR-3** Modern evergreen browsers (Chrome, Firefox, Safari, Edge), desktop first; touch usable.
- **NFR-4** Clean separation of layers: *core* (registry, patch, connection manager), *modules* (audio logic), *UI* (rendering). Audio logic must not depend on the UI.
- **NFR-5** Latency low enough for interactive use; no audible clicks on parameter changes or triggering.
- **NFR-6** Unit tests for the patch/connection logic and module descriptors; documented guide on adding a new module.
- **NFR-7** Minimal dependencies; build tooling is Vite (vanilla TypeScript, no UI framework) producing static output.
- **NFR-8** Implemented in TypeScript (strict mode). Module descriptors, ports, parameters and patch documents are strongly typed.

## 5. Suggested architecture (informative)

```
src/
  core/        engine.ts, registry.ts, patch.ts, connections.ts
  modules/     vco.ts, vcf.ts, vca.ts, adsr.ts, output.ts
  ui/          workspace, module-view, cables, controls (aw-knob, aw-fader)
  main.ts
```

Module descriptor sketch:

```ts
const vco: ModuleDescriptor = {
  type: 'vco',
  name: 'VCO',
  inputs:  [{ id: 'freq', type: 'cv' }],
  outputs: [{ id: 'out',  type: 'audio' }],
  params:  [{ id: 'freq', min: 20, max: 20000, default: 440, unit: 'Hz' }],
  create(ctx: AudioContext, state: ParamState): ModuleInstance { /* getInput, getOutput, setParam, dispose */ }
};
export default vco;
```

## 6. Out of scope (for now)

- Keyboard / MIDI input and polyphony
- LFO, mixer, noise, sequencer, effects (future modules)
- Cloud storage, accounts, sharing

## 7. Open questions

None at the moment.

Decisions taken:
- Tooling: Vite with vanilla TypeScript (no UI framework).
- The ADSR modulates only the VCF and VCA in the MVP; modulating other parameters (e.g. VCO pitch) is not needed yet.

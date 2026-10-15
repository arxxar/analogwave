import './modules';
import './styles.css';
import { Patch } from './core/patch';
import { App } from './ui/app';

const patch = new Patch(new AudioContext());
new App(document.getElementById('app')!, patch);

patch.addModule('vco', {}, 'vco-1');
patch.addModule('vcf', {}, 'vcf-1');
patch.addModule('vca', {}, 'vca-1');
patch.addModule('adsr', {}, 'adsr-1');
patch.addModule('output', {}, 'output-1');

const link = (a: string, ap: string, b: string, bp: string) =>
  patch.connect({ module: a, port: ap }, { module: b, port: bp });
link('vco-1', 'out', 'vcf-1', 'in');
link('vcf-1', 'out', 'vca-1', 'in');
link('vca-1', 'out', 'output-1', 'in');
link('adsr-1', 'out', 'vcf-1', 'cutoff');
link('adsr-1', 'out', 'vca-1', 'gain');

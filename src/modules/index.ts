import { registerModule } from '../core/registry';
import { adsr } from './adsr';
import { output } from './output';
import { vca } from './vca';
import { vcf } from './vcf';
import { vco } from './vco';

[vco, vcf, vca, adsr, output].forEach(registerModule);

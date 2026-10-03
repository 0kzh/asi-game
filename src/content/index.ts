// Content registration: the one place new content is wired in.
import { registerAmbient, registerEvents, registerProjects, registerSetPieces, registerStages } from '../core/registry.js';
import { PROJECTS as S1 } from './projects/stage1.js';
import { PROJECTS as S2 } from './projects/stage2.js';
import { PROJECTS as S3 } from './projects/stage3.js';
import { PROJECTS as S4 } from './projects/stage4.js';
import { PROJECTS as S5 } from './projects/stage5.js';
import { AMBIENT, AMBIENT_CHOICES } from './events/ambient.js';
import { SETPIECES, SETPIECE_CHOICES } from './events/setpieces.js';
import { S2_AMBIENT } from './events/stage2.js';
import { AMBIENT3, AMBIENT_CHOICES3, SETPIECES3, CHOICES3 } from './events/stage3.js';
import { STAGES } from './stages.js';

let done = false;

export function registerContent(): void {
  if (done) return;
  done = true;
  registerProjects([...S1, ...S2, ...S3, ...S4, ...S5]);
  registerEvents([...AMBIENT_CHOICES, ...SETPIECE_CHOICES]);
  registerEvents([...AMBIENT_CHOICES3, ...CHOICES3]);
  registerAmbient(AMBIENT);
  registerAmbient(S2_AMBIENT);
  registerAmbient(AMBIENT3);
  registerSetPieces(SETPIECES);
  registerSetPieces(SETPIECES3);
  registerStages(STAGES);
}

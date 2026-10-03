// Content registration: the one place new content is wired in.
import { registerAmbient, registerEvents, registerProjects, registerSetPieces, registerStages } from '../core/registry.js';
import { PROJECTS as S1 } from './projects/stage1.js';
import { PROJECTS as S2 } from './projects/stage2.js';
import { PROJECTS as S3 } from './projects/stage3.js';
import { PROJECTS as S4 } from './projects/stage4.js';
import { PROJECTS as S5 } from './projects/stage5.js';
import { AMBIENT, AMBIENT_CHOICES } from './events/ambient.js';
import { SETPIECES, SETPIECE_CHOICES } from './events/setpieces.js';
import { STAGES } from './stages.js';
let done = false;
export function registerContent() {
    if (done)
        return;
    done = true;
    registerProjects([...S1, ...S2, ...S3, ...S4, ...S5]);
    registerEvents([...AMBIENT_CHOICES, ...SETPIECE_CHOICES]);
    registerAmbient(AMBIENT);
    registerSetPieces(SETPIECES);
    registerStages(STAGES);
}
//# sourceMappingURL=index.js.map
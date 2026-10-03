// Content registry. Content modules are plain data + small functions; src/content/index.ts
// registers them once. Core looks content up by id here (state stores only ids).
import type { AmbientEvent, ChoiceEvent, Project, SetPiece, Stage } from './types.js';

export const REG = {
  projects: [] as Project[],
  projectById: {} as Record<string, Project>,
  events: {} as Record<string, ChoiceEvent>,
  ambient: [] as AmbientEvent[],
  setpieces: [] as SetPiece[],
  setpieceById: {} as Record<string, SetPiece>,
  stages: {} as Record<number, Stage>,
};

export function registerProjects(list: Project[]): void {
  for (const p of list) {
    if (REG.projectById[p.id]) throw new Error(`duplicate project ${p.id}`);
    REG.projects.push(p);
    REG.projectById[p.id] = p;
  }
}

export function registerEvents(list: ChoiceEvent[]): void {
  for (const e of list) {
    if (REG.events[e.id]) throw new Error(`duplicate event ${e.id}`);
    REG.events[e.id] = e;
  }
}

export function registerAmbient(list: AmbientEvent[]): void {
  for (const e of list) REG.ambient.push(e);
}

export function registerSetPieces(list: SetPiece[]): void {
  for (const e of list) {
    if (REG.setpieceById[e.id]) throw new Error(`duplicate set piece ${e.id}`);
    REG.setpieces.push(e);
    REG.setpieceById[e.id] = e;
  }
}

export function registerStages(list: Stage[]): void {
  for (const st of list) REG.stages[st.id] = st;
}

export function getProject(id: string): Project {
  const p = REG.projectById[id];
  if (!p) throw new Error(`unknown project ${id}`);
  return p;
}

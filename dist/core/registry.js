export const REG = {
    projects: [],
    projectById: {},
    events: {},
    ambient: [],
    setpieces: [],
    setpieceById: {},
    stages: {},
};
export function registerProjects(list) {
    for (const p of list) {
        if (REG.projectById[p.id])
            throw new Error(`duplicate project ${p.id}`);
        REG.projects.push(p);
        REG.projectById[p.id] = p;
    }
}
export function registerEvents(list) {
    for (const e of list) {
        if (REG.events[e.id])
            throw new Error(`duplicate event ${e.id}`);
        REG.events[e.id] = e;
    }
}
export function registerAmbient(list) {
    for (const e of list)
        REG.ambient.push(e);
}
export function registerSetPieces(list) {
    for (const e of list) {
        if (REG.setpieceById[e.id])
            throw new Error(`duplicate set piece ${e.id}`);
        REG.setpieces.push(e);
        REG.setpieceById[e.id] = e;
    }
}
export function registerStages(list) {
    for (const st of list)
        REG.stages[st.id] = st;
}
export function getProject(id) {
    const p = REG.projectById[id];
    if (!p)
        throw new Error(`unknown project ${id}`);
    return p;
}
//# sourceMappingURL=registry.js.map
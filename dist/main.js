// boot(): load or new state → Engine → mountUI → dev overlay if ?dev or backtick → window.game.
import { registerContent } from './content/index.js';
import { clearSave, exportString, importString, loadFrom, newState, saveTo } from './core/state.js';
import { Engine } from './core/engine.js';
import { act } from './core/actions.js';
import { mountUI, render } from './ui/render.js';
import { mountFooter } from './ui/footer.js';
import { ui } from './ui/dom.js';
import { createGameApi, toggleOverlay } from './dev/overlay.js';
function storage() {
    try {
        return window.localStorage;
    }
    catch {
        return null;
    }
}
function boot() {
    registerContent();
    const params = new URLSearchParams(location.search);
    const dev = params.has('dev') && params.get('dev') !== '0';
    const fixedSeed = Number(params.get('seed')) || 0;
    const freshSeed = () => fixedSeed || (Date.now() % 2147483647) || 1;
    const store = storage();
    const loaded = store && !params.has('fresh') ? loadFrom(store) : null;
    const engine = new Engine(loaded ?? newState(freshSeed()));
    let lastSave = 0;
    const save = () => {
        if (!store)
            return;
        try {
            saveTo(store, engine.state);
            lastSave = performance.now();
        }
        catch { /* quota or privacy mode */ }
    };
    ui.state = () => engine.state;
    ui.act = (id) => {
        const ok = act(engine.state, id);
        render(engine.state);
        return ok;
    };
    mountUI();
    engine.on('frame', render);
    engine.on('autosave', () => { if (performance.now() - lastSave > 5000)
        save(); });
    setInterval(save, 30000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden')
        save(); });
    window.addEventListener('pagehide', save);
    const api = createGameApi(engine, { render, save, seed: freshSeed });
    window.game = api;
    mountFooter(document.getElementById('footer'), {
        save,
        exportSave: () => exportString(engine.state),
        importSave: (str) => {
            try {
                engine.setState(importString(str));
                render(engine.state);
                save();
                return true;
            }
            catch {
                return false;
            }
        },
        reset: () => {
            if (store)
                clearSave(store);
            engine.setState(newState(freshSeed()));
            render(engine.state);
            save();
        },
        toggleDev: () => toggleOverlay(api),
        dev,
    });
    if (dev)
        toggleOverlay(api);
    document.addEventListener('keydown', (e) => {
        if (e.key === '`' && !(e.target instanceof HTMLInputElement))
            toggleOverlay(api);
    });
    render(engine.state);
    engine.start();
}
boot();
//# sourceMappingURL=main.js.map
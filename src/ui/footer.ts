// Footer menu, fixed bottom-right (ADR .menu): save. export. import. start over. lights off. dev.
import { h } from './dom.js';

export interface FooterHooks {
  save(): void;
  exportSave(): string;
  importSave(str: string): boolean;
  reset(): void;
  toggleDev(): void;
  dev: boolean;
}

let lightsKey = 'takeoff.lights';

export function mountFooter(root: HTMLElement, hooks: FooterHooks): void {
  const link = (label: string, fn: (b: HTMLButtonElement) => void, id: string) => {
    const b = h('button', { class: 'menuBtn', type: 'button', id }, label);
    b.addEventListener('click', () => fn(b));
    return b;
  };
  let confirmTimer: number | null = null;
  const items = [
    link('save.', (b) => { hooks.save(); flash(b, 'saved.', 'save.'); }, 'menuSave'),
    link('export.', () => { window.prompt('your save (copy it):', hooks.exportSave()); }, 'menuExport'),
    link('import.', () => {
      const str = window.prompt('paste a save:');
      if (str && !hooks.importSave(str)) window.alert('that save could not be read.');
    }, 'menuImport'),
    link('start over.', (b) => {
      if (confirmTimer === null) {
        b.textContent = 'are you sure? click again.';
        confirmTimer = window.setTimeout(() => { b.textContent = 'start over.'; confirmTimer = null; }, 3000);
      } else {
        clearTimeout(confirmTimer);
        confirmTimer = null;
        b.textContent = 'start over.';
        hooks.reset();
      }
    }, 'menuReset'),
    link('lights off.', (b) => {
      const dark = document.body.classList.toggle('dark');
      b.textContent = dark ? 'lights on.' : 'lights off.';
      try { localStorage.setItem(lightsKey, dark ? '1' : '0'); } catch { /* storage unavailable */ }
    }, 'menuLights'),
  ];
  if (hooks.dev) items.push(link('dev.', () => hooks.toggleDev(), 'menuDev'));
  root.replaceChildren(...items);
  try {
    if (localStorage.getItem(lightsKey) === '1') {
      document.body.classList.add('dark');
      const b = root.querySelector('#menuLights');
      if (b) b.textContent = 'lights on.';
    }
  } catch { /* storage unavailable */ }
}

function flash(b: HTMLButtonElement, text: string, back: string): void {
  b.textContent = text;
  setTimeout(() => { b.textContent = back; }, 1000);
}

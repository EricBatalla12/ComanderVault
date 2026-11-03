// Punto de entrada: enrutado, tema, instalación PWA y acciones globales

import { $, $$ } from './utils.js';
import * as store from './store.js';
import { initModal, toast } from './ui.js';
import { openCommanderForm, openGamePicker } from './forms.js';
import {
  renderCollection, bindCollection, renderDetail, bindDetail, renderStats, renderSettings, bindSettings,
} from './views.js';

const view = $('#view');
let deferredInstall = null;
let lastRoute = '';

// ---------- Tema ----------
const media = matchMedia('(prefers-color-scheme: light)');
function applyTheme() {
  const pref = store.getState().settings.theme;
  const mode = pref === 'system' ? (media.matches ? 'light' : 'dark') : pref;
  document.documentElement.dataset.theme = mode;
  $('meta[name="theme-color"]').setAttribute('content', mode === 'light' ? '#f5f1e8' : '#0b0d14');
}
media.addEventListener?.('change', applyTheme);

// ---------- Rutas ----------
function parseRoute() {
  const h = location.hash.replace(/^#\/?/, '');
  const [name, id] = h.split('/');
  if (name === 'c' && id) return { route: 'detail', id };
  if (name === 'stats') return { route: 'stats' };
  if (name === 'settings') return { route: 'settings' };
  return { route: 'collection' };
}

function render() {
  const { route, id } = parseRoute();
  const key = route + (id || '');
  const changed = key !== lastRoute;
  lastRoute = key;
  view.dataset.route = route;
  const y = scrollY;
  if (route === 'collection') {
    // Mantener el foco del buscador si ya estamos en la colección
    const focused = document.activeElement?.id === 'q';
    renderCollection(view);
    if (focused) $('#q')?.focus();
  } else if (route === 'detail') renderDetail(view, id);
  else if (route === 'stats') renderStats(view);
  else renderSettings(view, { canInstall: !!deferredInstall });

  $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === (route === 'detail' ? 'collection' : route)));
  if (changed) window.scrollTo({ top: 0 });
  else {
    view.querySelectorAll('.fade-in').forEach((el) => el.classList.remove('fade-in'));
    window.scrollTo({ top: y });
  }
  const c = id && store.getCommander(id);
  document.title = c ? `${c.name} · CommanderVault` : 'CommanderVault';
}

// ---------- Instalación ----------
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  $('#install-btn')?.removeAttribute('hidden');
  if (parseRoute().route === 'settings') render();
});
window.addEventListener('appinstalled', () => {
  deferredInstall = null;
  $('#install-btn')?.setAttribute('hidden', '');
  toast('¡CommanderVault instalada!', { icon: '✦' });
});
async function install() {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall = null;
  $('#install-btn')?.setAttribute('hidden', '');
  render();
}

// ---------- Arranque ----------
initModal();
applyTheme();
bindCollection(view);
bindDetail(view);
bindSettings(view, { install, applyTheme });

document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-action]');
  if (!a) return;
  if (a.dataset.action === 'new') openCommanderForm();
  if (a.dataset.action === 'install') install();
  if (a.dataset.action === 'quick-log') openGamePicker();
});

// Atajo de teclado: "n" para nuevo comandante, "/" para buscar
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select, [contenteditable]') || $('#modal').open || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'n') {
    e.preventDefault();
    openCommanderForm();
  } else if (e.key === '/' && $('#q')) {
    e.preventDefault();
    $('#q').focus();
  }
});

store.subscribe(render);
window.addEventListener('hashchange', render);
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

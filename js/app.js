// Punto de entrada: sesión, enrutado, tema y acciones globales

import { $, $$, esc } from './utils.js';
import * as store from './store.js';
import * as cloud from './cloud.js';
import { initModal, toast, confirmDialog } from './ui.js';
import { openCommanderForm, openGamePicker, openAddSheet } from './forms.js';
import {
  renderCollection, bindCollection, renderDetail, bindDetail, renderStats, renderSettings, bindSettings,
} from './views.js';
import { renderWishlist, bindWishlist } from './wishlist.js';
import { renderLogin, renderSplash, renderInitError } from './auth.js';

const view = $('#view');
const cloudOn = cloud.isConfigured();
let authKnown = !cloudOn; // en modo local no hay sesión que esperar
let lastRoute = '';
let checkLocalData = false;

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
  if (name === 'wishlist') return { route: 'wishlist' };
  if (name === 'stats') return { route: 'stats' };
  if (name === 'settings') return { route: 'settings' };
  return { route: 'collection' };
}

function render() {
  if (!authKnown) return renderSplash(view, 'Conectando…');
  if (cloudOn && !cloud.getUser()) {
    if (view.dataset.route !== 'login') renderLogin(view);
    lastRoute = 'login';
    return;
  }
  document.body.classList.remove('auth-mode');
  updateUserChip();
  if (!store.getState().ready) return renderSplash(view);

  const { route, id } = parseRoute();
  const key = route + (id || '');
  const changed = key !== lastRoute;
  lastRoute = key;
  view.dataset.route = route;
  const y = scrollY;
  const focusedId = document.activeElement?.id;
  if (route === 'collection') renderCollection(view);
  else if (route === 'detail') renderDetail(view, id);
  else if (route === 'wishlist') renderWishlist(view);
  else if (route === 'stats') renderStats(view);
  else renderSettings(view);
  // Mantener el foco del buscador al re-pintar
  if (!changed && (focusedId === 'q' || focusedId === 'wq')) $(`#${focusedId}`)?.focus();

  const nav = route === 'detail' ? 'collection' : route;
  $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === nav));
  if (changed) window.scrollTo({ top: 0 });
  else {
    view.querySelectorAll('.fade-in').forEach((el) => el.classList.remove('fade-in'));
    window.scrollTo({ top: y });
  }
  updateSyncUI();
  const c = id && store.getCommander(id);
  document.title = c ? `${c.name} · CommanderVault` : 'CommanderVault';
}

// ---------- Usuario y sincronización ----------
function updateUserChip() {
  const chip = $('#user-chip');
  const user = cloud.getUser();
  if (!chip) return;
  chip.hidden = !user;
  if (!user) return;
  const initial = (user.displayName || user.email || '?').trim()[0].toUpperCase();
  chip.querySelector('.avatar').innerHTML = user.photoURL
    ? `<img src="${esc(user.photoURL)}" alt="" referrerpolicy="no-referrer">`
    : esc(initial);
  chip.title = `${user.displayName || ''} ${user.email || ''}`.trim();
}

const SYNC_TEXT = {
  idle: 'Sincronizado',
  syncing: 'Guardando…',
  offline: 'Sin conexión · se guardará al volver',
  error: 'Error al sincronizar',
};
function updateSyncUI() {
  const s = cloud.getSyncState();
  $('#user-chip')?.setAttribute('data-sync-state', s);
  $$('[data-sync]').forEach((el) => {
    el.textContent = SYNC_TEXT[s] || '';
    el.dataset.state = s;
  });
  const detail = s === 'error' ? cloud.getSyncError() : '';
  $$('[data-sync-error]').forEach((el) => {
    el.hidden = !detail;
    el.querySelector('span').textContent = detail;
  });
}
cloud.onSyncState(updateSyncUI);

/** Al entrar por primera vez, ofrece subir los datos que había en el dispositivo sin cuenta. */
async function offerLocalImport(user) {
  const local = store.localCommanders();
  const dismissedKey = `commandervault:import-dismissed:${user.uid}`;
  if (!local.length || localStorage.getItem(dismissedKey)) return;
  const ok = await confirmDialog({
    title: 'Datos en este dispositivo',
    message: `Tienes ${local.length} comandante${local.length === 1 ? '' : 's'} guardado${local.length === 1 ? '' : 's'} en este dispositivo de antes de iniciar sesión. ¿Quieres añadirlos a tu cuenta para tenerlos en todas partes?`,
    confirm: 'Añadir a mi cuenta',
  });
  if (ok) {
    store.replaceAll({ commanders: local }, 'merge');
    store.clearLocalCommanders();
    toast('Datos añadidos a tu cuenta', { icon: '✦' });
  } else {
    try {
      localStorage.setItem(dismissedKey, '1');
    } catch {}
  }
}

// ---------- Arranque ----------
initModal();
applyTheme();
bindCollection(view);
bindDetail(view);
bindWishlist(view);
bindSettings(view, { applyTheme });

document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-action]');
  if (!a) return;
  const act = a.dataset.action;
  if (act === 'new') openCommanderForm();
  else if (act === 'new-wish') openCommanderForm(null, { wishlist: true });
  else if (act === 'quick-log') openGamePicker();
  else if (act === 'add-sheet') openAddSheet();
  else if (act === 'sync-retry') cloud.retryNow();
});

// Atajos de teclado: "n" nuevo comandante, "p" añadir a Por jugar, "/" buscar
document.addEventListener('keydown', (e) => {
  if (lastRoute === 'login' || e.target.closest('input, textarea, select, [contenteditable]') || $('#modal').open || e.metaKey || e.ctrlKey || e.altKey) return;
  const search = $('#q') || $('#wq');
  if (e.key === 'n') {
    e.preventDefault();
    openCommanderForm();
  } else if (e.key === 'p') {
    e.preventDefault();
    openCommanderForm(null, { wishlist: true });
  } else if (e.key === '/' && search) {
    e.preventDefault();
    search.focus();
  }
});

store.subscribe((state, { remote }) => {
  render();
  if (remote && checkLocalData && cloud.getUser()) {
    checkLocalData = false;
    offerLocalImport(cloud.getUser());
  }
});
window.addEventListener('hashchange', render);

async function boot() {
  render();
  if (!cloudOn) return;
  try {
    await cloud.init((user) => {
      authKnown = true;
      if (user) checkLocalData = true;
      else store.useCloud(); // sin sesión: memoria vacía
      lastRoute = '';
      view.dataset.route = '';
      render();
    });
  } catch (e) {
    console.error(e);
    renderInitError(view, () => location.reload());
  }
}
boot();

// La app ya no es instalable: retira el service worker y la caché de versiones anteriores
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
}
if (window.caches) {
  caches.keys().then((keys) => keys.filter((k) => k.startsWith('cv-')).forEach((k) => caches.delete(k))).catch(() => {});
}

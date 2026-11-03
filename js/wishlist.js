// Vista "Por jugar": comandantes que quieres probar o construir

import { esc, $, $$, isSafeUrl, siteOf } from './utils.js';
import { pip, pips, comboName } from './mana.js';
import * as store from './store.js';
import { icons, artLayer, toast, fullName } from './ui.js';
import { openCommanderForm } from './forms.js';

export const PRIORITY = {
  1: { label: 'Alta', cls: 'prio-high' },
  2: { label: 'Media', cls: 'prio-mid' },
  3: { label: 'Baja', cls: 'prio-low' },
};

const wui = { q: '', prio: 0 };
const byName = (a, b) => a.name.localeCompare(b.name, 'es');

const WISH_SORTS = {
  priority: { label: 'Prioridad', fn: (a, b) => a.priority - b.priority || b.createdAt.localeCompare(a.createdAt) },
  recent: { label: 'Añadidos recientemente', fn: (a, b) => b.createdAt.localeCompare(a.createdAt) },
  name: { label: 'Nombre (A–Z)', fn: byName },
};

export function renderWishlist(view) {
  const list = store.wishlist();
  const { settings } = store.getState();
  if (!list.length) {
    view.innerHTML = `<section class="empty fade-in">
      <div class="empty-art">${['W', 'U', 'B', 'R', 'G'].map((c, i) => `<span style="--i:${i}">${pip(c, 44)}</span>`).join('')}</div>
      <h1>¿Qué quieres jugar?</h1>
      <p class="muted">Apunta aquí los comandantes que te apetece probar o construir, con su prioridad, ideas y enlaces a listas. Cuando lo juegues, pásalo a tu colección con un toque.</p>
      <div class="empty-actions">
        <button class="btn btn-primary btn-lg" data-action="new-wish" type="button">${icons.plus} Añadir a Por jugar</button>
      </div>
    </section>`;
    return;
  }
  const high = list.filter((c) => c.priority === 1).length;
  view.innerHTML = `<section class="fade-in">
    <header class="page-head">
      <div><p class="eyebrow">Tu lista de deseos</p><h1>Por jugar</h1></div>
      <div class="head-actions">
        <div class="head-stats"><div><strong>${list.length}</strong><span>pendientes</span></div>
          <div><strong>${high}</strong><span>prioridad alta</span></div></div>
        <button class="btn btn-primary head-add" data-action="new-wish" type="button">${icons.plus} Añadir</button>
      </div>
    </header>
    <div class="toolbar">
      <div class="search-box grow">${icons.search}
        <input id="wq" type="search" placeholder="Buscar en tu lista…" value="${esc(wui.q)}" aria-label="Buscar"></div>
      <div class="toolbar-row">
        <div class="seg" role="group" aria-label="Prioridad">
          ${[[0, 'Todas'], [1, 'Alta'], [2, 'Media'], [3, 'Baja']].map(([k, l]) => `<button type="button" class="${wui.prio === k ? 'on' : ''}" data-filter-prio="${k}">${l}</button>`).join('')}
        </div>
        <label class="sort"><span class="sr-only">Ordenar</span>
          <select id="wsort">${Object.entries(WISH_SORTS).map(([k, s]) => `<option value="${k}" ${settings.wishSort === k ? 'selected' : ''}>${s.label}</option>`).join('')}</select></label>
      </div>
    </div>
    <div id="wgrid" class="wish-grid"></div>
  </section>`;
  renderWishGrid();
}

function renderWishGrid() {
  const grid = $('#wgrid');
  if (!grid) return;
  const q = wui.q.trim().toLowerCase();
  const sort = WISH_SORTS[store.getState().settings.wishSort] || WISH_SORTS.priority;
  const list = store
    .wishlist()
    .filter((c) => !wui.prio || c.priority === wui.prio)
    .filter((c) => !q || [c.name, c.partner?.name, c.typeLine, comboName(c.colors), ...c.tags, c.notes].join(' ').toLowerCase().includes(q))
    .sort(sort.fn);
  grid.innerHTML = list.length ? list.map(wishCard).join('') : '<div class="no-results"><p>Nada coincide con los filtros.</p></div>';
}

function wishCard(c) {
  const p = PRIORITY[c.priority];
  const firstLink = c.links.find((l) => isSafeUrl(l.url));
  const edhrec = isSafeUrl(c.edhrecUri) && !c.links.some((l) => /edhrec/.test(l.url)) ? c.edhrecUri : '';
  return `<article class="wish-card" data-id="${c.id}" tabindex="0" aria-label="${esc(fullName(c))}">
    <div class="wish-art">${artLayer(c)}<div class="wish-shade"></div>
      <div class="cmd-top">${pips(c.colors, 20)}<span class="badge prio ${p.cls}">${icons.flame}${p.label}</span></div>
    </div>
    <div class="wish-body">
      <h3 class="wish-name">${esc(c.name)}${c.partner?.name ? `<span class="cmd-partner">& ${esc(c.partner.name)}</span>` : ''}</h3>
      <p class="wish-sub muted small">${esc(comboName(c.colors))}${c.bracket ? ` · Bracket ${c.bracket}` : ''}</p>
      ${c.notes ? `<p class="wish-notes">${esc(c.notes)}</p>` : ''}
      ${c.tags.length ? `<div class="wish-tags">${c.tags.map((t) => `<span class="tag-soft">#${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="wish-actions">
        <button class="btn btn-small btn-win" data-action="wish-played" type="button">${icons.check} Lo he jugado</button>
        <span class="wish-links">
          ${firstLink ? `<a class="icon-btn" href="${esc(firstLink.url)}" target="_blank" rel="noopener noreferrer" title="${esc(firstLink.label || siteOf(firstLink.url).name)}" aria-label="Abrir mazo" data-stop>${icons.external}</a>` : ''}
          ${edhrec ? `<a class="icon-btn" href="${esc(edhrec)}" target="_blank" rel="noopener noreferrer" title="Ver en EDHREC" aria-label="Ver en EDHREC" data-stop><span class="site-badge mini" style="--site:#5b7cfa">ED</span></a>` : ''}
          <button class="icon-btn" data-action="wish-delete" type="button" aria-label="Quitar de la lista">${icons.trash}</button>
        </span>
      </div>
    </div>
  </article>`;
}

export function bindWishlist(view) {
  view.addEventListener('input', (e) => {
    if (view.dataset.route !== 'wishlist' || e.target.id !== 'wq') return;
    wui.q = e.target.value;
    renderWishGrid();
  });
  view.addEventListener('change', (e) => {
    if (view.dataset.route === 'wishlist' && e.target.id === 'wsort') store.setSetting('wishSort', e.target.value);
  });
  view.addEventListener('click', (e) => {
    if (view.dataset.route !== 'wishlist' || e.target.closest('[data-stop]')) return;
    const pr = e.target.closest('[data-filter-prio]');
    if (pr) {
      wui.prio = +pr.dataset.filterPrio;
      $$('[data-filter-prio]').forEach((b) => b.classList.toggle('on', b === pr));
      return renderWishGrid();
    }
    const card = e.target.closest('.wish-card');
    if (!card) return;
    const c = store.getCommander(card.dataset.id);
    if (!c) return;
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'wish-played') {
      store.patchCommander(c.id, { status: 'active' });
      return toast(`${c.name} pasa a tu colección`, {
        icon: '✦',
        undo: () => store.patchCommander(c.id, { status: 'wishlist' }),
      });
    }
    if (action === 'wish-delete') {
      const undo = store.removeCommander(c.id);
      return toast(`${c.name} quitado de Por jugar`, { undo });
    }
    openCommanderForm(c);
  });
  view.addEventListener('keydown', (e) => {
    if (view.dataset.route === 'wishlist' && e.key === 'Enter' && e.target.classList?.contains('wish-card')) {
      openCommanderForm(store.getCommander(e.target.dataset.id));
    }
  });
}

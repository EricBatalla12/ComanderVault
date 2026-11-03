// Piezas de interfaz compartidas: toasts, modales, confirmaciones y componentes

import { esc, $ } from './utils.js';
import { pips, identityGradient } from './mana.js';
import { record } from './store.js';

// ---------- Navegación ----------
export const navigate = (hash) => {
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = hash;
};

// ---------- Toasts ----------
export function toast(message, { undo, icon = '', tone = '' } = {}) {
  const host = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast ${tone}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `${icon ? `<span class="toast-icon">${icon}</span>` : ''}<span class="toast-msg">${esc(message)}</span>
    ${undo ? '<button class="toast-undo" type="button">Deshacer</button>' : ''}`;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const close = () => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  };
  const t = setTimeout(close, undo ? 5500 : 2800);
  el.querySelector('.toast-undo')?.addEventListener('click', () => {
    clearTimeout(t);
    undo();
    close();
  });
  while (host.children.length > 3) host.firstElementChild.remove();
}

// ---------- Modal ----------
let onModalClose = null;

export function openModal(html, { onClose, wide = false } = {}) {
  const dlg = $('#modal');
  dlg.className = `modal ${wide ? 'wide' : ''}`;
  dlg.innerHTML = `<div class="modal-inner">${html}</div>`;
  onModalClose = onClose || null;
  if (!dlg.open) dlg.showModal();
  dlg.querySelector('[autofocus]')?.focus();
  return dlg;
}

export function closeModal() {
  const dlg = $('#modal');
  if (!dlg.open) return;
  dlg.classList.add('closing');
  setTimeout(() => {
    dlg.close();
    dlg.classList.remove('closing');
    dlg.innerHTML = '';
    const cb = onModalClose;
    onModalClose = null;
    cb?.();
  }, 160);
}

export function initModal() {
  const dlg = $('#modal');
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeModal();
  });
  dlg.addEventListener('mousedown', (e) => {
    if (e.target === dlg) closeModal();
  });
  dlg.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) closeModal();
  });
}

export function confirmDialog({ title, message, confirm = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    let result = false;
    const dlg = openModal(
      `<div class="modal-head"><h2>${esc(title)}</h2></div>
       <div class="modal-body"><p class="muted">${esc(message)}</p></div>
       <div class="modal-foot">
         <button class="btn btn-ghost" data-close type="button">Cancelar</button>
         <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok type="button" autofocus>${esc(confirm)}</button>
       </div>`,
      { onClose: () => resolve(result) }
    );
    dlg.querySelector('[data-ok]').addEventListener('click', () => {
      result = true;
      closeModal();
    });
  });
}

// ---------- Iconos (trazos estilo Lucide) ----------
const I = (d, extra = '') =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

export const icons = {
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  search: I('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  back: I('<path d="m15 18-6-6 6-6"/>'),
  edit: I('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  trash: I('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
  heart: I('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z"/>'),
  link: I('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
  external: I('<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  trophy: I('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
  skull: I('<path d="M12 3a8 8 0 0 0-5 14.2V20h10v-2.8A8 8 0 0 0 12 3Z"/><circle cx="9" cy="11" r="1.4"/><circle cx="15" cy="11" r="1.4"/><path d="M10 20v-2M14 20v-2"/>'),
  minus: I('<path d="M5 12h14"/>'),
  grid: I('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  list: I('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  chart: I('<path d="M3 3v18h18"/><path d="M7 15v2M12 10v7M17 6v11"/>'),
  settings: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>'),
  vault: I('<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="12" cy="12" r="3.5"/><path d="M12 8.5V7M12 17v-1.5M15.5 12H17M7 12h1.5M7 20v1.5M17 20v1.5"/>'),
  download: I('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
  upload: I('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>'),
  sparkles: I('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/>'),
  x: I('<path d="M18 6 6 18M6 6l12 12"/>'),
  calendar: I('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>'),
  users: I('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
  clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  flame: I('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.3.4 1.4 1.3 2.8 2.5 2.8Z"/>'),
  star: I('<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9Z"/>'),
  install: I('<rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M12 7v7M9 11l3 3 3-3M10 18h4"/>'),
  sun: I('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: I('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>'),
  monitor: I('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'),
  copy: I('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
};

// ---------- Componentes ----------

/** Estrellas de solo lectura; rating en escala 0–10 (medias estrellas). */
export const starsView = (rating = 0, size = 16) =>
  `<span class="stars" style="--v:${rating * 10}%;--s:${size}px" role="img" aria-label="${rating / 2} de 5 estrellas">
     <span class="stars-base">★★★★★</span><span class="stars-fill">★★★★★</span></span>`;

/** Control de estrellas editable (clic, toque o flechas). */
export const starsInput = (value = 0, name = 'rating') =>
  `<div class="star-input" role="slider" tabindex="0" data-star-input="${name}" aria-label="Valoración"
        aria-valuemin="0" aria-valuemax="10" aria-valuenow="${value}" aria-valuetext="${value / 2} estrellas" data-value="${value}">
     ${starsView(value, 34)}
     <span class="star-input-label">${value ? (value / 2).toLocaleString('es-ES') : '–'}<small>/5</small></span>
   </div>`;

export function bindStarInputs(root, onChange) {
  root.querySelectorAll('[data-star-input]').forEach((el) => {
    const stars = el.querySelector('.stars');
    const set = (v, preview = false) => {
      stars.style.setProperty('--v', `${v * 10}%`);
      el.querySelector('.star-input-label').innerHTML = `${v ? (v / 2).toLocaleString('es-ES') : '–'}<small>/5</small>`;
      if (!preview) {
        el.dataset.value = v;
        el.setAttribute('aria-valuenow', v);
        el.setAttribute('aria-valuetext', `${v / 2} estrellas`);
        onChange?.(v, el.dataset.starInput);
      }
    };
    const valFromX = (x) => {
      const r = stars.getBoundingClientRect();
      return Math.max(1, Math.min(10, Math.ceil(((x - r.left) / r.width) * 10)));
    };
    stars.addEventListener('pointermove', (e) => e.pointerType === 'mouse' && set(valFromX(e.clientX), true));
    stars.addEventListener('pointerleave', () => set(+el.dataset.value, true));
    stars.addEventListener('click', (e) => {
      const v = valFromX(e.clientX);
      set(v === +el.dataset.value ? 0 : v);
    });
    el.addEventListener('keydown', (e) => {
      const cur = +el.dataset.value;
      if (['ArrowRight', 'ArrowUp'].includes(e.key)) set(Math.min(10, cur + 1));
      else if (['ArrowLeft', 'ArrowDown'].includes(e.key)) set(Math.max(0, cur - 1));
      else if (e.key === 'Home') set(0);
      else if (e.key === 'End') set(10);
      else return;
      e.preventDefault();
    });
  });
}

/** Anillo de porcentaje (stat tile). */
export const ring = (value = 0, { size = 96, stroke = 9, label = '', sub = '' } = {}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return `<div class="ring" style="--size:${size}px">
    <svg viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-track" stroke-width="${stroke}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fill" stroke-width="${stroke}"
        stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - value)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    </svg>
    <div class="ring-label"><strong>${label}</strong>${sub ? `<small>${sub}</small>` : ''}</div>
  </div>`;
};

export const artFor = (c) => c.customImage || c.art;

/** Capa de arte: muestra arte (o dos si hay compañero) sobre un degradado de identidad. */
export const artLayer = (c, cls = 'art') => {
  const main = artFor(c);
  const partner = c.partner?.art;
  const img = (src, extra = '') =>
    src
      ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" ${extra} onerror="this.remove()">`
      : '';
  return `<div class="${cls} ${partner && !c.customImage ? 'split' : ''}" style="background:${identityGradient(c.colors)}">
    ${img(main)}${partner && !c.customImage ? img(partner, 'class="partner-art"') : ''}
  </div>`;
};

export const STATUS = {
  active: { label: 'En uso', cls: 'st-active' },
  building: { label: 'En construcción', cls: 'st-building' },
  retired: { label: 'Retirado', cls: 'st-retired' },
};

export const BRACKETS = {
  1: 'Exhibition',
  2: 'Core',
  3: 'Upgraded',
  4: 'Optimized',
  5: 'cEDH',
};

export const fullName = (c) => (c.partner?.name ? `${c.name} & ${c.partner.name}` : c.name);

/** Tarjeta de la colección. */
export function commanderCard(c) {
  const r = record(c);
  const wr = r.total ? Math.round(r.winrate * 100) : null;
  return `<article class="cmd-card" data-id="${c.id}" tabindex="0" aria-label="${esc(fullName(c))}">
    ${artLayer(c)}
    <div class="cmd-shade"></div>
    <div class="cmd-top">
      ${pips(c.colors, 20)}
      <button class="fav-btn ${c.favorite ? 'on' : ''}" data-action="fav" aria-pressed="${c.favorite}" aria-label="Favorito" type="button">${icons.heart}</button>
    </div>
    <div class="cmd-body">
      <div class="cmd-badges">
        ${c.status !== 'active' ? `<span class="badge ${STATUS[c.status].cls}">${STATUS[c.status].label}</span>` : ''}
        ${c.bracket ? `<span class="badge badge-bracket" title="Bracket ${c.bracket}: ${BRACKETS[c.bracket]}">B${c.bracket}</span>` : ''}
      </div>
      <h3 class="cmd-name">${esc(c.name)}${c.partner?.name ? `<span class="cmd-partner">& ${esc(c.partner.name)}</span>` : ''}</h3>
      <div class="cmd-rating">${starsView(c.rating, 15)}${c.rating ? `<span>${(c.rating / 2).toLocaleString('es-ES')}</span>` : '<span class="muted">Sin puntuar</span>'}</div>
      <div class="cmd-record">
        <div class="rec-nums">
          <span class="w">${r.wins}<small>V</small></span>
          <span class="l">${r.losses}<small>D</small></span>
          ${r.draws ? `<span class="d">${r.draws}<small>E</small></span>` : ''}
          <span class="wr">${wr === null ? '—' : wr + '%'}</span>
        </div>
        <div class="wr-bar" title="${r.wins} victorias de ${r.total} partidas"><span style="width:${wr ?? 0}%"></span></div>
      </div>
      <div class="cmd-quick">
        <button class="quick quick-w" data-action="quick-win" type="button" aria-label="Registrar victoria">${icons.trophy}<span>Victoria</span></button>
        <button class="quick quick-l" data-action="quick-loss" type="button" aria-label="Registrar derrota">${icons.skull}<span>Derrota</span></button>
      </div>
    </div>
  </article>`;
}

// Vistas principales: colección, detalle, estadísticas y ajustes

import { esc, $, $$, fmtDate, relDate, pct, siteOf, download, todayISO, isSafeUrl } from './utils.js';
import { COLORS, COLOR_INFO, pip, pips, comboName } from './mana.js';
import * as store from './store.js';
import {
  icons, starsView, starsInput, bindStarInputs, ring, artLayer, commanderCard, toast, confirmDialog,
  navigate, STATUS, BRACKETS, fullName, artFor,
} from './ui.js';
import { openCommanderForm, openGameForm } from './forms.js';
import { demoCommanders } from './demo.js';
import * as cloud from './cloud.js';
import { celebrate, vibrate, countUp, rarity } from './fx.js';
import { computeAchievements, computeRivals } from './achievements.js';

const ui = { q: '', colors: new Set(), status: 'all', fav: false };

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const RESULT = {
  win: { label: 'Victoria', short: 'V', cls: 'r-win' },
  loss: { label: 'Derrota', short: 'D', cls: 'r-loss' },
  draw: { label: 'Empate', short: 'E', cls: 'r-draw' },
};

// ------------------------------------------------------------------
// Acciones compartidas
// ------------------------------------------------------------------

export function quickGame(id, result, origin) {
  const c = store.getCommander(id);
  const at = origin?.getBoundingClientRect?.(); // medir antes de que la lista se reordene
  const g = store.addGame(id, { result });
  if (result === 'win') celebrate(at, c.colors);
  else vibrate(30);
  const st = store.record(store.getCommander(id)).streak;
  const streakMsg = result === 'win' && st?.type === 'win' && st.n >= 3 ? ` · ¡Racha de ${st.n}! 🔥` : '';
  toast(`${RESULT[result].label} con ${c.name}${streakMsg}`, {
    icon: result === 'win' ? '🏆' : '💀',
    undo: () => store.removeGame(id, g.id),
  });
}

function toggleFav(id) {
  const c = store.getCommander(id);
  store.patchCommander(id, { favorite: !c.favorite });
}

async function deleteCommander(id) {
  const c = store.getCommander(id);
  const ok = await confirmDialog({
    title: '¿Eliminar comandante?',
    message: `Se borrará ${c.name} junto con ${c.games.length === 1 ? 'su partida registrada' : `sus ${c.games.length} partidas registradas`}.`,
    confirm: 'Eliminar',
    danger: true,
  });
  if (!ok) return;
  const undo = store.removeCommander(id);
  navigate('#/');
  toast(`${c.name} eliminado`, { undo });
}

// ------------------------------------------------------------------
// Colección
// ------------------------------------------------------------------

const SORTS = {
  recent: { label: 'Actividad reciente', fn: (a, b) => lastActivity(b).localeCompare(lastActivity(a)) },
  rating: { label: 'Valoración', fn: (a, b) => b.rating - a.rating || byName(a, b) },
  winrate: { label: 'Winrate', fn: (a, b) => cmpWinrate(a, b) },
  games: { label: 'Partidas jugadas', fn: (a, b) => store.record(b).total - store.record(a).total || byName(a, b) },
  name: { label: 'Nombre (A–Z)', fn: (a, b) => byName(a, b) },
};
const byName = (a, b) => a.name.localeCompare(b.name, 'es');
const lastActivity = (c) => store.record(c).lastPlayed || c.updatedAt.slice(0, 10);
const cmpWinrate = (a, b) => {
  const ra = store.record(a), rb = store.record(b);
  return (rb.total ? rb.winrate : -1) - (ra.total ? ra.winrate : -1) || rb.total - ra.total;
};

function filtered() {
  const { settings } = store.getState();
  const q = ui.q.trim().toLowerCase();
  return store.played()
    .filter((c) => {
      if (ui.fav && !c.favorite) return false;
      if (ui.status !== 'all' && c.status !== ui.status) return false;
      if (ui.colors.has('C')) {
        if (c.colors.length) return false;
      } else if ([...ui.colors].some((col) => !c.colors.includes(col))) return false;
      if (q) {
        const hay = [c.name, c.partner?.name, c.typeLine, comboName(c.colors), ...c.tags, c.notes].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort(SORTS[settings.sort]?.fn || SORTS.recent.fn);
}

function summary() {
  const cs = store.played();
  let w = 0, t = 0;
  cs.forEach((c) => {
    const r = store.record(c);
    w += r.wins;
    t += r.total;
  });
  return { count: cs.length, games: t, wins: w, wr: t ? w / t : 0 };
}

export function renderCollection(view) {
  const { settings } = store.getState();
  if (!store.played().length) {
    view.innerHTML = `<section class="empty fade-in">
      <div class="empty-art">${['W', 'U', 'B', 'R', 'G'].map((c, i) => `<span style="--i:${i}">${pip(c, 44)}</span>`).join('')}</div>
      <h1>Tu bóveda está vacía</h1>
      <p class="muted">Añade los comandantes que has jugado, puntúalos, guarda los enlaces a sus listas y lleva la cuenta de tus victorias.</p>
      <div class="empty-actions">
        <button class="btn btn-primary btn-lg" data-action="new" type="button">${icons.plus} Añadir comandante</button>
        <button class="btn btn-ghost btn-lg" data-action="demo" type="button">${icons.sparkles} Cargar ejemplos</button>
      </div>
    </section>`;
    return;
  }
  const s = summary();
  view.innerHTML = `<section class="fade-in">
    <header class="page-head">
      <div>
        <p class="eyebrow">Tu bóveda</p>
        <h1>Colección</h1>
      </div>
      <div class="head-actions">
        <div class="head-stats">
          <div><strong>${s.count}</strong><span>comandantes</span></div>
          <div><strong>${s.games}</strong><span>partidas</span></div>
          <div><strong>${s.games ? pct(s.wr) : '—'}</strong><span>winrate</span></div>
        </div>
        ${s.count >= 2 ? `<button class="btn btn-ghost roulette-btn" data-action="roulette" type="button" title="Elegir comandante al azar">${icons.dice}<span>¿A qué juego?</span></button>` : ''}
      </div>
    </header>

    <div class="toolbar">
      <div class="search-box grow">${icons.search}
        <input id="q" type="search" placeholder="Buscar por nombre, etiqueta, gremio…" value="${esc(ui.q)}" aria-label="Buscar"></div>
      <div class="filter-colors" role="group" aria-label="Filtrar por color">
        ${[...COLORS, 'C'].map((c) => `<button type="button" class="color-filter ${ui.colors.has(c) ? 'on' : ''}" data-filter-color="${c}" aria-pressed="${ui.colors.has(c)}" title="${COLOR_INFO[c].name}">${pip(c, 24)}</button>`).join('')}
      </div>
      <div class="toolbar-row">
        <div class="seg" role="group" aria-label="Estado">
          ${[['all', 'Todos'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([k, l]) => `<button type="button" class="${ui.status === k ? 'on' : ''}" data-filter-status="${k}">${l}</button>`).join('')}
        </div>
        <button type="button" class="chip fav-filter ${ui.fav ? 'on' : ''}" data-action="filter-fav" aria-pressed="${ui.fav}">${icons.heart} Favoritos</button>
        <label class="sort"><span class="sr-only">Ordenar</span>
          <select id="sort">${Object.entries(SORTS).map(([k, s]) => `<option value="${k}" ${settings.sort === k ? 'selected' : ''}>${s.label}</option>`).join('')}</select></label>
      </div>
    </div>
    <div id="grid"></div>
  </section>`;
  renderGrid();
}

function renderGrid() {
  const grid = $('#grid');
  if (!grid) return;
  const list = filtered();
  grid.className = 'cmd-grid';
  grid.innerHTML = list.length
    ? list.map(commanderCard).join('')
    : `<div class="no-results"><p>Ningún comandante coincide con los filtros.</p>
        <button class="btn btn-ghost" data-action="clear-filters" type="button">Limpiar filtros</button></div>`;
}

export function bindCollection(view) {
  view.addEventListener('input', (e) => {
    if (e.target.id === 'q') {
      ui.q = e.target.value;
      renderGrid();
    }
  });
  view.addEventListener('change', (e) => {
    if (e.target.id === 'sort') store.setSetting('sort', e.target.value);
  });
  view.addEventListener('click', (e) => {
    if (view.dataset.route !== 'collection') return;
    const t = e.target;
    const colorBtn = t.closest('[data-filter-color]');
    if (colorBtn) {
      const c = colorBtn.dataset.filterColor;
      if (c === 'C') {
        const on = ui.colors.has('C');
        ui.colors.clear();
        if (!on) ui.colors.add('C');
      } else {
        ui.colors.delete('C');
        ui.colors.has(c) ? ui.colors.delete(c) : ui.colors.add(c);
      }
      $$('[data-filter-color]').forEach((b) => {
        b.classList.toggle('on', ui.colors.has(b.dataset.filterColor));
        b.setAttribute('aria-pressed', ui.colors.has(b.dataset.filterColor));
      });
      return renderGrid();
    }
    const st = t.closest('[data-filter-status]');
    if (st) {
      ui.status = st.dataset.filterStatus;
      $$('[data-filter-status]').forEach((b) => b.classList.toggle('on', b === st));
      return renderGrid();
    }
    const action = t.closest('[data-action]')?.dataset.action;
    const card = t.closest('.cmd-card');
    if (action === 'filter-fav') {
      ui.fav = !ui.fav;
      t.closest('[data-action]').classList.toggle('on', ui.fav);
      return renderGrid();
    }
    if (action === 'clear-filters') {
      Object.assign(ui, { q: '', status: 'all', fav: false });
      ui.colors.clear();
      return renderCollection(view);
    }
    if (action === 'demo') {
      store.replaceAll({ commanders: demoCommanders() }, 'merge');
      return toast('Ejemplos cargados', { icon: '✦' });
    }
    if (!card) return;
    const id = card.dataset.id;
    if (action === 'fav') return toggleFav(id);
    if (action === 'quick-win') return quickGame(id, 'win', t.closest('[data-action]'));
    if (action === 'quick-loss') return quickGame(id, 'loss');
    navigate(`#/c/${id}`);
  });
  view.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList?.contains('cmd-card')) navigate(`#/c/${e.target.dataset.id}`);
  });
}

// ------------------------------------------------------------------
// Detalle
// ------------------------------------------------------------------

export function renderDetail(view, id) {
  const c = store.getCommander(id);
  if (c?.status === 'wishlist') return navigate('#/wishlist');
  if (!c) {
    view.innerHTML = `<section class="empty"><h1>No encontrado</h1><p class="muted">Este comandante ya no existe.</p>
      <a class="btn btn-primary" href="#/">Volver a la colección</a></section>`;
    return;
  }
  const r = store.record(c);
  const games = store.sortedGames(c);
  const form = games.slice(0, 15).reverse();
  const linkById = Object.fromEntries(c.links.map((l) => [l.id, l]));
  const edhrec = c.edhrecUri && !c.links.some((l) => /edhrec/.test(l.url)) ? c.edhrecUri : '';
  const bigImage = c.customImage || c.image;

  view.innerHTML = `<article class="detail fade-in" data-id="${c.id}">
    <header class="hero">
      <div class="hero-bg">${artLayer(c, 'hero-art')}</div>
      <div class="hero-inner">
        <a href="#/" class="icon-btn hero-back" aria-label="Volver">${icons.back}</a>
        <div class="hero-card rar-${rarity(c.rating).key}">
          <div class="holo"></div>
          ${bigImage ? `<img src="${esc(bigImage)}" alt="${esc(c.name)}" referrerpolicy="no-referrer" onerror="this.parentElement.classList.add('noimg');this.remove()">` : ''}
          ${c.partner?.image ? `<img class="hero-card-partner" src="${esc(c.partner.image)}" alt="${esc(c.partner.name)}" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
        </div>
        <div class="hero-text">
          <div class="hero-pips">${pips(c.colors, 26)}<span class="combo">${esc(comboName(c.colors))}</span></div>
          <h1>${esc(c.name)}${c.partner?.name ? `<span class="hero-partner">& ${esc(c.partner.name)}</span>` : ''}</h1>
          ${c.typeLine ? `<p class="hero-type">${esc(c.typeLine)}</p>` : ''}
          <div class="hero-badges">
            <span class="badge ${STATUS[c.status].cls}">${STATUS[c.status].label}</span>
            ${c.rating ? `<span class="badge rar-badge rar-${rarity(c.rating).key}">◆ ${rarity(c.rating).label}</span>` : ''}
            ${c.bracket ? `<span class="badge badge-bracket">Bracket ${c.bracket} · ${BRACKETS[c.bracket]}</span>` : ''}
            ${c.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}
          </div>
          <div class="hero-actions">
            <button class="btn btn-glass ${c.favorite ? 'fav-on' : ''}" data-action="fav" type="button" aria-pressed="${c.favorite}">${icons.heart}<span>${c.favorite ? 'Favorito' : 'Favorito'}</span></button>
            <button class="btn btn-glass" data-action="edit" type="button">${icons.edit}<span>Editar</span></button>
            <button class="btn btn-glass danger" data-action="delete" type="button" aria-label="Eliminar">${icons.trash}</button>
          </div>
        </div>
      </div>
    </header>

    <div class="detail-grid">
      <section class="panel record-panel">
        <h2 class="panel-title">${icons.trophy} Récord</h2>
        <div class="record-main">
          ${ring(r.winrate, { size: 120, stroke: 10, label: r.total ? pct(r.winrate) : '—', sub: 'winrate' })}
          <div class="record-nums">
            <div class="rn w"><strong>${r.wins}</strong><span>Victorias</span></div>
            <div class="rn l"><strong>${r.losses}</strong><span>Derrotas</span></div>
            <div class="rn d"><strong>${r.draws}</strong><span>Empates</span></div>
          </div>
        </div>
        <div class="record-meta">
          ${r.streak && r.streak.n > 1 ? `<span class="meta-pill">${icons.flame} Racha: ${r.streak.n} ${r.streak.type === 'win' ? 'victorias' : r.streak.type === 'loss' ? 'derrotas' : 'empates'} seguidas</span>` : ''}
          ${r.lastPlayed ? `<span class="meta-pill">${icons.calendar} Última: ${relDate(r.lastPlayed)}</span>` : ''}
          ${r.avgTurns ? `<span class="meta-pill">${icons.clock} Gana en T${r.avgTurns.toFixed(1)}</span>` : ''}
          ${c.prevWins + c.prevLosses + c.prevDraws ? `<span class="meta-pill muted">Incluye ${c.prevWins + c.prevLosses + c.prevDraws} previas</span>` : ''}
        </div>
        ${form.length ? `<div class="form-strip" aria-label="Últimos resultados">${form.map((g) => `<span class="fs ${RESULT[g.result].cls}" title="${RESULT[g.result].label} · ${fmtDate(g.date)}">${RESULT[g.result].short}</span>`).join('')}</div>` : ''}
        <div class="record-actions">
          <button class="btn btn-win" data-action="quick-win" type="button">${icons.trophy} Victoria</button>
          <button class="btn btn-loss" data-action="quick-loss" type="button">${icons.skull} Derrota</button>
          <button class="btn btn-ghost" data-action="log-game" type="button">${icons.plus} Detallada</button>
        </div>
      </section>

      <section class="panel rating-panel">
        <h2 class="panel-title">${icons.star} Valoración</h2>
        ${starsInput(c.rating, 'rating')}
        <div class="sub-bars">
          ${[['fun', 'Diversión'], ['power', 'Potencia'], ['consistency', 'Consistencia']]
            .map(([k, l]) => `<div class="sub-bar"><span>${l}</span><div class="bar-track"><span style="width:${c.sub[k] * 10}%"></span></div><b>${c.sub[k] || '–'}</b></div>`)
            .join('')}
        </div>
      </section>

      <section class="panel links-panel">
        <div class="panel-head"><h2 class="panel-title">${icons.link} Mazos</h2>
          <button class="btn btn-small btn-ghost" data-action="edit" type="button">${icons.edit} Gestionar</button></div>
        ${c.links.length || edhrec || c.scryfallUri ? `<ul class="links">
          ${c.links.map((l) => linkItem(l.url, l.label)).join('')}
          ${edhrec ? linkItem(edhrec, 'Página en EDHREC', true) : ''}
          ${c.scryfallUri ? linkItem(c.scryfallUri, 'Carta en Scryfall', true) : ''}
        </ul>` : `<p class="muted small">Aún no hay enlaces. Añade tu lista de Moxfield, Archidekt…</p>`}
      </section>

      ${c.notes ? `<section class="panel notes-panel"><h2 class="panel-title">${icons.edit} Notas</h2><p class="notes">${esc(c.notes)}</p></section>` : ''}

      <section class="panel games-panel">
        <div class="panel-head"><h2 class="panel-title">${icons.calendar} Partidas <span class="count">${games.length}</span></h2>
          <button class="btn btn-small btn-primary" data-action="log-game" type="button">${icons.plus} Registrar</button></div>
        ${games.length ? `<ul class="games">${games.map((g) => `
          <li class="game" data-game="${g.id}">
            <span class="game-result ${RESULT[g.result].cls}">${RESULT[g.result].short}</span>
            <div class="game-main">
              <div class="game-line"><strong>${RESULT[g.result].label}</strong>
                <span class="muted small">${relDate(g.date)}</span></div>
              <div class="game-meta muted small">
                <span>${icons.users} ${g.players}J</span>
                ${g.turns ? `<span>${icons.clock} T${g.turns}</span>` : ''}
                ${g.linkId && linkById[g.linkId] ? `<span>${icons.link} ${esc(linkById[g.linkId].label || siteOf(linkById[g.linkId].url).name)}</span>` : ''}
                ${g.opponents ? `<span class="opp">vs ${esc(g.opponents)}</span>` : ''}
              </div>
              ${g.notes ? `<p class="game-notes">${esc(g.notes)}</p>` : ''}
            </div>
            <div class="game-actions">
              <button class="icon-btn" data-action="edit-game" type="button" aria-label="Editar partida">${icons.edit}</button>
              <button class="icon-btn" data-action="delete-game" type="button" aria-label="Borrar partida">${icons.trash}</button>
            </div>
          </li>`).join('')}</ul>`
          : `<div class="games-empty"><p class="muted">Todavía no has registrado partidas con este comandante.</p></div>`}
      </section>
    </div>
  </article>`;

  bindStarInputs(view, (v) => store.patchCommander(id, { rating: v }));
}

const linkItem = (url, label, subtle = false) => {
  if (!isSafeUrl(url)) return '';
  const s = siteOf(url);
  let path = '';
  try {
    const u = new URL(url);
    path = (u.hostname.replace(/^www\./, '') + u.pathname).replace(/\/$/, '');
  } catch {}
  return `<li><a class="link-card ${subtle ? 'subtle' : ''}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
    <span class="site-badge" style="--site:${s.color}">${esc(s.short)}</span>
    <span class="link-text"><strong>${esc(label || s.name)}</strong><small>${esc(path)}</small></span>
    ${icons.external}</a></li>`;
};

export function bindDetail(view) {
  view.addEventListener('click', (e) => {
    const detail = e.target.closest('.detail');
    if (!detail || view.dataset.route !== 'detail') return;
    const id = detail.dataset.id;
    const action = e.target.closest('[data-action]')?.dataset.action;
    const c = store.getCommander(id);
    if (!action || !c) return;
    const gameId = e.target.closest('[data-game]')?.dataset.game;
    switch (action) {
      case 'fav': return toggleFav(id);
      case 'edit': return openCommanderForm(c);
      case 'delete': return deleteCommander(id);
      case 'quick-win': return quickGame(id, 'win', e.target.closest('[data-action]'));
      case 'quick-loss': return quickGame(id, 'loss');
      case 'log-game': return openGameForm(c);
      case 'edit-game': return openGameForm(c, c.games.find((g) => g.id === gameId));
      case 'delete-game': {
        const undo = store.removeGame(id, gameId);
        return toast('Partida borrada', { undo });
      }
    }
  });
}

// ------------------------------------------------------------------
// Estadísticas
// ------------------------------------------------------------------

export function renderStats(view) {
  const { settings } = store.getState();
  const commanders = store.played();
  const min = settings.minGames;
  if (!commanders.length) {
    view.innerHTML = `<section class="empty fade-in"><h1>Sin datos todavía</h1>
      <p class="muted">Añade comandantes y registra partidas para ver tus estadísticas.</p>
      <button class="btn btn-primary" data-action="new" type="button">${icons.plus} Añadir comandante</button></section>`;
    return;
  }
  const rows = commanders.map((c) => ({ c, r: store.record(c) }));
  const s = summary();
  const rated = commanders.filter((c) => c.rating);
  const avgRating = rated.length ? rated.reduce((a, c) => a + c.rating, 0) / rated.length : 0;

  // Rendimiento por color
  const byColor = [...COLORS, 'C'].map((col) => {
    let w = 0, t = 0, n = 0;
    rows.forEach(({ c, r }) => {
      const match = col === 'C' ? !c.colors.length : c.colors.includes(col);
      if (!match) return;
      n++;
      w += r.wins;
      t += r.total;
    });
    return { col, w, t, n, wr: t ? w / t : 0 };
  }).filter((x) => x.n);

  // Actividad últimos 12 meses (solo partidas registradas con fecha)
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''), year: d.getFullYear(), t: 0, w: 0 };
  });
  const mIdx = Object.fromEntries(months.map((m, i) => [m.key, i]));
  const allGames = [];
  commanders.forEach((c) => c.games.forEach((g) => {
    allGames.push({ g, c });
    const i = mIdx[g.date.slice(0, 7)];
    if (i !== undefined) {
      months[i].t++;
      if (g.result === 'win') months[i].w++;
    }
  }));
  const maxM = Math.max(1, ...months.map((m) => m.t));
  allGames.sort((a, b) => b.g.date.localeCompare(a.g.date) || b.g.createdAt.localeCompare(a.g.createdAt));

  // Rankings
  const topRated = [...rated].sort((a, b) => b.rating - a.rating).slice(0, 5);
  const topWr = rows.filter(({ r }) => r.total >= min).sort((a, b) => b.r.winrate - a.r.winrate || b.r.total - a.r.total).slice(0, 5);
  const mostPlayed = rows.filter(({ r }) => r.total).sort((a, b) => b.r.total - a.r.total).slice(0, 5);

  // Rachas y otros datos
  const bestStreak = rows.filter(({ r }) => r.streak?.type === 'win').sort((a, b) => b.r.streak.n - a.r.streak.n)[0];
  const pods = allGames.map(({ g }) => g.players);
  const avgPod = pods.length ? pods.reduce((a, b) => a + b, 0) / pods.length : 0;
  const expected = pods.length ? pods.reduce((a, p) => a + 1 / p, 0) / pods.length : 0;
  const loggedWins = allGames.filter(({ g }) => g.result === 'win').length;
  const loggedWr = allGames.length ? loggedWins / allGames.length : 0;

  const rankItem = (c, value, sub = '') => `<li><a href="#/c/${c.id}" class="rank-item">
      <span class="rank-thumb">${artLayer(c, 'thumb-art')}</span>
      <span class="rank-text"><strong>${esc(fullName(c))}</strong><small>${sub}</small></span>
      <span class="rank-value">${value}</span></a></li>`;

  view.innerHTML = `<section class="fade-in stats">
    <header class="page-head"><div><p class="eyebrow">Tu rendimiento</p><h1>Estadísticas</h1></div></header>

    <div class="kpis">
      <div class="kpi kpi-ring">${ring(s.wr, { size: 104, stroke: 10, label: s.games ? pct(s.wr) : '—', sub: 'winrate' })}
        <div><strong data-count="${s.wins}">${s.wins}</strong><span>${s.wins === 1 ? 'victoria' : 'victorias'} de ${s.games}</span></div></div>
      <div class="kpi"><span class="kpi-icon">${icons.vault}</span><strong data-count="${s.count}">${s.count}</strong><span>Comandantes</span></div>
      <div class="kpi"><span class="kpi-icon">${icons.calendar}</span><strong data-count="${s.games}">${s.games}</strong><span>Partidas</span></div>
      <div class="kpi"><span class="kpi-icon">${icons.star}</span><strong ${avgRating ? `data-count="${(avgRating / 2).toFixed(1)}" data-dec="1"` : ''}>${avgRating ? (avgRating / 2).toLocaleString('es-ES', { maximumFractionDigits: 1 }) : '—'}</strong><span>Valoración media</span></div>
      <div class="kpi"><span class="kpi-icon">${icons.flame}</span><strong>${bestStreak ? bestStreak.r.streak.n : '—'}</strong><span>${bestStreak ? `Racha actual · ${esc(bestStreak.c.name)}` : 'Racha de victorias'}</span></div>
    </div>

    <div class="stats-grid">
      <section class="panel">
        <h2 class="panel-title">${icons.chart} Actividad <small class="muted">últimos 12 meses</small></h2>
        ${allGames.length ? `<div class="month-chart" role="img" aria-label="Partidas por mes">
          ${months.map((m) => `<div class="mc-col" tabindex="0" data-tip="${m.label} ${m.year}: ${plural(m.t, 'partida')} · ${plural(m.w, 'victoria')}">
            <span class="mc-val">${m.t || ''}</span>
            <div class="mc-bar-wrap"><div class="mc-bar" style="height:${(m.t / maxM) * 100}%"></div></div>
            <span class="mc-label">${m.label}</span></div>`).join('')}
        </div>` : `<p class="muted small">Registra partidas para ver tu actividad.</p>`}
      </section>

      <section class="panel">
        <h2 class="panel-title">${icons.sparkles} Winrate por color</h2>
        <ul class="color-bars">
          ${byColor.map((x) => `<li class="cb" tabindex="0" data-tip="${COLOR_INFO[x.col].name}: ${x.w}/${plural(x.t, 'partida')} ganadas · ${plural(x.n, 'comandante')}">
            ${pip(x.col, 22)}
            <div class="bar-track"><span style="width:${x.t ? x.wr * 100 : 0}%;background:${COLOR_INFO[x.col].hex}"></span></div>
            <b>${x.t ? pct(x.wr) : '—'}</b><small class="muted">${x.t}p</small></li>`).join('')}
        </ul>
        ${allGames.length ? `<p class="hint">Mesa media de ${avgPod.toLocaleString('es-ES', { maximumFractionDigits: 1 })} jugadores: el winrate esperado por azar es ${pct(expected)}. El tuyo en partidas registradas es <strong>${pct(loggedWr)}</strong>.</p>` : ''}
      </section>

      <section class="panel">
        <h2 class="panel-title">${icons.star} Mejor valorados</h2>
        ${topRated.length ? `<ol class="rank">${topRated.map((c) => rankItem(c, starsView(c.rating, 13), esc(comboName(c.colors)))).join('')}</ol>` : '<p class="muted small">Aún no has puntuado ningún comandante.</p>'}
      </section>

      <section class="panel">
        <h2 class="panel-title">${icons.trophy} Mejor winrate <small class="muted">mín. ${min} partidas</small></h2>
        ${topWr.length ? `<ol class="rank">${topWr.map(({ c, r }) => rankItem(c, pct(r.winrate), `${r.wins}V · ${r.losses}D${r.draws ? ` · ${r.draws}E` : ''}`)).join('')}</ol>` : `<p class="muted small">Ningún comandante tiene ${min} partidas todavía.</p>`}
      </section>

      <section class="panel">
        <h2 class="panel-title">${icons.users} Más jugados</h2>
        ${mostPlayed.length ? `<ol class="rank">${mostPlayed.map(({ c, r }) => rankItem(c, `${r.total}`, `${pct(r.winrate)} winrate`)).join('')}</ol>` : '<p class="muted small">Sin partidas registradas.</p>'}
      </section>

      <section class="panel">
        <h2 class="panel-title">${icons.clock} Últimas partidas</h2>
        ${allGames.length ? `<ul class="recent">${allGames.slice(0, 8).map(({ g, c }) => `<li><a href="#/c/${c.id}">
          <span class="game-result ${RESULT[g.result].cls}">${RESULT[g.result].short}</span>
          <span class="recent-text"><strong>${esc(c.name)}</strong><small>${relDate(g.date)}${g.opponents ? ` · vs ${esc(g.opponents)}` : ''}</small></span></a></li>`).join('')}</ul>` : '<p class="muted small">Sin partidas registradas.</p>'}
      </section>

      ${rivalsPanel(commanders)}
    </div>

    ${achievementsPanel(commanders)}
  </section>`;
  countUp(view);
}

function rivalsPanel(played) {
  const { top, nemesis, favorite } = computeRivals(played);
  return `<section class="panel rivals-panel">
    <h2 class="panel-title">${icons.swords} Rivales</h2>
    ${top.length ? `<div class="rivals-body">
      ${nemesis || favorite ? `<div class="rival-highlights">
        ${nemesis ? `<div class="rival-hl nemesis"><span>😈</span><div><small>Tu bestia negra</small><strong>${esc(nemesis.name)}</strong><small>${pct(nemesis.wr)} de victorias en ${plural(nemesis.games, 'partida')}</small></div></div>` : ''}
        ${favorite ? `<div class="rival-hl victim"><span>😎</span><div><small>Tu víctima favorita</small><strong>${esc(favorite.name)}</strong><small>${pct(favorite.wr)} de victorias en ${plural(favorite.games, 'partida')}</small></div></div>` : ''}
      </div>` : ''}
      <ul class="rival-list">${top.map((r) => `<li class="rival" tabindex="0" data-tip="${plural(r.wins, 'victoria')} en ${plural(r.games, 'partida')} contra ${esc(r.name)}">
        <span class="rival-name">${esc(r.name)}</span>
        <div class="bar-track"><span style="width:${r.wr * 100}%"></span></div>
        <b>${pct(r.wr)}</b><small class="muted">${r.games}p</small></li>`).join('')}</ul>
      </div>
      <p class="hint">Winrate contra cada comandante rival, según el campo «Rivales» de tus partidas.</p>`
    : '<p class="muted small">Apunta los rivales al registrar partidas (separados por comas) y aquí verás contra quién ganas y contra quién sufres.</p>'}
  </section>`;
}

function achievementsPanel(played) {
  const list = computeAchievements(played);
  const done = list.filter((a) => a.done).length;
  return `<section class="panel achievements">
    <div class="panel-head"><h2 class="panel-title">${icons.medal} Logros</h2>
      <span class="ach-count"><b>${done}</b>/${list.length}</span></div>
    <div class="ach-progress"><span style="width:${(done / list.length) * 100}%"></span></div>
    <ul class="ach-grid">${list.map((a) => `<li class="ach ${a.done ? 'done' : ''}" title="${esc(a.desc)}">
      <span class="ach-medal">${a.icon}</span>
      <div class="ach-text"><strong>${esc(a.name)}</strong><small>${esc(a.desc)}</small>
        ${a.done ? '' : `<div class="ach-bar"><span style="width:${(a.cur / a.goal) * 100}%"></span></div><small class="ach-num">${a.cur}/${a.goal}</small>`}
      </div></li>`).join('')}</ul>
  </section>`;
}

// ------------------------------------------------------------------
// Ajustes
// ------------------------------------------------------------------

function installPanel(i) {
  if (!i || i.installed) return '';
  let body;
  if (i.canPrompt) {
    body = `<div class="setting"><div><strong>Instalar CommanderVault</strong>
        <p class="muted small">Tenla como una app más: con su icono, a pantalla completa y abriendo sin conexión.</p></div>
      <button class="btn btn-primary" data-action="install" type="button">${icons.download} Instalar app</button></div>`;
  } else if (i.ios) {
    body = `<strong>Instalar en iPhone / iPad</strong>
      <ol class="install-steps"><li>Abre esta web en <b>Safari</b>.</li>
        <li>Pulsa <b>Compartir</b> (el cuadrado con la flecha hacia arriba).</li>
        <li>Elige <b>Añadir a pantalla de inicio</b> → <b>Añadir</b>.</li></ol>`;
  } else if (i.android) {
    body = `<strong>Instalar en Android</strong>
      <p class="muted small">${i.brave ? 'Brave no instala la app de verdad: solo crea un acceso directo con su icono encima.' : 'Este navegador no permite instalar la app de verdad.'}
        Para tenerla como una app normal (sin el icono del navegador y en tu cajón de aplicaciones):</p>
      <ol class="install-steps"><li>Abre esta web en <b>Chrome</b>.</li>
        <li>Pulsa <b>Instalar app</b> (arriba) o menú <b>⋮</b> → <b>Instalar aplicación</b>.</li></ol>
      <p class="muted small">Después puedes seguir usando ${i.brave ? 'Brave' : 'tu navegador'} para todo lo demás.</p>
      <button class="btn btn-ghost btn-small" data-action="copy-link" type="button">${icons.copy} Copiar enlace</button>`;
  } else {
    body = `<strong>Instalar en el ordenador</strong>
      <p class="muted small">Ábrela en <b>Chrome</b> o <b>Edge</b> y pulsa el icono de instalar en la barra de direcciones (o menú → <b>Instalar CommanderVault</b>).</p>`;
  }
  return `<section class="panel install-panel"><h2 class="panel-title">${icons.download} App</h2>${body}</section>`;
}

export function renderSettings(view, { install } = {}) {
  const { settings } = store.getState();
  const played = store.played();
  const totalGames = played.reduce((a, c) => a + c.games.length, 0);
  const user = cloud.getUser();
  const isCloud = store.getMode() === 'cloud' && user;
  const initial = (user?.displayName || user?.email || '?').trim()[0].toUpperCase();
  view.innerHTML = `<section class="fade-in settings">
    <header class="page-head"><div><p class="eyebrow">Configuración</p><h1>Ajustes</h1></div></header>

    ${isCloud ? `<section class="panel account-panel">
      <h2 class="panel-title">Cuenta</h2>
      <div class="account">
        <span class="avatar avatar-lg">${user.photoURL ? `<img src="${esc(user.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc(initial)}</span>
        <div class="account-text"><strong>${esc(user.displayName || 'Jugador')}</strong><span class="muted small">${esc(user.email || '')}</span>
          <span class="sync-pill" data-sync></span></div>
        <button class="btn btn-ghost" data-action="sign-out" type="button">Cerrar sesión</button>
      </div>
      <div class="sync-error" data-sync-error hidden><span></span>
        <button class="btn btn-small btn-ghost" data-action="sync-retry" type="button">Reintentar</button></div>
    </section>` : `<section class="panel">
      <h2 class="panel-title">Cuenta</h2>
      <p class="muted small">Modo local: los datos se guardan solo en este dispositivo. Para iniciar sesión y tenerlos en todos tus dispositivos hay que configurar Firebase (instrucciones en el README del proyecto).</p>
    </section>`}

    ${installPanel(install)}

    <section class="panel">
      <h2 class="panel-title">Apariencia</h2>
      <div class="setting">
        <div><strong>Tema</strong><p class="muted small">Elige el aspecto de la app.</p></div>
        <div class="seg" role="group" aria-label="Tema">
          ${[['system', icons.monitor, 'Sistema'], ['dark', icons.moon, 'Oscuro'], ['light', icons.sun, 'Claro']]
            .map(([k, ic, l]) => `<button type="button" class="${settings.theme === k ? 'on' : ''}" data-theme-set="${k}">${ic}<span>${l}</span></button>`).join('')}
        </div>
      </div>
      <div class="setting">
        <div><strong>Mínimo de partidas en rankings</strong><p class="muted small">Para el ranking de mejor winrate.</p></div>
        <input type="number" id="min-games" min="1" max="50" value="${settings.minGames}" class="input-sm" inputmode="numeric">
      </div>
    </section>

    <section class="panel">
      <h2 class="panel-title">Datos</h2>
      <p class="muted small">${isCloud
        ? `Tus datos se guardan en tu cuenta y se sincronizan en todos los dispositivos donde inicies sesión (${played.length} comandantes, ${store.wishlist().length} por jugar, ${totalGames} partidas).`
        : `Tus datos se guardan solo en este dispositivo (${played.length} comandantes, ${totalGames} partidas).`} Puedes exportar una copia de seguridad cuando quieras.</p>
      <div class="setting-actions">
        <button class="btn btn-ghost" data-action="export" type="button">${icons.download} Exportar copia (.json)</button>
        <button class="btn btn-ghost" data-action="export-csv" type="button">${icons.download} Exportar partidas (.csv)</button>
        <label class="btn btn-ghost file-btn">${icons.upload} Importar copia<input type="file" id="import-file" accept="application/json,.json" hidden></label>
        <button class="btn btn-ghost" data-action="demo" type="button">${icons.sparkles} Añadir ejemplos</button>
      </div>
      <div class="danger-zone">
        <div><strong>Borrar todo</strong><p class="muted small">Elimina todos los comandantes, la lista «Por jugar» y las partidas${isCloud ? ' de tu cuenta (en todos tus dispositivos)' : ' de este dispositivo'}.</p></div>
        <button class="btn btn-danger" data-action="wipe" type="button">${icons.trash} Borrar</button>
      </div>
    </section>

    <p class="about muted small">CommanderVault · Datos de cartas e imágenes de <a href="https://scryfall.com" target="_blank" rel="noopener">Scryfall</a>.
      Magic: The Gathering es marca de Wizards of the Coast. App no oficial.</p>
  </section>`;
}

export function bindSettings(view, { applyTheme }) {
  view.addEventListener('click', async (e) => {
    if (view.dataset.route !== 'settings') return;
    const th = e.target.closest('[data-theme-set]');
    if (th) {
      store.setSetting('theme', th.dataset.themeSet);
      return applyTheme();
    }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'copy-link') {
      const link = location.href.split('#')[0];
      try {
        await navigator.clipboard.writeText(link);
        toast('Enlace copiado: pégalo en Chrome', { icon: '✦' });
      } catch {
        toast(link);
      }
      return;
    }
    if (action === 'sign-out') {
      const ok = await confirmDialog({ title: '¿Cerrar sesión?', message: 'Tus datos seguirán guardados en tu cuenta.', confirm: 'Cerrar sesión' });
      if (ok) cloud.signOut();
      return;
    }
    if (action === 'export') {
      download(`commandervault-${todayISO()}.json`, store.exportJSON());
      return toast('Copia exportada', { icon: '✦' });
    }
    if (action === 'export-csv') return exportCSV();
    if (action === 'demo') {
      store.replaceAll({ commanders: demoCommanders() }, 'merge');
      return toast('Ejemplos añadidos', { icon: '✦' });
    }
    if (action === 'wipe') {
      const ok = await confirmDialog({
        title: '¿Borrar todos los datos?',
        message: 'Esta acción no se puede deshacer. Te recomendamos exportar una copia antes.',
        confirm: 'Borrar todo',
        danger: true,
      });
      if (ok) {
        store.clearAll();
        toast('Datos borrados');
      }
    }
  });
  view.addEventListener('change', async (e) => {
    if (e.target.id === 'min-games') store.setSetting('minGames', Math.max(1, parseInt(e.target.value, 10) || 3));
    if (e.target.id === 'import-file') {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!Array.isArray(data.commanders)) throw new Error('formato');
        const merge = await confirmDialog({
          title: 'Importar copia',
          message: `El archivo contiene ${data.commanders.length} comandantes. ¿Quieres combinarlos con los actuales? (Cancelar = no importar)`,
          confirm: 'Combinar',
        });
        if (merge) {
          store.replaceAll(data, 'merge');
          toast('Copia importada', { icon: '✦' });
        }
      } catch {
        toast('El archivo no es una copia válida de CommanderVault', { tone: 'warn' });
      }
      e.target.value = '';
    }
  });
}

function exportCSV() {
  const rows = [['comandante', 'compañero', 'fecha', 'resultado', 'jugadores', 'turnos', 'rivales', 'notas']];
  store.played().forEach((c) =>
    store.sortedGames(c).forEach((g) =>
      rows.push([c.name, c.partner?.name || '', g.date, RESULT[g.result].label, g.players, g.turns || '', g.opponents, g.notes])
    )
  );
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  download(`commandervault-partidas-${todayISO()}.csv`, '﻿' + csv, 'text/csv');
  toast('Partidas exportadas', { icon: '✦' });
}

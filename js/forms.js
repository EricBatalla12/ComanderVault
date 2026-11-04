// Formularios: alta/edición de comandante y registro de partidas

import { esc, $, $$, uid, debounce, normalizeUrl, siteOf, todayISO, isSafeUrl, relDate } from './utils.js';
import { COLORS, pip, pips, comboName, sortColors } from './mana.js';
import { searchCommanders } from './scryfall.js';
import * as store from './store.js';
import { celebrate, vibrate } from './fx.js';
import { openRoulette } from './roulette.js';
import { openModal, closeModal, toast, icons, starsInput, bindStarInputs, artLayer, BRACKETS, STATUS, navigate } from './ui.js';

// ------------------------------------------------------------------
// Comandante
// ------------------------------------------------------------------

const PRIORITIES = { 1: 'Alta', 2: 'Media', 3: 'Baja' };

export function openCommanderForm(existing, { wishlist = existing?.status === 'wishlist' } = {}) {
  const isEdit = !!existing;
  const wish = wishlist;
  const draft = structuredClone(
    existing || store.normalizeCommander({ id: '__new__', name: '', links: [{ url: '', label: '' }], status: wish ? 'wishlist' : 'active' })
  );
  if (!isEdit) draft.name = '';
  const title = wish ? (isEdit ? 'Editar «Por jugar»' : 'Añadir a Por jugar') : isEdit ? 'Editar comandante' : 'Nuevo comandante';

  const dlg = openModal(
    `<form class="cmd-form" novalidate>
      <div class="modal-head">
        <h2>${title}</h2>
        <button class="icon-btn" data-close type="button" aria-label="Cerrar">${icons.x}</button>
      </div>
      <div class="modal-body">
        <div class="form-preview" id="preview"></div>

        <section class="form-section">
          <label class="label" for="cf-search">Buscar carta en Scryfall</label>
          <div class="search-box">
            ${icons.search}
            <input id="cf-search" type="search" placeholder="Ej.: Atraxa, Krenko, Edgar Markov…" autocomplete="off" ${isEdit ? '' : 'autofocus'}>
          </div>
          <div class="search-results" id="cf-results" role="listbox" aria-label="Resultados"></div>
          <details class="manual" ${isEdit ? 'open' : ''}>
            <summary>Datos de la carta</summary>
            <div class="grid-2">
              <label class="field"><span class="label">Nombre *</span>
                <input name="name" required value="${esc(draft.name)}" placeholder="Nombre del comandante"></label>
              <label class="field"><span class="label">Tipo</span>
                <input name="typeLine" value="${esc(draft.typeLine)}" placeholder="Legendary Creature — …"></label>
            </div>
            <div class="field"><span class="label">Identidad de color</span>
              <div class="color-toggles" id="cf-colors">
                ${COLORS.map((c) => `<button type="button" class="color-toggle ${draft.colors.includes(c) ? 'on' : ''}" data-color="${c}" aria-pressed="${draft.colors.includes(c)}">${pip(c, 30)}</button>`).join('')}
              </div>
            </div>
            <label class="field"><span class="label">Imagen personalizada (URL, opcional)</span>
              <input name="customImage" type="url" inputmode="url" value="${esc(draft.customImage)}" placeholder="https://…"></label>
          </details>
        </section>

        <section class="form-section">
          <div class="row-between">
            <span class="label">Compañero / Trasfondo</span>
            <button type="button" class="btn btn-small btn-ghost" id="cf-partner-toggle">${draft.partner ? 'Quitar' : `${icons.plus} Añadir`}</button>
          </div>
          <div id="cf-partner"></div>
        </section>

        ${wish ? '' : `<section class="form-section">
          <span class="label">Valoración general</span>
          ${starsInput(draft.rating)}
          <div class="sub-ratings">
            ${[['fun', 'Diversión'], ['power', 'Potencia'], ['consistency', 'Consistencia']]
              .map(([k, l]) => `<label class="range-field"><span>${l}</span>
                <input type="range" min="0" max="10" step="1" name="sub-${k}" value="${draft.sub[k]}">
                <output>${draft.sub[k] || '–'}</output></label>`).join('')}
          </div>
        </section>`}

        <section class="form-section grid-2">
          <div class="field"><span class="label">${wish ? 'Bracket objetivo' : 'Bracket'}</span>
            <div class="chips" id="cf-bracket">
              <button type="button" class="chip ${!draft.bracket ? 'on' : ''}" data-bracket="">—</button>
              ${Object.entries(BRACKETS).map(([n, l]) => `<button type="button" class="chip ${draft.bracket == n ? 'on' : ''}" data-bracket="${n}" title="${l}">${n}</button>`).join('')}
            </div>
          </div>
          ${wish ? `<div class="field"><span class="label">Prioridad</span>
            <div class="chips" id="cf-priority">
              ${Object.entries(PRIORITIES).map(([k, l]) => `<button type="button" class="chip ${draft.priority == k ? 'on' : ''}" data-priority="${k}">${l}</button>`).join('')}
            </div>
          </div>` : `<div class="field"><span class="label">Estado</span>
            <div class="chips" id="cf-status">
              ${Object.entries(STATUS).map(([k, s]) => `<button type="button" class="chip ${draft.status === k ? 'on' : ''}" data-status="${k}">${s.label}</button>`).join('')}
            </div>
          </div>`}
        </section>

        <section class="form-section">
          <div class="row-between"><span class="label">Enlaces a mazos</span>
            <button type="button" class="btn btn-small btn-ghost" id="cf-add-link">${icons.plus} Añadir enlace</button></div>
          <div id="cf-links" class="link-rows"></div>
          <p class="hint">Moxfield, Archidekt, EDHREC, TappedOut… se detectan automáticamente.</p>
        </section>

        <section class="form-section">
          <label class="field"><span class="label">Etiquetas</span>
            <input name="tags" value="${esc(draft.tags.join(', '))}" placeholder="tokens, aristocrats, voltron… (separadas por comas)"></label>
          <label class="field"><span class="label">Notas</span>
            <textarea name="notes" rows="3" placeholder="${wish ? '¿Por qué te llama? Ideas, cartas clave, presupuesto…' : 'Combos, cartas clave, ideas de mejora…'}">${esc(draft.notes)}</textarea></label>
        </section>

        ${wish ? '' : `<section class="form-section">
          <span class="label">Récord previo <small class="muted">(partidas jugadas antes de usar la app)</small></span>
          <div class="grid-3">
            <label class="field"><span class="label small">Victorias</span><input name="prevWins" type="number" min="0" inputmode="numeric" value="${draft.prevWins}"></label>
            <label class="field"><span class="label small">Derrotas</span><input name="prevLosses" type="number" min="0" inputmode="numeric" value="${draft.prevLosses}"></label>
            <label class="field"><span class="label small">Empates</span><input name="prevDraws" type="number" min="0" inputmode="numeric" value="${draft.prevDraws}"></label>
          </div>
        </section>`}
      </div>
      <div class="modal-foot">
        ${wish && isEdit ? `<button class="btn btn-win foot-left" id="cf-played" type="button">${icons.check} Lo he jugado</button>` : ''}
        <button class="btn btn-ghost" data-close type="button">Cancelar</button>
        <button class="btn btn-primary" type="submit">${isEdit ? 'Guardar cambios' : wish ? 'Añadir a Por jugar' : 'Añadir a la bóveda'}</button>
      </div>
    </form>`,
    { wide: true }
  );

  const form = $('form', dlg);
  const preview = $('#preview', dlg);

  const renderPreview = () => {
    preview.innerHTML = `${artLayer(draft, 'preview-art')}
      <div class="preview-meta">
        ${pips(draft.colors, 22)}
        <strong>${esc(draft.name || 'Elige un comandante')}${draft.partner?.name ? ` <span class="muted">& ${esc(draft.partner.name)}</span>` : ''}</strong>
        <span class="muted small">${esc(comboName(draft.colors))}${draft.typeLine ? ` · ${esc(draft.typeLine)}` : ''}</span>
      </div>`;
  };

  const syncColorsUI = () =>
    $$('#cf-colors .color-toggle', dlg).forEach((b) => {
      const on = draft.colors.includes(b.dataset.color);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
    });

  const applyCard = (card) => {
    Object.assign(draft, {
      name: card.name, typeLine: card.typeLine, art: card.art, image: card.image,
      scryfallId: card.scryfallId, scryfallUri: card.scryfallUri, edhrecUri: card.edhrecUri,
    });
    draft.colors = sortColors([...new Set([...card.colors, ...(draft.partner?.colors || [])])]);
    form.name.value = card.name;
    form.typeLine.value = card.typeLine;
    syncColorsUI();
    renderPreview();
  };

  // ---- Búsqueda en Scryfall ----
  const resultsBox = $('#cf-results', dlg);
  const renderResults = (list, onPick, box = resultsBox) => {
    box.innerHTML = list
      .map((card, i) => `<button type="button" class="result" role="option" data-i="${i}">
          <span class="result-art">${card.art ? `<img src="${esc(card.art)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>
          <span class="result-text"><strong>${esc(card.name)}</strong><small>${esc(card.typeLine)}</small></span>
          ${pips(card.colors, 16)}
        </button>`)
      .join('');
    box.onclick = (e) => {
      const b = e.target.closest('.result');
      if (!b) return;
      onPick(list[+b.dataset.i]);
      box.innerHTML = '';
    };
  };
  const bindSearch = (input, box, onPick) => {
    const run = debounce(async () => {
      const q = input.value;
      if (q.trim().length < 2) return (box.innerHTML = '');
      box.innerHTML = '<div class="result-msg"><span class="spinner"></span> Buscando…</div>';
      try {
        const list = await searchCommanders(q);
        if (input.value !== q) return;
        box.innerHTML = list.length ? '' : '<div class="result-msg">Sin resultados. Puedes introducir los datos a mano.</div>';
        if (list.length) renderResults(list, onPick, box);
      } catch (e) {
        if (e.name === 'AbortError') return;
        box.innerHTML = '<div class="result-msg">No se pudo conectar con Scryfall. Introduce los datos a mano.</div>';
        $('details.manual', dlg).open = true;
      }
    }, 350);
    input.addEventListener('input', run);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        box.querySelector('.result')?.click();
      }
    });
  };
  bindSearch($('#cf-search', dlg), resultsBox, (card) => {
    applyCard(card);
    $('#cf-search', dlg).value = '';
    if (card.canPartner && !draft.partner) toast('Este comandante admite compañero o trasfondo', { icon: '✦' });
  });

  // ---- Compañero ----
  const partnerBox = $('#cf-partner', dlg);
  const renderPartner = () => {
    $('#cf-partner-toggle', dlg).innerHTML = draft.partner ? 'Quitar' : `${icons.plus} Añadir`;
    if (!draft.partner) return (partnerBox.innerHTML = '');
    partnerBox.innerHTML = `
      <div class="search-box">${icons.search}<input id="cf-partner-search" type="search" placeholder="Buscar compañero o trasfondo…" autocomplete="off"></div>
      <div class="search-results" id="cf-partner-results"></div>
      <label class="field"><span class="label small">Nombre del compañero</span>
        <input id="cf-partner-name" value="${esc(draft.partner.name || '')}" placeholder="Nombre"></label>`;
    bindSearch($('#cf-partner-search', dlg), $('#cf-partner-results', dlg), (card) => {
      draft.partner = { name: card.name, art: card.art, image: card.image, colors: card.colors, typeLine: card.typeLine, scryfallUri: card.scryfallUri };
      draft.colors = sortColors([...new Set([...draft.colors, ...card.colors])]);
      syncColorsUI();
      renderPartner();
      renderPreview();
    });
    $('#cf-partner-name', dlg).addEventListener('input', (e) => {
      draft.partner.name = e.target.value;
      renderPreview();
    });
  };
  $('#cf-partner-toggle', dlg).addEventListener('click', () => {
    draft.partner = draft.partner ? null : { name: '', art: '', image: '', colors: [] };
    renderPartner();
    renderPreview();
  });

  // ---- Enlaces ----
  const linksBox = $('#cf-links', dlg);
  const renderLinks = () => {
    linksBox.innerHTML = draft.links
      .map((l, i) => {
        const s = siteOf(l.url);
        return `<div class="link-row" data-i="${i}">
          <span class="site-badge" style="--site:${s.color}" title="${esc(s.name)}">${esc(s.short)}</span>
          <input class="link-url" type="url" inputmode="url" placeholder="https://moxfield.com/decks/…" value="${esc(l.url)}" aria-label="URL del mazo">
          <input class="link-label" placeholder="${esc(l.url ? s.name : 'Etiqueta (opcional)')}" value="${esc(l.label)}" aria-label="Etiqueta">
          <button type="button" class="icon-btn" data-remove-link aria-label="Quitar enlace">${icons.trash}</button>
        </div>`;
      })
      .join('');
  };
  linksBox.addEventListener('input', (e) => {
    const row = e.target.closest('.link-row');
    const l = draft.links[+row.dataset.i];
    if (e.target.classList.contains('link-url')) {
      l.url = e.target.value;
      const s = siteOf(normalizeUrl(l.url));
      const badge = row.querySelector('.site-badge');
      badge.textContent = s.short;
      badge.style.setProperty('--site', s.color);
      row.querySelector('.link-label').placeholder = l.url ? s.name : 'Etiqueta (opcional)';
    } else l.label = e.target.value;
  });
  linksBox.addEventListener('click', (e) => {
    if (!e.target.closest('[data-remove-link]')) return;
    draft.links.splice(+e.target.closest('.link-row').dataset.i, 1);
    renderLinks();
  });
  $('#cf-add-link', dlg).addEventListener('click', () => {
    draft.links.push({ id: uid(), url: '', label: '' });
    renderLinks();
    $$('.link-url', linksBox).at(-1).focus();
  });

  // ---- Colores, chips, rangos ----
  $('#cf-colors', dlg).addEventListener('click', (e) => {
    const b = e.target.closest('.color-toggle');
    if (!b) return;
    const c = b.dataset.color;
    draft.colors = draft.colors.includes(c) ? draft.colors.filter((x) => x !== c) : sortColors([...draft.colors, c]);
    syncColorsUI();
    renderPreview();
  });
  const chipGroup = (sel, attr, fn) =>
    $(sel, dlg).addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      $$(`${sel} .chip`, dlg).forEach((x) => x.classList.toggle('on', x === b));
      fn(b.dataset[attr]);
    });
  chipGroup('#cf-bracket', 'bracket', (v) => (draft.bracket = v ? +v : null));
  if (wish) chipGroup('#cf-priority', 'priority', (v) => (draft.priority = +v));
  else chipGroup('#cf-status', 'status', (v) => (draft.status = v));
  $('#cf-played', dlg)?.addEventListener('click', () => {
    draft.status = 'active';
    form.requestSubmit();
  });
  $$('input[type=range]', dlg).forEach((r) =>
    r.addEventListener('input', () => {
      r.nextElementSibling.textContent = r.value === '0' ? '–' : r.value;
      draft.sub[r.name.slice(4)] = +r.value;
    })
  );
  bindStarInputs(dlg, (v) => (draft.rating = v));
  form.name.addEventListener('input', () => ((draft.name = form.name.value), renderPreview()));
  form.customImage.addEventListener('change', () => ((draft.customImage = form.customImage.value.trim()), renderPreview()));

  // ---- Guardar ----
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    draft.name = form.name.value.trim();
    if (!draft.name) {
      $('details.manual', dlg).open = true;
      form.name.focus();
      form.name.classList.add('invalid');
      toast('Busca una carta o escribe el nombre del comandante', { tone: 'warn' });
      return;
    }
    const custom = form.customImage.value.trim();
    draft.customImage = custom && isSafeUrl(normalizeUrl(custom)) ? normalizeUrl(custom) : '';
    draft.typeLine = form.typeLine.value.trim();
    draft.tags = [...new Set(form.tags.value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))];
    draft.notes = form.notes.value.trim();
    ['prevWins', 'prevLosses', 'prevDraws'].forEach((k) => form[k] && (draft[k] = Math.max(0, parseInt(form[k].value, 10) || 0)));
    draft.links = draft.links
      .map((l) => ({ ...l, id: l.id || uid(), url: normalizeUrl(l.url) }))
      .filter((l) => l.url && isSafeUrl(l.url));
    if (draft.partner && !draft.partner.name?.trim()) draft.partner = null;
    if (!isEdit) delete draft.id;

    const saved = store.upsertCommander(draft);
    closeModal();
    if (wish && saved.status === 'active') {
      toast(`${saved.name} pasa a tu colección`, { icon: '✦', undo: () => store.patchCommander(saved.id, { status: 'wishlist' }) });
    } else if (wish) {
      toast(isEdit ? 'Cambios guardados' : `${saved.name} añadido a Por jugar`, { icon: '✦' });
      if (!isEdit) navigate('#/wishlist');
    } else {
      toast(isEdit ? 'Cambios guardados' : `${saved.name} añadido a la bóveda`, { icon: '✦' });
      if (!isEdit) navigate(`#/c/${saved.id}`);
    }
  });

  renderPreview();
  renderPartner();
  renderLinks();
}

// ------------------------------------------------------------------
// Partida
// ------------------------------------------------------------------

export function openGameForm(commander, existing, presetResult) {
  const g = existing || { result: presetResult || 'win', date: todayISO(), players: 4, opponents: '', turns: '', notes: '', linkId: '' };
  const dlg = openModal(
    `<form class="game-form" novalidate>
      <div class="modal-head">
        <h2>${existing ? 'Editar partida' : 'Registrar partida'}</h2>
        <button class="icon-btn" data-close type="button" aria-label="Cerrar">${icons.x}</button>
      </div>
      <div class="modal-body">
        <p class="muted small">Con <strong>${esc(commander.name)}</strong></p>
        <div class="result-picker" role="radiogroup" aria-label="Resultado">
          ${[['win', 'Victoria', icons.trophy], ['loss', 'Derrota', icons.skull], ['draw', 'Empate', icons.minus]]
            .map(([v, l, ic]) => `<label class="result-opt r-${v}"><input type="radio" name="result" value="${v}" ${g.result === v ? 'checked' : ''}><span>${ic}${l}</span></label>`).join('')}
        </div>
        <div class="grid-3">
          <label class="field"><span class="label">Fecha</span><input name="date" type="date" value="${g.date}" max="${todayISO()}"></label>
          <label class="field"><span class="label">Jugadores</span><input name="players" type="number" min="2" max="10" inputmode="numeric" value="${g.players}"></label>
          <label class="field"><span class="label">Turnos</span><input name="turns" type="number" min="1" max="99" inputmode="numeric" value="${g.turns || ''}" placeholder="—"></label>
        </div>
        <label class="field"><span class="label">Rivales</span>
          <input name="opponents" value="${esc(g.opponents)}" placeholder="Ej.: Yuriko, Korvold, Tymna & Thrasios"></label>
        ${commander.links.length > 1 ? `<label class="field"><span class="label">Versión del mazo</span>
          <select name="linkId"><option value="">—</option>
            ${commander.links.map((l) => `<option value="${l.id}" ${g.linkId === l.id ? 'selected' : ''}>${esc(l.label || siteOf(l.url).name)}</option>`).join('')}
          </select></label>` : ''}
        <label class="field"><span class="label">Notas</span>
          <textarea name="notes" rows="3" placeholder="¿Cómo ganaste o qué falló?">${esc(g.notes)}</textarea></label>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-close type="button">Cancelar</button>
        <button class="btn btn-primary" type="submit">${existing ? 'Guardar' : 'Registrar'}</button>
      </div>
    </form>`
  );
  const form = $('form', dlg);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      result: form.result.value,
      date: form.date.value || todayISO(),
      players: Math.min(10, Math.max(2, parseInt(form.players.value, 10) || 4)),
      turns: parseInt(form.turns.value, 10) || null,
      opponents: form.opponents.value.trim(),
      notes: form.notes.value.trim(),
      linkId: form.linkId?.value || '',
    };
    if (existing) store.updateGame(commander.id, { ...existing, ...data });
    else {
      const at = form.querySelector('[type=submit]').getBoundingClientRect();
      store.addGame(commander.id, data);
      if (data.result === 'win') celebrate(at, commander.colors);
    }
    closeModal();
    toast(existing ? 'Partida actualizada' : data.result === 'win' ? '¡Victoria registrada!' : 'Partida registrada', {
      icon: data.result === 'win' ? '🏆' : '✦',
    });
  });
}

// ------------------------------------------------------------------
// Menú del botón "+" (móvil): qué quieres añadir
// ------------------------------------------------------------------

export function openAddSheet() {
  const dlg = openModal(`
    <div class="modal-head"><h2>¿Qué quieres añadir?</h2>
      <button class="icon-btn" data-close type="button" aria-label="Cerrar">${icons.x}</button></div>
    <div class="modal-body add-sheet">
      <button type="button" class="add-opt" data-opt="game"><span class="add-ic ic-game">${icons.trophy}</span>
        <span><strong>Registrar partida</strong><small>Apunta una victoria o derrota</small></span></button>
      <button type="button" class="add-opt" data-opt="new"><span class="add-ic ic-new">${icons.plus}</span>
        <span><strong>Comandante jugado</strong><small>Añádelo a tu colección y puntúalo</small></span></button>
      <button type="button" class="add-opt" data-opt="wish"><span class="add-ic ic-wish">${icons.sparkles}</span>
        <span><strong>Comandante por jugar</strong><small>Guárdalo en tu lista de deseos</small></span></button>
      <button type="button" class="add-opt" data-opt="roulette"><span class="add-ic ic-dice">${icons.dice}</span>
        <span><strong>¿A qué juego hoy?</strong><small>Deja que el azar elija comandante</small></span></button>
    </div>`);
  dlg.querySelector('.add-sheet').addEventListener('click', (e) => {
    const opt = e.target.closest('[data-opt]')?.dataset.opt;
    if (opt === 'game') openGamePicker();
    else if (opt === 'new') openCommanderForm();
    else if (opt === 'wish') openCommanderForm(null, { wishlist: true });
    else if (opt === 'roulette') openRoulette();
  });
}

// ------------------------------------------------------------------
// Selector rápido: ¿con qué comandante has jugado?
// ------------------------------------------------------------------

export function openGamePicker() {
  const all = [...store.played()].sort(
    (a, b) =>
      (a.status === 'retired') - (b.status === 'retired') ||
      (store.record(b).lastPlayed || '').localeCompare(store.record(a).lastPlayed || '') ||
      a.name.localeCompare(b.name, 'es')
  );
  if (!all.length) {
    toast('Primero añade un comandante', { tone: 'warn' });
    return openCommanderForm();
  }
  const dlg = openModal(`
    <div class="modal-head"><h2>¿Con quién has jugado?</h2>
      <button class="icon-btn" data-close type="button" aria-label="Cerrar">${icons.x}</button></div>
    <div class="modal-body">
      <div class="search-box">${icons.search}<input id="pick-q" type="search" placeholder="Buscar comandante…" autocomplete="off"></div>
      <p class="hint">Toca 🏆 o 💀 para registrar al momento, o el comandante para añadir detalles.</p>
      <div class="pick-list" id="pick-list"></div>
    </div>`);
  const list = $('#pick-list', dlg);
  const render = (q = '') => {
    const items = all.filter((c) => `${c.name} ${c.partner?.name || ''}`.toLowerCase().includes(q.toLowerCase()));
    list.innerHTML = items.length
      ? items.map((c) => {
          const r = store.record(c);
          return `<div class="pick-item" data-id="${c.id}">
            <span class="rank-thumb">${artLayer(c, 'thumb-art')}</span>
            <span class="rank-text"><strong>${esc(c.name)}${c.partner?.name ? ` & ${esc(c.partner.name)}` : ''}</strong>
              <small>${r.wins}V · ${r.losses}D${r.lastPlayed ? ` · ${relDate(r.lastPlayed)}` : ''}</small></span>
            <span class="pick-actions">
              <button type="button" class="icon-btn pick-w" data-r="win" aria-label="Registrar victoria" title="Victoria rápida">${icons.trophy}</button>
              <button type="button" class="icon-btn pick-l" data-r="loss" aria-label="Registrar derrota" title="Derrota rápida">${icons.skull}</button>
            </span>
          </div>`;
        }).join('')
      : '<p class="muted small" style="text-align:center;padding:16px">Sin coincidencias</p>';
  };
  list.addEventListener('click', (e) => {
    const item = e.target.closest('.pick-item');
    if (!item) return;
    const c = store.getCommander(item.dataset.id);
    const r = e.target.closest('[data-r]')?.dataset.r;
    if (!r) return openGameForm(c);
    const at = e.target.closest('[data-r]').getBoundingClientRect();
    const g = store.addGame(c.id, { result: r });
    if (r === 'win') celebrate(at, c.colors);
    else vibrate(30);
    closeModal();
    toast(`${r === 'win' ? 'Victoria' : 'Derrota'} con ${c.name}`, {
      icon: r === 'win' ? '🏆' : '💀',
      undo: () => store.removeGame(c.id, g.id),
    });
  });
  $('#pick-q', dlg).addEventListener('input', (e) => render(e.target.value));
  render();
  if (matchMedia('(min-width: 761px)').matches) $('#pick-q', dlg).focus();
}

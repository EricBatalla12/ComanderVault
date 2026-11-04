// Ruleta "¿A qué juego hoy?": elige un comandante al azar con animación

import { esc, $ } from './utils.js';
import { pips, comboName } from './mana.js';
import * as store from './store.js';
import { openModal, closeModal, icons, artLayer, starsView, navigate } from './ui.js';
import { openGameForm } from './forms.js';
import { celebrate, reducedMotion, vibrate } from './fx.js';

const opts = { onlyActive: true, wishlist: false, favs: false, weighted: true };

const candidates = () =>
  store.getState().commanders.filter((c) => {
    if (c.status === 'wishlist') return opts.wishlist;
    if (opts.favs && !c.favorite) return false;
    if (opts.onlyActive && c.status !== 'active') return false;
    return true;
  });

function pick(list) {
  const w = list.map((c) => (opts.weighted ? (c.rating ? 1 + c.rating : 6) : 1));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) {
    r -= w[i];
    if (r <= 0) return list[i];
  }
  return list.at(-1);
}

const cardFace = (c) => `${artLayer(c)}<div class="holo"></div>
  <div class="roulette-name"><span>${esc(c.name)}</span></div>`;

const cardBack = () => `<div class="card-back">
  <img src="icons/icon.svg" alt="" width="84" height="84"><span>CommanderVault</span></div>`;

export function openRoulette() {
  const chip = (key, label) =>
    `<button type="button" class="chip ${opts[key] ? 'on' : ''}" data-opt="${key}" aria-pressed="${opts[key]}">${label}</button>`;
  const dlg = openModal(`
    <div class="modal-head"><h2>¿A qué juego hoy?</h2>
      <button class="icon-btn" data-close type="button" aria-label="Cerrar">${icons.x}</button></div>
    <div class="modal-body roulette">
      <div class="chips roulette-opts">
        ${chip('onlyActive', 'Solo en uso')}${chip('favs', 'Solo favoritos')}${chip('wishlist', 'Incluir «Por jugar»')}${chip('weighted', 'Según valoración')}
      </div>
      <div class="roulette-stage"><div class="roulette-card back" id="rl-card">${cardBack()}</div></div>
      <div class="roulette-result" id="rl-result"><p class="muted small" id="rl-count"></p></div>
      <button class="btn btn-primary btn-lg roulette-spin" id="rl-spin" type="button">${icons.dice} Girar</button>
    </div>`);

  const card = $('#rl-card', dlg);
  const result = $('#rl-result', dlg);
  const spinBtn = $('#rl-spin', dlg);
  let spinning = false;
  let timer = 0;

  const updateCount = () => {
    const n = candidates().length;
    const el = $('#rl-count', dlg);
    if (el) el.textContent = n < 2 ? 'Necesitas al menos 2 comandantes con estos filtros.' : `${n} comandantes en el bombo`;
    spinBtn.disabled = n < 2;
  };

  $('.roulette-opts', dlg).addEventListener('click', (e) => {
    const b = e.target.closest('[data-opt]');
    if (!b || spinning) return;
    opts[b.dataset.opt] = !opts[b.dataset.opt];
    b.classList.toggle('on', opts[b.dataset.opt]);
    b.setAttribute('aria-pressed', opts[b.dataset.opt]);
    if (!result.querySelector('.rl-picked')) updateCount();
  });

  const showResult = (c) => {
    const r = store.record(c);
    const wish = c.status === 'wishlist';
    result.innerHTML = `<div class="rl-picked">
      ${pips(c.colors, 22)}
      <h3>${esc(c.name)}${c.partner?.name ? ` <span class="muted">& ${esc(c.partner.name)}</span>` : ''}</h3>
      <p class="muted small">${esc(comboName(c.colors))}${wish ? ' · Por jugar' : r.total ? ` · ${r.wins}V ${r.losses}D · ${Math.round(r.winrate * 100)}% winrate` : ' · Sin partidas aún'}</p>
      ${c.rating ? starsView(c.rating, 16) : ''}
      <div class="rl-actions">
        ${wish ? '' : `<button class="btn btn-win" type="button" data-rl="log">${icons.trophy} Registrar partida</button>`}
        <button class="btn btn-ghost" type="button" data-rl="view">Ver ${wish ? 'en Por jugar' : 'comandante'}</button>
      </div>
    </div>`;
    result.onclick = (e) => {
      const a = e.target.closest('[data-rl]')?.dataset.rl;
      if (a === 'log') openGameForm(c);
      if (a === 'view') {
        closeModal();
        navigate(wish ? '#/wishlist' : `#/c/${c.id}`);
      }
    };
  };

  const spin = () => {
    const list = candidates();
    if (list.length < 2 || spinning) return;
    spinning = true;
    spinBtn.disabled = true;
    result.innerHTML = '<p class="muted small rl-rolling">Barajando…</p>';
    card.classList.remove('back', 'landed');
    card.classList.add('rolling');
    const winner = pick(list);
    const steps = reducedMotion() ? 1 : 24;
    let i = 0;
    let last = null;
    const tick = () => {
      i++;
      let c = winner;
      if (i < steps) {
        do c = list[(Math.random() * list.length) | 0];
        while (c === last && list.length > 1);
      }
      last = c;
      card.innerHTML = cardFace(c);
      if (i % 3 === 0 && i < steps) vibrate(4);
      if (i < steps) {
        timer = setTimeout(tick, 45 + Math.pow(i / steps, 3) * 380);
      } else {
        card.classList.remove('rolling');
        card.classList.add('landed');
        spinning = false;
        spinBtn.disabled = false;
        spinBtn.innerHTML = `${icons.dice} Girar otra vez`;
        showResult(winner);
        celebrate(card, winner.colors);
      }
    };
    tick();
  };

  spinBtn.addEventListener('click', spin);
  dlg.addEventListener('close', () => clearTimeout(timer), { once: true });
  updateCount();
}

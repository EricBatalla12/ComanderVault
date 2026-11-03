// Estado de la app.
// - Modo "local": los comandantes se guardan en localStorage (sin cuenta).
// - Modo "cloud": los comandantes vienen de la cuenta del usuario (ver cloud.js);
//   aquí solo se mantienen en memoria y se avisa de cada cambio para subirlo.
// Los ajustes (tema, orden…) son preferencias de cada dispositivo y siempre van a localStorage.

import { uid, todayISO } from './utils.js';

const DATA_KEY = 'commandervault:v1';
const SETTINGS_KEY = 'commandervault:settings';
const listeners = new Set();

const defaultSettings = () => ({ theme: 'system', minGames: 3, sort: 'recent', wishSort: 'priority' });

let mode = 'local';
let remoteEmit = false;
const state = { commanders: [], settings: loadSettings(), ready: true };
state.commanders = loadLocalCommanders();

function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function loadSettings() {
  const legacy = readJSON(DATA_KEY)?.settings || {};
  return { ...defaultSettings(), ...legacy, ...(readJSON(SETTINGS_KEY) || {}) };
}

function loadLocalCommanders() {
  return (readJSON(DATA_KEY)?.commanders || []).map(normalizeCommander);
}

function persist() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    if (mode === 'local') localStorage.setItem(DATA_KEY, JSON.stringify({ version: 2, commanders: state.commanders }));
  } catch (e) {
    console.error('No se pudo guardar', e);
  }
}

const emit = () => listeners.forEach((fn) => fn(state, { remote: remoteEmit }));

function commit() {
  persist();
  emit();
}

export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));
export const getState = () => state;
export const getMode = () => mode;
export const getCommander = (id) => state.commanders.find((c) => c.id === id);

/** Comandantes jugados (colección) y lista de "Por jugar". */
export const played = () => state.commanders.filter((c) => c.status !== 'wishlist');
export const wishlist = () => state.commanders.filter((c) => c.status === 'wishlist');

// ---------- Cambio de modo ----------

/** Pasa a modo nube: vacía la memoria hasta que lleguen los datos de la cuenta. */
export function useCloud() {
  mode = 'cloud';
  state.commanders = [];
  state.ready = false;
}

export function useLocal() {
  mode = 'local';
  state.commanders = loadLocalCommanders();
  state.ready = true;
  emit();
}

/** Aplica los datos recibidos de la nube sin volver a subirlos. */
export function applyRemote(commanders) {
  state.commanders = commanders.map(normalizeCommander).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  state.ready = true;
  remoteEmit = true;
  try {
    emit();
  } finally {
    remoteEmit = false;
  }
}

/** Datos guardados en este dispositivo sin cuenta (para subirlos a la cuenta). */
export const localCommanders = () => loadLocalCommanders();
export function clearLocalCommanders() {
  try {
    localStorage.removeItem(DATA_KEY);
  } catch {}
}

// ---------- Modelo ----------

export function normalizeCommander(c = {}) {
  const now = new Date().toISOString();
  return {
    id: c.id || uid(),
    name: c.name || 'Sin nombre',
    typeLine: c.typeLine || '',
    colors: Array.isArray(c.colors) ? c.colors : [],
    art: c.art || '',
    image: c.image || '',
    customImage: c.customImage || '',
    scryfallId: c.scryfallId || '',
    scryfallUri: c.scryfallUri || '',
    edhrecUri: c.edhrecUri || '',
    partner: c.partner
      ? {
          name: c.partner.name || '',
          art: c.partner.art || '',
          image: c.partner.image || '',
          colors: Array.isArray(c.partner.colors) ? c.partner.colors : [],
          typeLine: c.partner.typeLine || '',
          scryfallUri: c.partner.scryfallUri || '',
        }
      : null,
    rating: Number.isFinite(c.rating) ? c.rating : 0,
    sub: { fun: +c.sub?.fun || 0, power: +c.sub?.power || 0, consistency: +c.sub?.consistency || 0 },
    bracket: c.bracket ?? null,
    status: ['active', 'building', 'retired', 'wishlist'].includes(c.status) ? c.status : 'active',
    priority: [1, 2, 3].includes(c.priority) ? c.priority : 2,
    favorite: !!c.favorite,
    tags: Array.isArray(c.tags) ? c.tags : [],
    links: (c.links || []).map((l) => ({ id: l.id || uid(), url: l.url || '', label: l.label || '' })),
    notes: c.notes || '',
    prevWins: +c.prevWins || 0,
    prevLosses: +c.prevLosses || 0,
    prevDraws: +c.prevDraws || 0,
    games: (c.games || []).map((g) => ({
      id: g.id || uid(),
      date: g.date || todayISO(),
      result: ['win', 'loss', 'draw'].includes(g.result) ? g.result : 'loss',
      players: +g.players || 4,
      opponents: g.opponents || '',
      turns: g.turns ? +g.turns : null,
      notes: g.notes || '',
      linkId: g.linkId || '',
      createdAt: g.createdAt || now,
    })),
    createdAt: c.createdAt || now,
    updatedAt: c.updatedAt || now,
  };
}

// ---------- Mutaciones ----------

export function upsertCommander(data) {
  const now = new Date().toISOString();
  const idx = state.commanders.findIndex((c) => c.id === data.id);
  let saved;
  if (idx >= 0) {
    saved = state.commanders[idx] = normalizeCommander({ ...state.commanders[idx], ...data, updatedAt: now });
  } else {
    saved = normalizeCommander({ ...data, createdAt: now, updatedAt: now });
    state.commanders.unshift(saved);
  }
  commit();
  return saved;
}

export function patchCommander(id, patch) {
  const c = getCommander(id);
  if (!c) return;
  Object.assign(c, patch, { updatedAt: new Date().toISOString() });
  commit();
}

export function removeCommander(id) {
  const idx = state.commanders.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const [removed] = state.commanders.splice(idx, 1);
  commit();
  return () => {
    state.commanders.splice(Math.min(idx, state.commanders.length), 0, removed);
    commit();
  };
}

export function addGame(commanderId, game) {
  const c = getCommander(commanderId);
  if (!c) return null;
  const g = normalizeCommander({ games: [{ date: todayISO(), players: 4, ...game, id: uid(), createdAt: new Date().toISOString() }] }).games[0];
  c.games.push(g);
  c.updatedAt = new Date().toISOString();
  commit();
  return g;
}

export function updateGame(commanderId, game) {
  const c = getCommander(commanderId);
  const idx = c?.games.findIndex((g) => g.id === game.id) ?? -1;
  if (idx < 0) return;
  c.games[idx] = { ...c.games[idx], ...game };
  c.updatedAt = new Date().toISOString();
  commit();
}

export function removeGame(commanderId, gameId) {
  const c = getCommander(commanderId);
  const idx = c?.games.findIndex((g) => g.id === gameId) ?? -1;
  if (idx < 0) return null;
  const [removed] = c.games.splice(idx, 1);
  commit();
  return () => {
    const cur = getCommander(commanderId);
    if (!cur) return;
    cur.games.splice(Math.min(idx, cur.games.length), 0, removed);
    commit();
  };
}

export function setSetting(key, value) {
  state.settings[key] = value;
  commit();
}

export function replaceAll(data, how = 'replace') {
  const incoming = (data.commanders || []).map(normalizeCommander);
  if (how === 'merge') {
    const byId = new Map(state.commanders.map((c) => [c.id, c]));
    incoming.forEach((c) => byId.set(c.id, c));
    state.commanders = [...byId.values()];
  } else {
    state.commanders = incoming;
  }
  commit();
}

export function clearAll() {
  state.commanders = [];
  commit();
}

export const exportJSON = () =>
  JSON.stringify({ app: 'CommanderVault', version: 2, exportedAt: new Date().toISOString(), commanders: state.commanders }, null, 2);

// ---------- Estadísticas derivadas ----------

export const sortedGames = (c) =>
  [...c.games].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

export function record(c) {
  let wins = c.prevWins, losses = c.prevLosses, draws = c.prevDraws;
  for (const g of c.games) {
    if (g.result === 'win') wins++;
    else if (g.result === 'loss') losses++;
    else draws++;
  }
  const total = wins + losses + draws;
  const games = sortedGames(c);
  let streak = null;
  if (games.length) {
    const type = games[0].result;
    let n = 0;
    for (const g of games) {
      if (g.result !== type) break;
      n++;
    }
    streak = { type, n };
  }
  return {
    wins, losses, draws, total,
    winrate: total ? wins / total : 0,
    streak,
    lastPlayed: games[0]?.date || null,
    avgTurns: avg(c.games.filter((g) => g.result === 'win' && g.turns).map((g) => g.turns)),
  };
}

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

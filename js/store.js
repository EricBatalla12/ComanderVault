// Estado de la app persistido en localStorage

import { uid, todayISO } from './utils.js';

const KEY = 'commandervault:v1';
const listeners = new Set();

const defaults = () => ({
  version: 1,
  commanders: [],
  settings: { theme: 'system', minGames: 3, sort: 'recent', view: 'grid' },
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const data = JSON.parse(raw);
    return {
      ...defaults(),
      ...data,
      settings: { ...defaults().settings, ...(data.settings || {}) },
      commanders: (data.commanders || []).map(normalizeCommander),
    };
  } catch (e) {
    console.error('No se pudo leer el almacenamiento', e);
    return defaults();
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('No se pudo guardar', e);
  }
}

const emit = () => listeners.forEach((fn) => fn(state));

export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));
export const getState = () => state;
export const getCommander = (id) => state.commanders.find((c) => c.id === id);

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
    partner: c.partner || null,
    rating: Number.isFinite(c.rating) ? c.rating : 0,
    sub: { fun: 0, power: 0, consistency: 0, ...(c.sub || {}) },
    bracket: c.bracket ?? null,
    status: c.status || 'active',
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

function commit() {
  persist();
  emit();
}

export function upsertCommander(data) {
  const now = new Date().toISOString();
  const idx = state.commanders.findIndex((c) => c.id === data.id);
  if (idx >= 0) {
    state.commanders[idx] = normalizeCommander({ ...state.commanders[idx], ...data, updatedAt: now });
  } else {
    state.commanders.unshift(normalizeCommander({ ...data, createdAt: now, updatedAt: now }));
  }
  commit();
  return data.id ? getCommander(data.id) : state.commanders[0];
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
    state.commanders.splice(idx, 0, removed);
    commit();
  };
}

export function addGame(commanderId, game) {
  const c = getCommander(commanderId);
  if (!c) return null;
  const g = { id: uid(), date: todayISO(), players: 4, createdAt: new Date().toISOString(), ...game };
  c.games.push(normalizeCommander({ games: [g] }).games[0]);
  c.updatedAt = new Date().toISOString();
  commit();
  return g;
}

export function updateGame(commanderId, game) {
  const c = getCommander(commanderId);
  const idx = c?.games.findIndex((g) => g.id === game.id) ?? -1;
  if (idx < 0) return;
  c.games[idx] = { ...c.games[idx], ...game };
  commit();
}

export function removeGame(commanderId, gameId) {
  const c = getCommander(commanderId);
  const idx = c?.games.findIndex((g) => g.id === gameId) ?? -1;
  if (idx < 0) return null;
  const [removed] = c.games.splice(idx, 1);
  commit();
  return () => {
    c.games.splice(idx, 0, removed);
    commit();
  };
}

export function setSetting(key, value) {
  state.settings[key] = value;
  commit();
}

export function replaceAll(data, mode = 'replace') {
  const incoming = (data.commanders || []).map(normalizeCommander);
  if (mode === 'merge') {
    const byId = new Map(state.commanders.map((c) => [c.id, c]));
    incoming.forEach((c) => byId.set(c.id, c));
    state.commanders = [...byId.values()];
  } else {
    state.commanders = incoming;
    if (data.settings) state.settings = { ...state.settings, ...data.settings };
  }
  commit();
}

export function clearAll() {
  const prev = state;
  state = defaults();
  state.settings = { ...prev.settings };
  commit();
}

export const exportJSON = () =>
  JSON.stringify({ app: 'CommanderVault', exportedAt: new Date().toISOString(), ...state }, null, 2);

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

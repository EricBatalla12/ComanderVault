// Utilidades generales

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const dateFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return dateFmt.format(new Date(y, m - 1, d));
};

export const relDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const then = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.round((now - then) / 86400000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days > 1 && days < 7) return `Hace ${days} días`;
  return fmtDate(iso);
};

export const pct = (n) => `${Math.round(n * 100)}%`;

export const debounce = (fn, ms = 300) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Detecta la web de un enlace de mazo para mostrar un distintivo. */
const SITES = [
  { match: /moxfield\.com/, name: 'Moxfield', short: 'MX', color: '#4f7cff' },
  { match: /archidekt\.com/, name: 'Archidekt', short: 'AR', color: '#f0a33a' },
  { match: /edhrec\.com/, name: 'EDHREC', short: 'ED', color: '#5b7cfa' },
  { match: /tappedout\.net/, name: 'TappedOut', short: 'TO', color: '#2aa198' },
  { match: /mtggoldfish\.com/, name: 'MTGGoldfish', short: 'GF', color: '#e3b341' },
  { match: /deckstats\.net/, name: 'Deckstats', short: 'DS', color: '#7aa2f7' },
  { match: /aetherhub\.com/, name: 'AetherHub', short: 'AH', color: '#c678dd' },
  { match: /manabox\.app/, name: 'ManaBox', short: 'MB', color: '#22c55e' },
  { match: /scryfall\.com/, name: 'Scryfall', short: 'SF', color: '#9b59b6' },
  { match: /deckbox\.org/, name: 'Deckbox', short: 'DB', color: '#ef4444' },
  { match: /mtgtop8\.com/, name: 'MTGTop8', short: 'T8', color: '#f97316' },
  { match: /cardkingdom\.com/, name: 'Card Kingdom', short: 'CK', color: '#2563eb' },
  { match: /cardmarket\.com/, name: 'Cardmarket', short: 'CM', color: '#0ea5e9' },
  { match: /youtube\.com|youtu\.be/, name: 'YouTube', short: 'YT', color: '#ef4444' },
];

export const siteOf = (url = '') => {
  const s = SITES.find((x) => x.match.test(url));
  if (s) return s;
  let host = 'Enlace';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {}
  return { name: host, short: host.slice(0, 2).toUpperCase(), color: '#64748b' };
};

export const normalizeUrl = (url = '') => {
  const u = url.trim();
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
};

export const isSafeUrl = (url = '') => /^https?:\/\//i.test(url);

export const download = (filename, text, type = 'application/json') => {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

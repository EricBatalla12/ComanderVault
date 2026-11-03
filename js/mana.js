// Colores de Magic y símbolos de maná dibujados a mano (SVG inline, sin dependencias)

export const COLORS = ['W', 'U', 'B', 'R', 'G'];

export const COLOR_INFO = {
  W: { name: 'Blanco', bg: '#f6efd2', fg: '#3b3320', hex: '#d9c58a' },
  U: { name: 'Azul', bg: '#3f8fd8', fg: '#ffffff', hex: '#3f8fd8' },
  B: { name: 'Negro', bg: '#3a3340', fg: '#e9e1ec', hex: '#7a6a86' },
  R: { name: 'Rojo', bg: '#e2553e', fg: '#ffffff', hex: '#e2553e' },
  G: { name: 'Verde', bg: '#2f9e5a', fg: '#ffffff', hex: '#2f9e5a' },
  C: { name: 'Incoloro', bg: '#b9b4ae', fg: '#2b2925', hex: '#b9b4ae' },
};

// Glifos 24x24 simplificados (sol, gota, calavera, llama, árbol, diamante)
const GLYPHS = {
  W: `<circle cx="12" cy="12" r="4.2"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1"/></g>`,
  U: `<path d="M12 3.2c-.4 0-6.2 7.3-6.2 11.2a6.2 6.2 0 0 0 12.4 0C18.2 10.5 12.4 3.2 12 3.2Zm-2.6 11.3c.3 1.6 1.4 2.6 2.9 2.8.5.1.5.9 0 .9-2.3 0-3.9-1.5-4-3.7 0-.6.9-.6 1.1 0Z"/>`,
  B: `<path fill-rule="evenodd" d="M12 3.5c-4.4 0-7.6 3-7.6 7.1 0 2.4 1.1 4.2 2.8 5.3v2.6c0 .8.6 1.3 1.3 1.3h1.1v-1.6h1v1.6h2.8v-1.6h1v1.6h1.1c.7 0 1.3-.5 1.3-1.3v-2.6c1.7-1.1 2.8-2.9 2.8-5.3 0-4.1-3.2-7.1-7.6-7.1ZM8.9 9.7a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8Zm6.2 0a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8ZM12 13.6l1.1 2.1h-2.2L12 13.6Z"/>`,
  R: `<path d="M12.6 2.8c.6 3-1.3 4.6-2.7 6.3-.5-1-1-1.6-1.9-2.2.3 2.2-2.8 4.2-2.8 8 0 3.5 2.9 6.3 6.8 6.3s6.8-2.7 6.8-6.4c0-5-4.3-7.5-6.2-12Zm-.4 17c-1.8 0-3-1.2-3-2.8 0-2 2-2.8 2.4-4.7 1.6 1.6 3.5 2.8 3.5 4.8 0 1.6-1.2 2.7-2.9 2.7Z"/>`,
  G: `<path d="M12 2.6c-2.6 0-4.4 2-4.4 4.1-1.9.4-3.2 2-3.2 3.9 0 2.3 1.9 4.1 4.3 4.1h1.8v3.8l-2.1 2.1h7.2l-2.1-2.1v-3.8h1.8c2.4 0 4.3-1.8 4.3-4.1 0-1.9-1.3-3.5-3.2-3.9 0-2.1-1.8-4.1-4.4-4.1Z"/>`,
  C: `<path d="M12 3.5 19.5 12 12 20.5 4.5 12Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>`,
};

export const pip = (c, size = 22) => {
  const info = COLOR_INFO[c] || COLOR_INFO.C;
  return `<span class="pip pip-${c}" style="--pip:${size}px" title="${info.name}" role="img" aria-label="${info.name}">
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${GLYPHS[c] || GLYPHS.C}</svg></span>`;
};

export const pips = (colors = [], size = 22) => {
  const list = sortColors(colors);
  if (!list.length) return `<span class="pips">${pip('C', size)}</span>`;
  return `<span class="pips">${list.map((c) => pip(c, size)).join('')}</span>`;
};

export const sortColors = (colors = []) => COLORS.filter((c) => colors.includes(c));

// Nombres de combinaciones (gremios, fragmentos, cuñas...)
const COMBOS = {
  '': 'Incoloro', W: 'Mono blanco', U: 'Mono azul', B: 'Mono negro', R: 'Mono rojo', G: 'Mono verde',
  WU: 'Azorius', UB: 'Dimir', BR: 'Rakdos', RG: 'Gruul', WG: 'Selesnya',
  WB: 'Orzhov', UR: 'Izzet', BG: 'Golgari', WR: 'Boros', UG: 'Simic',
  WUG: 'Bant', WUB: 'Esper', UBR: 'Grixis', BRG: 'Jund', WRG: 'Naya',
  WBG: 'Abzan', WUR: 'Jeskai', UBG: 'Sultai', WBR: 'Mardu', URG: 'Temur',
  WUBR: 'Sin verde (Yore)', UBRG: 'Sin blanco (Glint)', WBRG: 'Sin azul (Dune)',
  WURG: 'Sin negro (Ink)', WUBG: 'Sin rojo (Witch)', WUBRG: 'Cinco colores',
};
export const comboName = (colors = []) => COMBOS[sortColors(colors).join('')] ?? '';

/** Fondo degradado según la identidad de color. */
export const identityGradient = (colors = []) => {
  const list = sortColors(colors);
  const hexes = (list.length ? list : ['C']).map((c) => COLOR_INFO[c].hex);
  if (hexes.length === 1) hexes.push(hexes[0]);
  return `linear-gradient(135deg, ${hexes.join(', ')})`;
};

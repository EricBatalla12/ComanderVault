// Datos de ejemplo para explorar la app

import { uid } from './utils.js';
import { namedImage } from './scryfall.js';

const slug = (n) => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const OPP = ['Yuriko', 'Korvold', 'Kinnan', 'Tymna & Thrasios', 'Lathril', 'Meren', 'Animar', 'Prosper', 'Wilhelt', 'Isshin', 'The Ur-Dragon', 'Light-Paws'];

function games(pattern) {
  // pattern: string tipo "WWLLWDL" del más antiguo al más reciente
  const n = pattern.length;
  return [...pattern].map((ch, i) => ({
    id: uid(),
    date: daysAgo(Math.round(((n - i) / n) * 300) + (i % 3)),
    result: ch === 'W' ? 'win' : ch === 'D' ? 'draw' : 'loss',
    players: i % 5 === 0 ? 3 : 4,
    turns: ch === 'W' ? 7 + (i % 5) : null,
    opponents: [...new Set([OPP[i % OPP.length], OPP[(i * 5 + 3) % OPP.length], OPP[(i * 7 + 1) % OPP.length]])].join(', '),
    notes: '',
    createdAt: new Date(Date.now() - (n - i) * 1000).toISOString(),
  }));
}

const make = (name, colors, typeLine, extra = {}) => ({
  id: uid(),
  name,
  typeLine,
  colors,
  art: namedImage(name, 'art_crop'),
  image: namedImage(name, 'normal'),
  edhrecUri: `https://edhrec.com/commanders/${slug(name)}`,
  scryfallUri: `https://scryfall.com/search?q=${encodeURIComponent(`!"${name}"`)}`,
  ...extra,
});

export const demoCommanders = () => [
  make("Atraxa, Praetors' Voice", ['W', 'U', 'B', 'G'], 'Legendary Creature — Phyrexian Angel Horror', {
    rating: 9, sub: { fun: 8, power: 9, consistency: 8 }, bracket: 3, favorite: true,
    tags: ['proliferate', 'superfriends'],
    links: [{ url: 'https://www.moxfield.com/', label: 'Superfriends (Moxfield)' }],
    notes: 'Planeswalkers + proliferar. Doubling Season es la carta clave.',
    games: games('WLWWLLWWDWLW'),
  }),
  make('Krenko, Mob Boss', ['R'], 'Legendary Creature — Goblin Warrior', {
    rating: 8, sub: { fun: 10, power: 7, consistency: 6 }, bracket: 2,
    tags: ['tokens', 'goblins'],
    links: [{ url: 'https://archidekt.com/', label: 'Goblin Tribal (Archidekt)' }],
    games: games('LWLLWLWLL'),
  }),
  make('Edgar Markov', ['W', 'B', 'R'], 'Legendary Creature — Vampire Knight', {
    rating: 7, sub: { fun: 7, power: 8, consistency: 9 }, bracket: 3,
    tags: ['vampiros', 'aggro'],
    games: games('WWLWLLWW'),
  }),
  make('Muldrotha, the Gravetide', ['U', 'B', 'G'], 'Legendary Creature — Elemental Avatar', {
    rating: 8, sub: { fun: 9, power: 7, consistency: 7 }, bracket: 3, status: 'building',
    tags: ['cementerio', 'value'],
    games: games('LWL'),
  }),
  make('Kenrith, the Returned King', ['W', 'U', 'B', 'R', 'G'], 'Legendary Creature — Human Noble', {
    rating: 5, sub: { fun: 6, power: 5, consistency: 4 }, bracket: 2, status: 'retired',
    tags: ['politics', 'group hug'],
    games: games('LLWLDL'),
    prevWins: 2, prevLosses: 5,
  }),
];

// Logros y estadísticas de rivales, calculados a partir de las partidas registradas

const asc = (games) => [...games].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

function maxWinStreak(games) {
  let best = 0, cur = 0;
  for (const g of asc(games)) {
    cur = g.result === 'win' ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return best;
}

/** Lista de logros con su progreso. `played` son los comandantes de la colección. */
export function computeAchievements(played) {
  const games = played.flatMap((c) => c.games.map((g) => ({ ...g, c })));
  const wins = games.filter((g) => g.result === 'win');
  const totalGames = games.length + played.reduce((a, c) => a + c.prevWins + c.prevLosses + c.prevDraws, 0);
  const streak = Math.max(0, ...played.map((c) => maxWinStreak(c.games)));
  const colorsPlayed = new Set(games.flatMap((g) => g.c.colors));
  const colorsWon = new Set(wins.flatMap((g) => g.c.colors));
  const rated = played.filter((c) => c.rating).length;
  const maxWithOne = Math.max(0, ...played.map((c) => c.games.length + c.prevWins + c.prevLosses + c.prevDraws));
  const fastest = Math.min(Infinity, ...wins.filter((g) => g.turns).map((g) => g.turns));
  const bigTable = wins.some((g) => g.players >= 5);
  const fiveColorWin = wins.some((g) => g.c.colors.length === 5);
  const mythics = played.filter((c) => c.rating >= 9).length;
  const p = (cur, goal) => ({ cur: Math.min(cur, goal), goal });

  return [
    { id: 'first-win', icon: '🗡️', name: 'Primera sangre', desc: 'Gana tu primera partida', ...p(wins.length, 1) },
    { id: 'games-10', icon: '🎲', name: 'Habitual de la mesa', desc: 'Juega 10 partidas', ...p(totalGames, 10) },
    { id: 'games-50', icon: '🛡️', name: 'Veterano', desc: 'Juega 50 partidas', ...p(totalGames, 50) },
    { id: 'games-100', icon: '👑', name: 'Centurión', desc: 'Juega 100 partidas', ...p(totalGames, 100) },
    { id: 'streak-3', icon: '🔥', name: 'En racha', desc: 'Gana 3 seguidas con el mismo comandante', ...p(streak, 3) },
    { id: 'streak-5', icon: '☄️', name: 'Imparable', desc: 'Gana 5 seguidas con el mismo comandante', ...p(streak, 5) },
    { id: 'rainbow', icon: '🌈', name: 'Arcoíris', desc: 'Juega con los cinco colores', ...p(colorsPlayed.size, 5) },
    { id: 'rainbow-win', icon: '✨', name: 'Maestro del maná', desc: 'Gana con los cinco colores', ...p(colorsWon.size, 5) },
    { id: 'wubrg', icon: '🐉', name: 'WUBRG', desc: 'Gana con un comandante de cinco colores', ...p(fiveColorWin ? 1 : 0, 1) },
    { id: 'collector', icon: '📚', name: 'Coleccionista', desc: 'Ten 10 comandantes en tu colección', ...p(played.length, 10) },
    { id: 'critic', icon: '⭐', name: 'Crítico', desc: 'Puntúa 10 comandantes', ...p(rated, 10) },
    { id: 'mythic', icon: '💎', name: 'Mítico', desc: 'Dale 4,5 estrellas o más a un comandante', ...p(mythics, 1) },
    { id: 'loyal', icon: '🤝', name: 'Fiel', desc: 'Juega 20 partidas con el mismo comandante', ...p(maxWithOne, 20) },
    { id: 'speed', icon: '⚡', name: 'Relámpago', desc: 'Gana antes del turno 7', ...p(fastest <= 6 ? 1 : 0, 1) },
    { id: 'big-table', icon: '🏟️', name: 'Mesa grande', desc: 'Gana una partida de 5 o más jugadores', ...p(bigTable ? 1 : 0, 1) },
  ].map((a) => ({ ...a, done: a.cur >= a.goal }));
}

/** Rivales más frecuentes a partir del campo "Rivales" de cada partida. */
export function computeRivals(played) {
  const map = new Map();
  for (const c of played) {
    for (const g of c.games) {
      const names = (g.opponents || '')
        .split(/[,;\n]+/)
        .map((s) => s.replace(/^vs\.?\s+/i, '').trim())
        .filter(Boolean);
      for (const n of new Set(names.map((x) => x.toLowerCase()))) {
        const display = names.find((x) => x.toLowerCase() === n);
        const r = map.get(n) || { name: display, games: 0, wins: 0 };
        r.games++;
        if (g.result === 'win') r.wins++;
        map.set(n, r);
      }
    }
  }
  const list = [...map.values()].map((r) => ({ ...r, wr: r.wins / r.games }));
  const top = list.sort((a, b) => b.games - a.games || a.name.localeCompare(b.name, 'es')).slice(0, 6);
  const nemesis = list.filter((r) => r.games >= 3).sort((a, b) => a.wr - b.wr || b.games - a.games)[0] || null;
  const favorite = list.filter((r) => r.games >= 3).sort((a, b) => b.wr - a.wr || b.games - a.games)[0] || null;
  return { top, nemesis, favorite: favorite && favorite !== nemesis ? favorite : null };
}

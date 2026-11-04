// Efectos visuales: confeti de maná, brillo holográfico, contadores animados y vibración

import { COLOR_INFO, sortColors } from './mana.js';

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const MANA = ['#f6e7b0', '#4fa3e8', '#9a86a8', '#f0634a', '#3fbf6f'];

export function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}

/** Lluvia de confeti con los colores de maná, saliendo desde un elemento (o el centro). */
export function confetti(origin, colors = []) {
  if (reducedMotion()) return;
  const palette = sortColors(colors).map((c) => (c === 'W' ? '#f6e7b0' : COLOR_INFO[c].hex));
  const cols = palette.length ? [...palette, '#f5d48e'] : [...MANA, '#f5d48e'];
  // origin puede ser un elemento o un rectángulo ya medido
  const r = origin?.getBoundingClientRect ? origin.getBoundingClientRect() : origin;
  const ok = r && (r.width || r.height);
  const ox = ok ? r.left + r.width / 2 : innerWidth / 2;
  const oy = ok ? r.top + r.height / 2 : innerHeight / 2.5;

  const canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas';
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  // Si hay una ventana modal abierta, el confeti va dentro para quedar por encima
  (document.querySelector('dialog[open]:not(.closing)') || document.body).appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const parts = Array.from({ length: 90 }, () => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
    const v = 3.5 + Math.random() * 7.5;
    return {
      x: ox + (Math.random() - 0.5) * 30, y: oy,
      vx: Math.cos(a) * v * 1.2, vy: Math.sin(a) * v - 3,
      s: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      c: cols[(Math.random() * cols.length) | 0],
      shape: Math.random() < 0.35 ? 'circle' : 'rect',
      life: 0,
    };
  });

  const start = performance.now();
  const frame = (t) => {
    const elapsed = t - start;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.22;
      p.vx *= 0.98;
      p.vy *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - elapsed / 2000);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.s / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      }
      ctx.restore();
    }
    if (elapsed < 2000) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

/** Celebración de victoria: confeti + vibración corta. */
export function celebrate(origin, colors) {
  confetti(origin, colors);
  vibrate([14, 50, 24]);
}

/** Inclinación 3D y brillo holográfico siguiendo el ratón en las tarjetas. */
export function bindTilt(root, selector = '.cmd-card, .hero-card, .roulette-card') {
  if (reducedMotion()) return;
  let raf = 0;
  root.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest(selector);
    if (!el) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--rx', `${(0.5 - py) * 10}deg`);
      el.style.setProperty('--ry', `${(px - 0.5) * 12}deg`);
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
      el.classList.add('tilting');
    });
  });
  root.addEventListener(
    'pointerout',
    (e) => {
      const el = e.target.closest?.(selector);
      if (!el || el.contains(e.relatedTarget)) return;
      el.classList.remove('tilting');
      ['--rx', '--ry'].forEach((p) => el.style.removeProperty(p));
    },
    true
  );
}

/** Anima los números con [data-count] desde 0. Admite sufijo con data-suffix y decimales con data-dec. */
export function countUp(root) {
  const els = root.querySelectorAll('[data-count]');
  if (!els.length) return;
  const fmt = (v, dec) => v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  if (reducedMotion()) return;
  els.forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const dec = +(el.dataset.dec || 0);
    const suffix = el.dataset.suffix || '';
    if (!Number.isFinite(target) || target === 0) return;
    const t0 = performance.now();
    const dur = 900;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(target * eased, dec) + suffix;
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = fmt(0, dec) + suffix;
    requestAnimationFrame(step);
  });
}

/** Rareza según la valoración (0–10), como los símbolos de expansión de Magic. */
export function rarity(rating = 0) {
  if (rating >= 9) return { key: 'mythic', label: 'Mítico' };
  if (rating >= 7) return { key: 'rare', label: 'Raro' };
  if (rating >= 5) return { key: 'uncommon', label: 'Infrecuente' };
  return { key: 'common', label: 'Común' };
}

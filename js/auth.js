// Pantalla de inicio de sesión / registro

import { $, esc } from './utils.js';
import { pip } from './mana.js';
import * as cloud from './cloud.js';
import { toast } from './ui.js';

const GOOGLE = `<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

let mode = 'signin'; // signin | signup

export function renderLogin(view) {
  document.body.classList.add('auth-mode');
  view.dataset.route = 'login';
  view.innerHTML = `<section class="auth fade-in">
    <div class="auth-hero">
      <div class="auth-pips">${['W', 'U', 'B', 'R', 'G'].map((c, i) => `<span style="--i:${i}">${pip(c, 40)}</span>`).join('')}</div>
      <img src="icons/icon.svg" alt="" width="72" height="72" class="auth-logo">
      <h1>Commander<b>Vault</b></h1>
      <p class="muted">Tus comandantes, sus listas y tu récord de partidas, en todos tus dispositivos.</p>
    </div>
    <div class="auth-card">
      <button class="btn btn-google btn-lg" id="google" type="button">${GOOGLE}<span>Continuar con Google</span></button>
      <div class="auth-sep"><span>o con tu correo</span></div>
      <form id="auth-form" novalidate>
        <label class="field auth-name" ${mode === 'signup' ? '' : 'hidden'}><span class="label">Nombre</span>
          <input name="name" autocomplete="name" placeholder="Cómo quieres que te llamemos"></label>
        <label class="field"><span class="label">Correo electrónico</span>
          <input name="email" type="email" autocomplete="email" inputmode="email" required placeholder="tu@correo.com"></label>
        <label class="field"><span class="label">Contraseña</span>
          <input name="password" type="password" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" required minlength="6" placeholder="Mínimo 6 caracteres"></label>
        <p class="auth-error" role="alert" hidden></p>
        <button class="btn btn-primary btn-lg auth-submit" type="submit">${mode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión'}</button>
      </form>
      <div class="auth-links">
        ${mode === 'signin' ? '<button type="button" class="link-btn" id="forgot">¿Olvidaste tu contraseña?</button>' : ''}
        <span>${mode === 'signup' ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}
          <button type="button" class="link-btn strong" id="switch">${mode === 'signup' ? 'Inicia sesión' : 'Regístrate'}</button></span>
      </div>
    </div>
  </section>`;

  const form = $('#auth-form', view);
  const errBox = $('.auth-error', view);
  const showError = (msg) => {
    errBox.textContent = msg;
    errBox.hidden = !msg;
  };
  const busy = (btn, on) => {
    btn.disabled = on;
    btn.classList.toggle('loading', on);
  };

  $('#google', view).addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    showError('');
    busy(btn, true);
    try {
      await cloud.signInWithGoogle();
    } catch (err) {
      showError(cloud.authErrorMessage(err));
    } finally {
      busy(btn, false);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    const email = form.email.value.trim();
    const password = form.password.value;
    if (!email || !password) return showError('Escribe tu correo y tu contraseña.');
    const btn = $('.auth-submit', form);
    busy(btn, true);
    try {
      if (mode === 'signup') await cloud.signUpWithEmail(email, password, form.name.value.trim());
      else await cloud.signInWithEmail(email, password);
    } catch (err) {
      showError(cloud.authErrorMessage(err));
      busy(btn, false);
    }
  });

  $('#switch', view).addEventListener('click', () => {
    mode = mode === 'signup' ? 'signin' : 'signup';
    const email = form.email.value;
    renderLogin(view);
    $('#auth-form [name=email]', view).value = email;
  });

  $('#forgot', view)?.addEventListener('click', async () => {
    const email = form.email.value.trim();
    if (!email) {
      showError('Escribe tu correo arriba y vuelve a pulsar «¿Olvidaste tu contraseña?».');
      return form.email.focus();
    }
    try {
      await cloud.resetPassword(email);
      showError('');
      toast(`Te hemos enviado un correo a ${email} para cambiar la contraseña`, { icon: '✉️' });
    } catch (err) {
      showError(cloud.authErrorMessage(err));
    }
  });
}

export function renderSplash(view, message = 'Cargando tu bóveda…') {
  view.dataset.route = 'loading';
  view.innerHTML = `<div class="splash"><img src="icons/icon.svg" alt="" width="64" height="64"><span class="spinner"></span><p class="muted">${esc(message)}</p></div>`;
}

export function renderInitError(view, retry) {
  view.dataset.route = 'error';
  view.innerHTML = `<section class="empty"><h1>No se pudo conectar</h1>
    <p class="muted">Revisa tu conexión a internet y vuelve a intentarlo.</p>
    <button class="btn btn-primary" id="retry" type="button">Reintentar</button></section>`;
  $('#retry', view).addEventListener('click', retry);
}

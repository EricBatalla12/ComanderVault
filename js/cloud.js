// Cuenta de usuario y sincronización con Firebase (Auth + Firestore).
//
// Estructura en Firestore:  users/{uid}/commanders/{commanderId}
// Cada documento es un comandante completo (con sus partidas).
//
// Sincronización: escuchamos la colección en tiempo real (onSnapshot) y aplicamos
// los datos al store. Cuando el store cambia por una acción local, comparamos cada
// comandante con la última versión conocida en la nube y subimos solo lo que ha
// cambiado (o borramos lo eliminado) en un único lote.

import { firebaseConfig } from './firebase-config.js';
import * as store from './store.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1';

export const isConfigured = () => !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain);

let fb = null; // módulos cargados
let auth, db;
let currentUser = null;
let unsubSnapshot = null;
let unsubStore = null;
const synced = new Map(); // id → JSON de lo que hay en la nube
let syncState = 'idle'; // idle | syncing | offline | error
const syncListeners = new Set();

export const getUser = () => currentUser;
export const getSyncState = () => syncState;
export const onSyncState = (fn) => (syncListeners.add(fn), () => syncListeners.delete(fn));
const setSync = (s) => {
  syncState = s;
  syncListeners.forEach((fn) => fn(s));
};

/** Carga el SDK e inicializa. Llama a onUser(user|null) cada vez que cambia la sesión. */
export async function init(onUser) {
  const [app, authMod, fsMod] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);
  fb = { ...app, ...authMod, ...fsMod };
  const fbApp = fb.initializeApp(firebaseConfig);
  auth = fb.getAuth(fbApp);
  auth.languageCode = 'es';
  try {
    db = fb.initializeFirestore(fbApp, {
      ignoreUndefinedProperties: true,
      localCache: fb.persistentLocalCache({ tabManager: fb.persistentMultipleTabManager() }),
    });
  } catch {
    db = fb.initializeFirestore(fbApp, { ignoreUndefinedProperties: true });
  }
  // Resultado de un inicio de sesión por redirección (si el popup estaba bloqueado)
  fb.getRedirectResult(auth).catch(() => {});

  fb.onAuthStateChanged(auth, (user) => {
    stopSync();
    currentUser = user;
    if (user) startSync(user);
    onUser(user);
  });
}

// ---------- Autenticación ----------

export async function signInWithGoogle() {
  const provider = new fb.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await fb.signInWithPopup(auth, provider);
  } catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(e.code)) {
      return fb.signInWithRedirect(auth, provider);
    }
    throw e;
  }
}

export const signInWithEmail = (email, password) => fb.signInWithEmailAndPassword(auth, email, password);

export async function signUpWithEmail(email, password, name) {
  const cred = await fb.createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    await fb.updateProfile(cred.user, { displayName: name });
    currentUser = auth.currentUser;
  }
  return cred;
}

export const resetPassword = (email) => fb.sendPasswordResetEmail(auth, email);
export const signOut = () => fb.signOut(auth);

export function authErrorMessage(e) {
  const map = {
    'auth/invalid-email': 'El correo no es válido.',
    'auth/missing-password': 'Escribe la contraseña.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/wrong-password': 'Correo o contraseña incorrectos.',
    'auth/user-not-found': 'No hay ninguna cuenta con ese correo.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Prueba a iniciar sesión.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento y vuelve a probar.',
    'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
    'auth/popup-closed-by-user': 'Has cerrado la ventana de Google antes de terminar.',
    'auth/cancelled-popup-request': 'Has cerrado la ventana de Google antes de terminar.',
    'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase (Authentication → Settings → Authorized domains).',
    'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'La clave de Firebase (apiKey) no es válida: revisa js/firebase-config.js.',
    'auth/invalid-api-key': 'La clave de Firebase (apiKey) no es válida: revisa js/firebase-config.js.',
    'auth/operation-not-allowed': 'Este método de acceso no está activado en Firebase (Authentication → Sign-in method).',
  };
  return map[e?.code] || `No se pudo completar (${e?.code || e?.message || 'error'}).`;
}

// ---------- Sincronización ----------

const json = (c) => JSON.stringify(c);
const colRef = () => fb.collection(db, 'users', currentUser.uid, 'commanders');

function startSync(user) {
  store.useCloud();
  synced.clear();
  setSync('syncing');
  unsubSnapshot = fb.onSnapshot(
    colRef(),
    { includeMetadataChanges: true },
    (snap) => {
      const list = snap.docs.map((d) => store.normalizeCommander({ ...d.data(), id: d.id }));
      synced.clear();
      list.forEach((c) => synced.set(c.id, json(c)));
      // Solo re-pintamos si cambian los datos, no por metadatos
      if (!snap.metadata.hasPendingWrites || !store.getState().ready) store.applyRemote(list);
      setSync(snap.metadata.hasPendingWrites ? 'syncing' : snap.metadata.fromCache ? 'offline' : 'idle');
    },
    (err) => {
      console.error('Error de sincronización', err);
      setSync('error');
      if (!store.getState().ready) store.applyRemote([]);
    }
  );
  unsubStore = store.subscribe((state, { remote }) => {
    if (remote || !currentUser || !state.ready) return;
    pushChanges(state.commanders);
  });
}

function stopSync() {
  unsubSnapshot?.();
  unsubStore?.();
  unsubSnapshot = unsubStore = null;
  synced.clear();
}

function pushChanges(commanders) {
  const ops = [];
  const ids = new Set();
  for (const c of commanders) {
    ids.add(c.id);
    const j = json(c);
    if (synced.get(c.id) !== j) {
      ops.push({ type: 'set', c });
      synced.set(c.id, j);
    }
  }
  for (const id of [...synced.keys()]) {
    if (!ids.has(id)) {
      ops.push({ type: 'delete', id });
      synced.delete(id);
    }
  }
  if (!ops.length) return;
  setSync('syncing');
  // Firestore admite 500 operaciones por lote
  for (let i = 0; i < ops.length; i += 450) {
    const batch = fb.writeBatch(db);
    ops.slice(i, i + 450).forEach((op) => {
      const ref = fb.doc(colRef(), op.type === 'set' ? op.c.id : op.id);
      op.type === 'set' ? batch.set(ref, JSON.parse(json(op.c))) : batch.delete(ref);
    });
    batch.commit().catch((e) => {
      console.error('No se pudo guardar en la nube', e);
      setSync('error');
    });
  }
}

# CommanderVault 🛡️

Web para **móvil y escritorio** para puntuar los comandantes de Magic: The Gathering que has jugado, guardar los enlaces a sus listas (Moxfield, Archidekt, EDHREC…), llevar el registro de victorias y derrotas y apuntar los que quieres jugar. Con **inicio de sesión**, tus datos están en todos tus dispositivos.

## Funcionalidades

- **Cuenta de usuario**: entra con Google o con correo y contraseña. Los datos se sincronizan al momento entre el móvil, el ordenador y cualquier dispositivo donde inicies sesión.
- **Colección**: los comandantes que has jugado, con búsqueda, filtro por colores, estado y favoritos, y varios órdenes.
- **Por jugar**: lista de comandantes que quieres probar, con prioridad (alta, media o baja), bracket objetivo, notas, etiquetas y enlaces. Con «Lo he jugado» pasan a tu colección.
- **Búsqueda de cartas en Scryfall**: el arte, la imagen, el tipo y la identidad de color se rellenan solos. Admite compañeros y trasfondos.
- **Valoración** de 0,5 a 5 estrellas, más notas de *Diversión*, *Potencia* y *Consistencia*.
- **Enlaces a mazos** con detección del sitio (Moxfield, Archidekt, EDHREC, TappedOut, MTGGoldfish…).
- **Récord de partidas**: botones rápidos de victoria y derrota, o registro detallado (fecha, jugadores, turno, rivales, versión del mazo, notas). Todo se puede deshacer.
- **Estadísticas**: winrate global, actividad mensual, winrate por color y rankings.
- **Tema oscuro y claro**, exportar e importar copias (JSON) y exportar partidas a CSV.

## Puesta en marcha

### 1. Configurar Firebase (inicio de sesión y base de datos)

Firebase es el servicio de Google que guarda las cuentas y los datos. El plan gratuito es más que suficiente.

1. Entra en <https://console.firebase.google.com> con tu cuenta de Google y pulsa **Crear un proyecto** (por ejemplo `commandervault`). Google Analytics no hace falta.
2. **Registrar la web**: en la página del proyecto pulsa el icono **`</>`** (Web), ponle un nombre y pulsa **Registrar app**. No marques Firebase Hosting.
   Te mostrará un bloque `const firebaseConfig = { apiKey: "...", ... }`. **Copia esos valores** en el archivo [`js/firebase-config.js`](js/firebase-config.js). Puedes editarlo desde la web de GitHub (icono del lápiz).
3. **Activar el inicio de sesión**: menú **Compilación → Authentication → Comenzar**. En la pestaña **Método de inicio de sesión** activa:
   - **Google**: elige tu correo de asistencia y guarda.
   - **Correo electrónico/contraseña**: activa el primer interruptor y guarda.
4. **Autorizar tu dominio**: en **Authentication → Configuración → Dominios autorizados** pulsa **Agregar dominio** y añade `ericbatalla12.github.io`.
5. **Crear la base de datos**: menú **Compilación → Firestore Database → Crear base de datos**. Elige una ubicación en Europa (por ejemplo `eur3`) y empieza en **modo de producción**.
6. **Reglas de seguridad**: en Firestore, pestaña **Reglas**, borra lo que haya, pega el contenido de [`firestore.rules`](firestore.rules) y pulsa **Publicar**. Así cada usuario solo puede ver y modificar sus propios datos.

> Los valores de `firebase-config.js` no son secretos: identifican tu proyecto, y la protección la dan las reglas del paso 6.
>
> Si `firebase-config.js` se deja vacío, la web funciona en **modo local** (sin cuenta, datos solo en ese dispositivo).

### 2. Publicar la web (GitHub Pages)

1. En GitHub: **Settings → Pages**.
2. **Source**: `Deploy from a branch`. **Branch**: la rama con el código (por ejemplo `main`) y la carpeta `/ (root)`. Pulsa **Save**.
3. En 1 o 2 minutos estará en <https://ericbatalla12.github.io/ComanderVault/>.

Ábrela desde cualquier navegador (móvil u ordenador) e inicia sesión.

### 3. Instalarla como app

- **Android**: ábrela en **Chrome** (o Samsung Internet) y pulsa **Instalar app**, o menú ⋮ → **Instalar aplicación**. Se instala como una app de verdad: en el cajón de aplicaciones y sin el icono del navegador. *Brave solo crea un acceso directo con su logo encima, por eso conviene instalarla desde Chrome; después puedes seguir usando Brave para todo lo demás.*
- **iPhone / iPad**: ábrela en **Safari** → **Compartir** → **Añadir a pantalla de inicio**.
- **Windows / macOS / Linux**: en **Chrome** o **Edge**, icono de instalar en la barra de direcciones.

Ajustes → **App** muestra las instrucciones adecuadas para cada dispositivo.

> Al cambiar archivos de la app, sube `VERSION` en `sw.js` para que los dispositivos con la app instalada reciban la actualización.

### Datos de antes de iniciar sesión

Si usaste la web sin cuenta, la primera vez que inicies sesión en ese dispositivo te preguntará si quieres añadir esos comandantes a tu cuenta.

## Desarrollo local

No necesita compilación ni dependencias:

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

Para probar el inicio de sesión en local, añade `localhost` a los dominios autorizados de Firebase (viene añadido por defecto).

```
index.html            · estructura
css/app.css           · estilos (tema oscuro/claro, responsive)
js/app.js             · arranque, sesión, rutas y tema
js/firebase-config.js · configuración de tu proyecto de Firebase
js/cloud.js           · inicio de sesión y sincronización (Firebase Auth + Firestore)
js/auth.js            · pantalla de inicio de sesión
js/store.js           · estado de la app y estadísticas
js/views.js           · colección, detalle, estadísticas y ajustes
js/wishlist.js        · pestaña «Por jugar»
js/forms.js           · formularios (comandante, partida, menú añadir)
js/ui.js              · componentes (estrellas, anillo, tarjetas, modales, avisos)
js/scryfall.js        · búsqueda en la API de Scryfall
js/mana.js            · símbolos de maná y combinaciones de color
js/demo.js            · datos de ejemplo
firestore.rules       · reglas de seguridad de la base de datos
manifest.webmanifest  · datos para instalarla como app
sw.js                 · service worker (instalación y uso sin conexión)
```

En Firestore, cada comandante es un documento en `users/{uid}/commanders/{id}`, con sus partidas dentro.

---

Datos e imágenes de cartas por [Scryfall](https://scryfall.com). Magic: The Gathering es marca de Wizards of the Coast; esta app no es oficial.

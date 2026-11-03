# CommanderVault 🛡️

App para **móvil y escritorio** para puntuar los comandantes de Magic: The Gathering que has jugado, guardar los enlaces a sus listas (Moxfield, Archidekt, EDHREC…) y llevar el registro de victorias y derrotas.

Es una **PWA** (Progressive Web App): una sola base de código que se instala como app en Android, iOS, Windows, macOS y Linux, y funciona **sin conexión**.

## Funcionalidades

- **Búsqueda de cartas en Scryfall**: escribe el nombre y se rellenan solos el arte, la imagen de la carta, el tipo y la identidad de color.
- **Compañeros y trasfondos** (Partner, Background, Friends forever…), con arte combinado.
- **Valoración** de 0,5 a 5 estrellas, más subvaloraciones de *Diversión*, *Potencia* y *Consistencia*.
- **Enlaces a mazos**: varios por comandante, con detección automática del sitio (Moxfield, Archidekt, EDHREC, TappedOut, MTGGoldfish, Deckstats, AetherHub, ManaBox…). Enlace a EDHREC y Scryfall automático.
- **Récord de partidas**: botones rápidos de *Victoria* / *Derrota* en cada carta o registro detallado (fecha, nº de jugadores, turno, rivales, versión del mazo, notas). Todo se puede deshacer.
- **Récord previo**: añade las victorias y derrotas que tenías antes de usar la app.
- **Detalle de cada comandante**: winrate, racha actual, últimos 15 resultados, turno medio de victoria, historial completo.
- **Bracket** (1–5) y **estado** (en uso, en construcción, retirado), **favoritos**, **etiquetas** y **notas**.
- **Colección** con búsqueda, filtro por colores, por estado y favoritos, y orden por actividad, valoración, winrate, partidas o nombre.
- **Estadísticas**: winrate global, actividad de los últimos 12 meses, winrate por color, rankings (mejor valorados, mejor winrate, más jugados) y comparación con el winrate esperado por azar según el tamaño de mesa.
- **Registrar partida** desde cualquier sitio (botón 🏆 en la barra inferior / superior).
- **Tema oscuro y claro** (o automático según el sistema).
- **Copias de seguridad**: exporta/importa JSON para pasar tus datos entre dispositivos, y exporta las partidas a CSV (Excel, Sheets…).
- Atajos de teclado en escritorio: `n` nuevo comandante, `/` buscar.

Los datos se guardan **solo en tu dispositivo** (localStorage). No hay servidor ni cuentas.

## Publicarla (GitHub Pages)

1. Fusiona esta rama en `main`.
2. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. El workflow `.github/workflows/pages.yml` la publica en `https://<usuario>.github.io/<repo>/`.

## Instalarla

- **Android (Chrome)**: abre la web → menú ⋮ → *Instalar app* (o el botón *Instalar app* de la propia web).
- **iPhone / iPad (Safari)**: botón *Compartir* → *Añadir a pantalla de inicio*.
- **Windows / macOS / Linux (Chrome o Edge)**: icono de instalar en la barra de direcciones, o *Ajustes → Instalar CommanderVault*.

## Desarrollo local

No necesita compilación ni dependencias. Sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

Estructura:

```
index.html             · estructura de la app
css/app.css            · estilos (tema oscuro/claro, responsive)
js/app.js              · arranque, rutas, tema, instalación
js/views.js            · colección, detalle, estadísticas y ajustes
js/forms.js            · formularios de comandante y partida
js/ui.js               · componentes (estrellas, anillo, tarjetas, modales, toasts)
js/store.js            · datos en localStorage y estadísticas
js/scryfall.js         · búsqueda en la API de Scryfall
js/mana.js             · símbolos de maná y combinaciones de color
js/demo.js             · datos de ejemplo
sw.js                  · service worker (uso sin conexión)
manifest.webmanifest   · manifiesto PWA
```

> Si cambias archivos de la app, sube la constante `VERSION` en `sw.js` para que los dispositivos instalados reciban la actualización.

---

Datos e imágenes de cartas por [Scryfall](https://scryfall.com). Magic: The Gathering es marca de Wizards of the Coast; esta app no es oficial.

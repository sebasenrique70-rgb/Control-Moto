# Control de plata — moto

App local (PWA) para controlar efectivo, cuenta y saldo pendiente en Yango/Didi/particulares, con deuda de arriendo y ganancia neta. Guarda todo en el propio celular (IndexedDB) y funciona sin internet.

## Qué hay en esta carpeta

```
index.html          la app (ábrela con doble clic para probarla en el navegador de tu PC)
manifest.json        config de instalación (nombre, ícono, colores)
sw.js                 service worker: deja todo cacheado para que funcione offline
storage.js            guardado local (reemplaza lo que antes hacía claude.ai)
fonts/                Poppins y Space Mono, auto-hospedadas
icons/                ícono de la app en todos los tamaños
```

No borres ni muevas nada de sitio — `index.html` busca los demás archivos por su ruta relativa (`fonts/…`, `icons/…`, etc).

## Antes que nada: probarla

Antes de subir nada, probá que todo funcione:
1. Abrí `index.html` con doble clic — se abre en tu navegador normal.
2. Registrá un movimiento de prueba, cerrá la pestaña, volvela a abrir: si el movimiento sigue ahí, el guardado local está funcionando.
3. Si algo se ve raro, avisame antes de seguir con los pasos de abajo.

---

## Paso 1 — Subir la app a una URL fija y gratis (GitHub Pages)

PWABuilder necesita una URL real donde viva tu app para poder empaquetarla. GitHub Pages te da una gratis y estable, sin depender de claude.ai.

1. Si no tenés cuenta, creá una gratis en **github.com**.
2. Creá un repositorio nuevo — botón verde "New". Nombre sugerido: `control-moto`. Marcalo como **público** (Pages gratis lo necesita) y dale "Create repository".
3. En la página del repo recién creado, buscá el link **"uploading an existing file"** (o el botón "Add file" → "Upload files").
4. Arrastrá **todos** los archivos y carpetas de esta entrega (`index.html`, `manifest.json`, `sw.js`, `storage.js`, la carpeta `fonts` completa, la carpeta `icons` completa) y dale "Commit changes".
5. Andá a **Settings** (del repo) → **Pages** (en el menú de la izquierda).
6. En "Build and deployment" → "Source", elegí **"Deploy from a branch"**, rama `main`, carpeta `/ (root)` → **Save**.
7. Esperá 1-2 minutos y recargá esa misma página: arriba te va a aparecer la URL pública, algo como `https://tu-usuario.github.io/control-moto/`.

Guardá esa URL — es la que vas a usar de acá en más, incluso desde el celular directo (Chrome → "Agregar a pantalla de inicio" ya te la deja bastante nativa).

## Paso 2 — Generar el APK real con PWABuilder

1. Andá a **pwabuilder.com** desde cualquier navegador.
2. Pegá tu URL de GitHub Pages (la del paso 1) y dale "Start".
3. PWABuilder va a analizar la app — deberías ver el manifest, el service worker y los íconos en verde. Si algo sale en amarillo/rojo, mandame la captura y lo ajustamos.
4. Buscá la opción **"Package for stores"** (o "Store package") y elegí **Android**.
5. En las opciones del paquete Android:
   - Dejá el nombre de paquete que te sugiere (o ponelo vos, ej. `com.sebastian.controlmoto`) — una vez publicado no se puede cambiar.
   - **Signing key**: elegí "Create new" para que PWABuilder genere una firma nueva y te la incluya en la descarga. **Guardá ese archivo de firma en un lugar seguro** — si el día de mañana querés actualizar la app con el mismo ícono/nombre en el mismo teléfono sin desinstalar, vas a necesitar la misma firma.
6. Dale a generar/descargar. Te va a bajar un `.zip` que adentro tiene el **APK firmado, listo para instalar**.
7. También te va a dar un archivo `assetlinks.json` — subilo a tu repo de GitHub dentro de una carpeta `.well-known/` (creála) para que la app abra sin barra de navegador (pantalla completa de verdad). Si te saltás este paso la app igual funciona, solo que se ve una barrita de Chrome arriba.

## Paso 3 — Instalar el APK en tu celular

1. Pasate el `.apk` al celular (por cable, Google Drive, WhatsApp a vos mismo, lo que te resulte más fácil).
2. Abrilo desde el explorador de archivos del celular. Android va a pedirte permiso para "instalar apps de esta fuente" — aceptalo (es un permiso puntual para ese instalador, no baja la seguridad del teléfono en general).
3. Listo — te va a quedar como cualquier otra app instalada, con su ícono propio.

## Actualizar la app más adelante

Si más adelante querés cambiar algo (arreglar un detalle, agregar una función):
1. Pedime el cambio, te dejo los archivos actualizados.
2. Subís los archivos nuevos a tu mismo repo de GitHub (reemplazando los viejos).
3. Volvés a pwabuilder.com con la misma URL, generás un APK nuevo **usando el mismo archivo de firma** del paso 2, y lo reinstalás encima del anterior — no perdés tus datos porque viven en el propio teléfono, no en el APK.

## Respaldo de tus datos

Como todo queda guardado en el celular (no en una nube), hacé de vez en cuando **Ajustes → Exportar respaldo (.csv)** dentro de la app. Así, si cambiás de teléfono o reinstalás, tenés tu historial a mano aunque tengas que cargarlo de nuevo a mano.

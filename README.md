# FinanzasPWA

Aplicación de finanzas personales en español. Los movimientos se guardan en `localStorage` en el navegador; no requiere cuenta ni servidor. La PWA guarda sus archivos estáticos para volver a abrirla sin conexión.

## Decisiones técnicas

- React y TypeScript estricto con Vite; Tailwind CSS v4 mediante `@tailwindcss/vite`.
- Los montos se ingresan como texto y los totales se calculan en centavos enteros.
- Los movimientos y ajustes usan claves versionadas y se validan al cargarse o importarse.
- El historial, resumen y gráfica son selectores puros; la interfaz no necesita una librería de gráficos.
- Workbox genera el service worker durante la compilación para admitir nombres de archivos con hash.
- GitHub Pages compila con `BASE_PATH` para la subruta; Vercel usa la raíz por defecto.
- No se sincronizan datos entre dispositivos. Usa el respaldo JSON para moverlos.

## 1. Requisitos

Instala Node.js 22 LTS (mínimo 20.19), Git y un editor de texto. Comprueba las herramientas desde una terminal:

```sh
node --version
npm --version
git --version
```

## 2. Crear el proyecto e instalar paquetes

Para crear una copia nueva con Vite:

```sh
npm create vite@latest finanzas-pwa -- --template react-ts
cd finanzas-pwa
```

Instala las dependencias de ejecución:

```sh
npm install react react-dom lucide-react
```

Instala las herramientas de desarrollo:

```sh
npm install -D vite @vitejs/plugin-react typescript @types/node tailwindcss @tailwindcss/vite vite-plugin-pwa @vite-pwa/assets-generator eslint @eslint/js globals eslint-plugin-react-hooks eslint-plugin-react-refresh typescript-eslint
```

En una copia ya preparada, conserva `package-lock.json` y ejecuta `npm ci` para instalar exactamente las versiones registradas.

## 3. Archivos del proyecto

Reemplaza los archivos de configuración y la carpeta `src/` con los de este proyecto. Conserva `index.html`, `public/manifest.json`, `public/icon.svg`, `public/favicon.svg` y `.github/workflows/deploy.yml`. Puedes borrar los archivos de demostración de Vite, como `src/App.css`, `src/assets/react.svg` y `public/vite.svg`, si aparecen.

La lógica está separada en `src/lib/`, `src/hooks/` y `src/components/`. `src/App.tsx` conecta esas piezas.

## 4. Crear los iconos de instalación

El archivo fuente es `public/icon.svg`; la configuración está en `pwa-assets.config.ts`. Genera los PNG con:

```sh
npm run generate-pwa-assets
```

El generador debe crear `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png` y `apple-touch-icon-180x180.png` en `public/`. Esos nombres coinciden con `public/manifest.json` y la etiqueta Apple Touch Icon de `index.html`.

## 5. Desarrollo y prueba de la PWA

Inicia el servidor de desarrollo:

```sh
npm run dev
```

Para comprobar instalación y funcionamiento sin conexión, usa la compilación de producción:

```sh
npm run build
npm run preview
```

Abre <http://localhost:4173>, instala o recarga la app y revisa las herramientas del navegador en **Application → Manifest** y **Application → Service Workers**. El service worker se genera dentro de `dist/` al compilar: Vite agrega hashes a los archivos, por eso no existe una lista manual fija ni un `sw.js` escrito a mano. En **Network**, activa **Offline** y recarga para confirmar que vuelve a abrir. Registra un movimiento y recarga para comprobar que permanece guardado.

Ejecuta también el analizador estático:

```sh
npm run lint
```

## 6. Publicar en GitHub Pages

1. Crea un repositorio en GitHub, por ejemplo `finanzas-pwa`.
2. Desde la carpeta del proyecto, crea y publica la rama principal:

   ```sh
   git init
   git add .
   git commit -m "Crear FinanzasPWA"
   git branch -M main
   git remote add origin https://github.com/USUARIO/finanzas-pwa.git
   git push -u origin main
   ```

3. En el repositorio, abre **Settings → Pages** y elige **GitHub Actions** como fuente.
4. El workflow de `.github/workflows/deploy.yml` instala con `npm ci`, genera iconos, compila con `BASE_PATH=/<nombre-del-repositorio>/` y publica `dist/`.
5. La URL final tendrá este formato: `https://USUARIO.github.io/finanzas-pwa/`.

Incluye `package-lock.json` en el repositorio; el workflow lo necesita para `npm ci`.

## 7. Publicar en Vercel

Importa el repositorio en Vercel y selecciona el preset **Vite**, el comando de compilación `npm run build` y la carpeta de salida `dist`. No configures `BASE_PATH` en Vercel; el valor por defecto `/` sirve el sitio en la raíz del dominio. También puedes usar la CLI de Vercel e importar el mismo proyecto.

## 8. Instalar y desinstalar

- **Android:** abre el sitio en Chrome y usa «Instalar aplicación» o «Añadir a pantalla de inicio».
- **iPhone o iPad:** abre el sitio en Safari, toca **Compartir** y elige **Añadir a pantalla de inicio**.
- **Chrome o Edge en computador:** usa el icono de instalación en la barra de direcciones o la opción de instalación en el menú.
- **Safari en macOS:** usa **Archivo → Añadir al Dock**.
- **Firefox de escritorio:** no ofrece instalación de esta PWA; abre el sitio en Chrome o Edge.

Para desinstalarla, usa la opción de quitar o desinstalar del menú de la aplicación o del navegador.

## 9. Datos, actualizaciones y privacidad

La instalación requiere HTTPS o `localhost`. Los datos viven en el almacenamiento local de cada navegador y dispositivo; no se sincronizan. Exporta un respaldo JSON en Ajustes e impórtalo en otro dispositivo para trasladarlos. Borrar los datos del sitio en el navegador elimina también los movimientos guardados allí.

Cuando publicas una versión nueva, la PWA la descarga en segundo plano y muestra **Nueva versión disponible**. Pulsa **Actualizar** para aplicarla. La app consulta si hay actualizaciones cada hora cuando tiene conexión.

## 10. Solución de problemas

- **No aparece el botón de instalar:** verifica HTTPS, que el manifiesto y todos los iconos carguen, y abre el menú del navegador. En iOS usa Compartir → Añadir a pantalla de inicio.
- **La app no se actualiza:** confirma que el sitio está en línea, recarga una vez y acepta el botón de actualización. En DevTools puedes revisar el estado del service worker.
- **No cargan los iconos:** vuelve a ejecutar `npm run generate-pwa-assets` y confirma que los cuatro PNG tengan los nombres descritos arriba.
- **Pantalla en blanco en GitHub Pages:** comprueba que Pages use GitHub Actions y que el repositorio se publique con `BASE_PATH=/<nombre-del-repositorio>/`. Vercel debe usar `/`.
- **El respaldo no se importa:** acepta archivos JSON de hasta 5 MB; las entradas inválidas se rechazan antes de cambiar los datos.

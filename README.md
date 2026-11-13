# FinanzasPWA

Aplicación de finanzas personales en español. Supabase Auth gestiona las cuentas y PostgreSQL guarda los movimientos, presupuestos y ajustes de cada usuario. La PWA conserva una caché separada por cuenta para consultar datos y encolar cambios sin conexión; los envía a Supabase al recuperar la conexión.

## Decisiones técnicas

- React y TypeScript estricto con Vite; Tailwind CSS v4 mediante `@tailwindcss/vite`.
- Los montos se ingresan como texto y los totales se calculan en centavos enteros.
- Los movimientos y ajustes usan claves versionadas y se validan al cargarse o importarse.
- El historial, resumen y gráfica son selectores puros; la interfaz no necesita una librería de gráficos.
- Workbox genera el service worker durante la compilación para admitir nombres de archivos con hash.
- GitHub Pages compila con `BASE_PATH` para la subruta; Vercel usa la raíz por defecto.
- Supabase Auth y Row Level Security (RLS) aíslan los datos por usuario; el frontend usa únicamente la clave publicable.
- Los datos locales de la versión anterior se migran a la primera cuenta que inicia sesión en ese navegador. Conserva un respaldo antes de migrar.

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

## 9. Configurar Supabase Free

### Crear el proyecto y aplicar la base de datos

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard) con el plan Free y guarda la contraseña de base de datos en un administrador de contraseñas. La contraseña de PostgreSQL no se usa en el frontend.
2. Abre **SQL Editor → New query** en tu proyecto, pega el contenido completo de `supabase/migrations/20261112000000_finanzas_cloud.sql` y ejecútalo. La migración crea `profiles`, `categories`, `transactions` y `budgets`, sus índices, las políticas RLS y las funciones de importación/borrado.
3. En **Authentication → Sign In / Providers**, habilita **Email** y deja activada la confirmación de correo.
4. En **Authentication → URL Configuration**, configura:
   - **Site URL:** `https://oficialmegamente4-creator.github.io/finanzas-pwa/`
   - **Redirect URLs:** agrega esa misma URL y, para desarrollo local, `http://localhost:5173/`, `http://127.0.0.1:5173/` y `http://localhost:4173/`.
5. Para probar el envío de confirmación o recuperación, el SMTP predeterminado de Supabase solo envía a integrantes de la organización y está limitado a 2 mensajes por hora. Para permitir registros de cualquier correo, configura un proveedor SMTP en **Authentication → SMTP Settings**. Revisa los [límites actuales del correo](https://supabase.com/docs/guides/auth/auth-smtp).

### Conectar el frontend local

1. En **Connect** del proyecto, copia el **Project URL** y la **Publishable key** (`sb_publishable_...`). También puedes obtenerlas en **Settings → API Keys**.
2. Copia `.env.example` como `.env.local` y completa:

   ```dotenv
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TU_CLAVE
   ```

3. Ejecuta `npm run dev`, crea una cuenta e inicia sesión. No pegues aquí la contraseña de PostgreSQL ni una clave `sb_secret_...` o `service_role`: la clave publicable es visible en una app web y las políticas RLS son las que protegen las filas.

`.env.local` está excluido de Git. `.env.example` solo contiene nombres vacíos y sí se puede publicar.

### Conectar GitHub Pages

1. En el repositorio, abre **Settings → Secrets and variables → Actions → Variables** y crea estas dos variables con los mismos valores públicos del proyecto:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
2. En **Settings → Pages**, selecciona **GitHub Actions** como fuente. El workflow `.github/workflows/deploy.yml` compila la app con esas variables y publica `dist/` al hacer push a `main`.
3. Revisa **Actions** y espera que los trabajos de compilación y publicación terminen correctamente. La app publicada es `https://oficialmegamente4-creator.github.io/finanzas-pwa/`.
4. Abre esa URL y registra una cuenta. GitHub Actions comprueba ambas variables antes de compilar y no publica si falta una o si la clave no empieza con `sb_publishable_`. En desarrollo local sin variables, la app muestra el aviso de configuración en vez del formulario de acceso.

GitHub Pages sirve su dominio `github.io` por HTTPS. Mantén la URL HTTPS y no agregues recursos HTTP mixtos; si usas un dominio personalizado, activa **Enforce HTTPS** en **Settings → Pages** cuando GitHub lo habilite. Consulta [publicar con GitHub Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) y [HTTPS en GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).

### Comprobar aislamiento y sincronización

La migración configura RLS y políticas separadas `SELECT`, `INSERT`, `UPDATE` y `DELETE` en cada tabla, todas limitadas a `auth.uid() = user_id`. Puedes revisar el SQL y las pruebas de aislamiento en `supabase/tests/database/finance_rls_test.sql`.

Para ejecutar las pruebas de base de datos en un entorno local necesitas Docker Desktop y Supabase CLI:

```sh
npx supabase start
npx supabase test db
npx supabase stop
```

El proyecto incluye pruebas de interfaz de cuenta y caché que corren con `npm run test`. También ejecuta `npm run lint` y `npm run build`. Las pruebas locales no sustituyen una comprobación con un proyecto real: después de configurar credenciales, registra dos cuentas y confirma que cada una solo ve sus propios movimientos.

## 10. Datos, actualizaciones y privacidad

Al iniciar sesión, la app descarga los datos de la cuenta y guarda una copia local por usuario. Los cambios se envían a Supabase; si se pierde la conexión, los cambios compatibles quedan pendientes en la caché y se reintentan al volver a estar en línea. Los borrados y reemplazos de respaldos requieren conexión para confirmarse antes de cambiar los datos remotos.

Al iniciar sesión en otro dispositivo se recuperan los datos de Supabase. Exporta un respaldo JSON desde **Ajustes** con regularidad. La migración de `localStorage` antiguo conserva la copia local hasta que se confirma la escritura en la nube; inicia sesión primero con la cuenta a la que deben pertenecer esos datos y no borres los datos del sitio antes de ver que terminó la migración. `localStorage` solo se comparte dentro del mismo navegador y origen (protocolo, dominio y puerto); si los datos están en una dirección distinta, exporta el respaldo en la versión antigua e impórtalo después de iniciar sesión en la nueva.

Supabase Free tiene límites de uso y puede pausar proyectos con poca actividad durante una semana; al volver a abrirlos, los datos permanecen en el proyecto. Consulta los [límites actuales del plan Free](https://supabase.com/pricing) y [cómo funciona la pausa](https://supabase.com/docs/guides/platform/free-project-pausing). El plan Free no incluye copias de seguridad automáticas de base de datos, por eso conviene conservar respaldos JSON.

La instalación requiere HTTPS o `localhost`. Cuando publicas una versión nueva, la PWA la descarga en segundo plano y muestra **Nueva versión disponible**. Pulsa **Actualizar** para aplicarla; la app consulta si hay actualizaciones cada hora cuando tiene conexión. Actualizar la app no borra los datos guardados en Supabase.

## 11. Solución de problemas

- **No aparece el botón de instalar:** verifica HTTPS, que el manifiesto y todos los iconos carguen, y abre el menú del navegador. En iOS usa Compartir → Añadir a pantalla de inicio.
- **La app no se actualiza:** confirma que el sitio está en línea, recarga una vez y acepta el botón de actualización. En DevTools puedes revisar el estado del service worker.
- **No cargan los iconos:** vuelve a ejecutar `npm run generate-pwa-assets` y confirma que los cuatro PNG tengan los nombres descritos arriba.
- **Aviso de configuración de Supabase:** revisa que estén creadas las dos variables de GitHub Actions y vuelve a ejecutar el workflow desde **Actions**.
- **No llega la confirmación o recuperación por correo:** revisa las URL de Auth y el SMTP; el SMTP predeterminado solo envía a integrantes del equipo de Supabase y tiene un límite bajo.
- **La página avisa que no es segura:** abre la URL `https://oficialmegamente4-creator.github.io/finanzas-pwa/`, no una dirección `http://`. Para dominio propio, revisa DNS y **Enforce HTTPS** en Pages.
- **Pantalla en blanco en GitHub Pages:** comprueba que Pages use GitHub Actions y que el repositorio se publique con `BASE_PATH=/<nombre-del-repositorio>/`. Vercel debe usar `/`.
- **El respaldo no se importa:** acepta archivos JSON de hasta 5 MB; las entradas inválidas se rechazan antes de cambiar los datos.

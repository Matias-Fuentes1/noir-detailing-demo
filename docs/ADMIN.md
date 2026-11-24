# Panel de administración · NOIR Detailing

El panel está en **`/admin`**. Desde ahí el dueño del local cambia textos, fotos, servicios, precios, promociones y datos de contacto, y atiende las consultas del cotizador, sin tocar código.

## Cómo funciona (en una página)

```
Panel /admin ──(login Supabase Auth)──▶ Supabase
   │  edita el BORRADOR                     ├─ contenido: 'borrador' y 'publicado' (un documento JSON)
   │  "Publicar" ─────────────────────────▶ ├─ contenido_versiones (últimas 30 publicaciones)
   │                                         ├─ consultas + consulta_historial
   │                                         ├─ eventos (visitas y clics en WhatsApp)
   │                                         └─ Storage 'medios' (fotos)
   │
Web pública "/" ──▶ api/pagina.js ──lee 'publicado'──▶ arma el HTML con build/pagina.mjs
Cotizador ──▶ api/consultas.js ──recalcula el precio y guarda──▶ consultas ──▶ abre WhatsApp
```

- **Una sola fuente de verdad.** Todo el contenido es un documento JSON con la forma de `src/config/negocio.json` (que queda como respaldo si Supabase no responde). `src/js/contenido.js` lo normaliza y `src/js/calculo.js` es el **único** lugar donde se calcula un precio. Lo usan la web, la API y el simulador del panel.
- **Borrador y publicado.** El panel guarda en el borrador. **Vista previa** muestra la web con el borrador (incluso con cambios todavía sin guardar). **Publicar** lo copia a la web, que se actualiza en menos de un minuto (caché de 60 s en Vercel) sin volver a desplegar.
- **La web sigue igual.** El HTML se arma en el servidor con el mismo código de siempre, así que se ve sin JavaScript y conserva el diseño, las animaciones y el cotizador. El navegador recibe los datos en `<script id="datos-negocio">`.
- **Precio de tarjeta y precio del cotizador son campos distintos.** El “Desde” de cada servicio (`precio`) no entra en la fórmula. El cotizador usa `precioCotizador`.
- **Consultas.** Antes de abrir WhatsApp, el cotizador manda la selección a `/api/consultas` sin esperar respuesta, así WhatsApp abre al instante. El servidor recalcula el precio con lo publicado (ignora el total que manda el navegador), arma el mensaje con un código de referencia (`N-XXXXXX`) que viaja en el WhatsApp y la guarda.
- **Medición propia.** `/api/evento` registra visitas y clics en WhatsApp sin cookies y sin guardar la IP (solo un hash anónimo que cambia cada día).

## Seguridad

| Quién | Puede |
|---|---|
| Público (clave *publishable*) | Leer el contenido **publicado**. Nada más. |
| Usuario logueado que no está en `admins` | Lo mismo que el público. |
| Admin (está en la tabla `admins`) | Leer y editar el borrador, publicar, ver versiones, ver y gestionar consultas (**solo estado y notas**: el precio y los datos del cliente no se pueden cambiar) y subir o borrar fotos del bucket `medios`. |
| Servidor (clave *secret*, solo en `/api` y scripts) | Insertar consultas y eventos ya validados, leer lo publicado y dar de alta admins. |

- RLS activo en todas las tablas, más permisos explícitos por rol (`20261124000003_permisos.sql`): los proyectos nuevos de Supabase no dan permisos automáticos.
- La clave secreta nunca va con prefijo `VITE_`, así que Vite no la manda al navegador. No hay contraseñas en el código: los admins son usuarios de Supabase Auth.
- `/api/consultas` tiene trampa anti-bots, verifica el origen, acepta como máximo 10 consultas por hora por visitante y valida cada campo.
- `/admin` se sirve con `noindex`, sin caché y sin poder embeberse en otra página (`vercel.json`).

## Configurar Supabase (una sola vez)

1. **Crear el proyecto** en supabase.com.
2. **Base de datos:** en **SQL Editor**, pegar entero [`supabase/instalar.sql`](../supabase/instalar.sql) y tocar **Run**. Se puede volver a correr: no duplica nada ni pisa contenido. Crea tablas, índices, funciones, políticas RLS, permisos, el bucket `medios` y el contenido inicial (el de la demo, marcado como demo).
   - Si cambiás `src/config/negocio.json` o las migraciones, regenerá el archivo con `npm run db:sql`.
3. **Registro público apagado:** en **Authentication → Sign In / Providers**, apagar *Allow new users to sign up*.
4. **Links de recuperación de contraseña:** en **Authentication → URL Configuration**, poner como *Site URL* el dominio de la web y agregar `https://TU-DOMINIO/admin/` en *Redirect URLs*.
5. **Claves:** en **Project Settings → API Keys** están la *publishable* (pública) y una *secret*. Copiá `.env.example` como `.env` y completalo:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
   SUPABASE_SECRET_KEY=sb_secret_…
   ```

## Crear el primer administrador

Opción A, desde la terminal (recomendada):

```bash
npm run crear-admin -- dueño@sulocal.com "Nombre"
```

Pide la contraseña por consola (mínimo 10 caracteres) y no la guarda en ningún lado. Si el usuario ya existe, solo le da permiso de admin.

Opción B, desde Supabase:
1. **Authentication → Users → Add user** (con contraseña y *Auto confirm*).
2. En el SQL Editor:
   ```sql
   insert into public.admins (user_id, email)
   select id, email from auth.users where email = 'dueño@sulocal.com';
   ```

Para quitar un admin: `delete from public.admins where email = '…';` (el usuario sigue existiendo, pero ya no entra al panel).

## Desarrollo local

```bash
npm install
npm run dev        # web en http://localhost:5173, panel en http://localhost:5173/admin/
npm run build      # genera dist/ (incluye dist/_plantilla.html para el servidor)
```

En desarrollo, `/api/*` corre las mismas funciones que en Vercel (middleware en `vite.config.js`).

## Desplegar en Vercel

1. En el proyecto de Vercel: **Settings → Environment Variables**, cargar `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY` (y opcionalmente `HUELLA_SAL`) para *Production* y *Preview*.
2. Hacer push a la rama conectada. `vercel.json` ya configura el build, la función que arma `/` en cada visita, `/admin` y los encabezados de seguridad.
3. Entrar a `https://TU-DOMINIO/admin/` con el usuario admin.

Si las variables de Supabase faltan, la web pública sigue funcionando con `src/config/negocio.json`, y el panel muestra un aviso de configuración.

## Pruebas

```bash
npm run dev                                  # en otra terminal
node pruebas/supabase.mjs http://localhost:5173   # 40 pruebas contra Supabase real (RLS, login, fotos, consultas, publicar, vista previa)
node pruebas/cotizador.mjs                   # todas las combinaciones del cotizador (3456 con el contenido de la demo)
```

`pruebas/supabase.mjs` necesita un admin de prueba en `.env.test` (`NOIR_TEST_EMAIL`, `NOIR_TEST_CLAVE`; el archivo está en `.gitignore`). Borra todo lo que crea y avisa si algo no se pudo borrar. Publica un cambio y lo revierte, así que el contenido publicado queda igual.

## Datos de demostración

El contenido inicial tiene `demo.activo = true`. El número de WhatsApp (`549XXXXXXXXXX`), la dirección, Instagram, los precios, las opiniones y las fotos de trabajos son **de ejemplo**:
- El panel lo avisa arriba de cada pantalla.
- Las opiniones y los trabajos llevan la marca “Ejemplo”, y la web aclara que las opiniones son de ejemplo.
- Al entregar la web: cargar los datos reales, reemplazar o desactivar las opiniones y fotos de ejemplo, y apagar el modo demo en **Datos del negocio**.

## Sumar un módulo nuevo

1. Si guarda contenido de la web: agregar la clave en `normalizar()` (`src/js/contenido.js`) y usarla en `build/pagina.mjs`. Si guarda registros propios (por ejemplo, turnos): crear una migración nueva en `supabase/migrations/` con su tabla, RLS y permisos.
2. Crear la pantalla en `src/admin/paginas/` (las de contenido usan `useEditor([...claves])` y `<BarraGuardar>`; las listas, `<ListaEditable>`).
3. Agregarla a `RUTAS` y `MENU` en `src/admin/rutas.jsx`.
